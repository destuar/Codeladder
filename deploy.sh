#!/bin/bash

set -e  # Exit on error

# Add detailed error reporting function
report_error() {
    echo "Error occurred. Gathering diagnostic information..."
    echo "Container status:"
    docker ps -a
    echo "Backend logs:"
    docker logs codeladder-backend 2>&1 || true
    echo "Database connection test:"
    docker exec codeladder-backend nc -zv codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com 5432 || true
    echo "Environment variables:"
    docker exec codeladder-backend printenv | grep -v "SECRET\|KEY\|PASSWORD" || true
}

# Modify error handler to use it
handle_error() {
    local exit_code=$?
    echo "Error on line $1"
    report_error
    # Clean up containers if they exist
    docker rm -f codeladder-backend codeladder-frontend 2>/dev/null || true
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Define validation function first
validate_database_url() {
    local url="$1"
    
    # Decode URL for validation
    local decoded_url=$(printf '%b' "${url//%/\\x}")
    
    if [ -z "$decoded_url" ]; then
        echo "ERROR: DATABASE_URL is empty"
        return 1
    fi

    # More robust regex pattern
    if [[ ! "$decoded_url" =~ ^postgresql://[^:]+:.+@codeladder-db\.[^/]+/[^?]+(\?.*)?$ ]]; then
        echo "ERROR: Invalid DATABASE_URL format"
        return 1
    fi
    
    return 0
}

# Fix line endings and source environment variables
echo "Fixing line endings in .env.deploy..."
tr -d '\r' < .env.deploy > .env.deploy.tmp && mv .env.deploy.tmp .env.deploy

echo "Content of .env.deploy after fixing line endings:"
cat .env.deploy | grep DATABASE_URL

# Add after the tr command
echo "Checking full hexdump of .env.deploy..."
hexdump -C .env.deploy

echo "Checking length of DATABASE_URL line..."
wc -c < <(grep DATABASE_URL .env.deploy)

echo "Checking if file has hidden characters..."
cat -A .env.deploy | grep DATABASE_URL

set -a
source .env.deploy
set +a

echo "Validating DATABASE_URL..."
DATABASE_URL_VALUE=$(grep DATABASE_URL .env.deploy | cut -d= -f2-)

if ! validate_database_url "$DATABASE_URL_VALUE"; then
    echo "ERROR: Invalid DATABASE_URL in .env.deploy"
    echo "Current value (sanitized):"
    echo "$DATABASE_URL_VALUE" | sed 's/:[^:]*@/@/g'
    exit 1
fi

# Clean up Docker resources
docker rm -f codeladder-backend codeladder-frontend || true
docker network rm app-network || true
docker builder prune -f

# Create network
echo "Creating Docker network..."
docker network create app-network || true

# Build images
echo "Building backend image..."
docker build -t codeladder-backend -f backend/Dockerfile.backend ./backend 2>&1 | tee build.log || {
    echo "Build failed. Showing TypeScript errors:"
    grep "TS" build.log || true
    exit 1
}

echo "Building frontend image..."
docker build -t codeladder-frontend -f frontend/Dockerfile.frontend ./frontend

# Start containers
echo "Starting backend container..."
docker run -d \
    --name codeladder-backend \
    --network app-network \
    -p 8000:8000 \
    --env-file .env.deploy \
    codeladder-backend

echo "Starting frontend container..."
docker run -d \
    --name codeladder-frontend \
    --network app-network \
    -p 8085:80 \
    -e API_URL="/api" \
    -e NODE_ENV="${ENVIRONMENT:-production}" \
    codeladder-frontend

# Wait for containers
echo "Waiting for containers to start..."
sleep 5

# Verify deployment
echo "Verifying deployment..."
if ! docker ps | grep -q codeladder-backend; then
    echo "ERROR: Backend container failed to start"
    docker logs codeladder-backend
    exit 1
fi

if ! docker ps | grep -q codeladder-frontend; then
    echo "ERROR: Frontend container failed to start"
    docker logs codeladder-frontend
    exit 1
fi

echo "Testing backend health..."
curl -f http://localhost:8000/api/health || {
    echo "ERROR: Backend health check failed"
    docker logs codeladder-backend
    exit 1
}

echo "Deployment complete! Services available at:"
echo "Frontend: http://$(curl -s ifconfig.me):8085"
echo "Backend: http://$(curl -s ifconfig.me):8000"

# Check if containers are running
if ! docker ps | grep -q codeladder-backend; then
  echo "ERROR: Backend container failed to start. Checking logs..."
  docker logs codeladder-backend 2>&1 | grep -i "prisma\|database\|connection"
fi

if ! docker ps | grep -q codeladder-frontend; then
  echo "ERROR: Frontend container failed to start. Checking logs..."
  docker logs codeladder-frontend
fi

echo "Checking frontend container logs..."
docker logs codeladder-frontend

# Wait a few seconds for containers to initialize
sleep 5

# Check both containers' status
echo "Backend container logs:"
docker logs codeladder-backend
echo "Frontend container logs:"
docker logs codeladder-frontend

# Add after starting the backend container
echo "Waiting for backend to initialize..."
sleep 5

echo "Testing database connection..."
docker exec codeladder-backend nc -zv codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com 5432

echo "Verifying environment file contents:"
cat .env.deploy | grep DATABASE_URL | sed 's/:[^:]*@/@/g'  # Only sanitize for display

echo "Checking how Docker sees the environment variable..."
docker exec codeladder-backend printenv | grep DATABASE_URL | sed 's/:[^:]*@/@/g'

echo "Verifying container environment..."
docker exec codeladder-backend bash -c '
    if ! echo "$DATABASE_URL" | grep -q "codeladder-db"; then
        echo "ERROR: Container DATABASE_URL is incorrect"
        echo "Expected: codeladder-db"
        echo "Got: $(echo $DATABASE_URL | sed "s/:[^:]*@/@/g")"
        exit 1
    fi
'

# After sourcing .env.deploy
echo "Content of .env.deploy on local machine:"
cat .env.deploy | grep DATABASE_URL

# Add a check to ensure the correct DATABASE_URL is being used
echo "Verifying DATABASE_URL in container..."
docker exec codeladder-backend bash -c '
    if ! echo "$DATABASE_URL" | grep -q "codeladder-db"; then
        echo "ERROR: Container DATABASE_URL is incorrect"
        echo "Expected: codeladder-db"
        echo "Got: $(echo $DATABASE_URL | sed "s/:[^:]*@/@/g")"
        exit 1
    fi
'

check_container() {
    local container_name=$1
    if ! docker ps | grep -q "$container_name"; then
        echo "ERROR: $container_name failed to start. Checking logs..."
        docker logs "$container_name" 2>&1 || true
        return 1
    fi
    return 0
}

if ! check_container codeladder-backend; then
    exit 1
fi

if ! check_container codeladder-frontend; then
    exit 1
fi

# Enhanced database connection test
test_database_connection() {
    echo "Testing database connection..."
    docker exec codeladder-backend bash -c '
        max_retries=5
        retry_count=0
        
        while [ $retry_count -lt $max_retries ]; do
            if PGPASSWORD="${DATABASE_URL#*:*:}" psql "${DATABASE_URL}" -c "\l" > /dev/null 2>&1; then
                echo "Database connection successful"
                return 0
            fi
            
            echo "Connection attempt $((retry_count + 1)) failed, retrying..."
            retry_count=$((retry_count + 1))
            sleep 5
        done
        
        echo "Failed to connect to database after $max_retries attempts"
        return 1
    '
}

wait_for_container() {
    local container_name=$1
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for $container_name to be healthy..."
    while [ $attempt -le $max_attempts ]; do
        if docker container inspect "$container_name" --format '{{.State.Status}}' 2>/dev/null | grep -q "running"; then
            echo "$container_name is running"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "$container_name failed to start properly"
    return 1
}

# Add DNS verification step
verify_dns() {
    echo "Verifying DNS resolution..."
    docker exec codeladder-backend bash -c '
        host codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com
        if [ $? -ne 0 ]; then
            echo "DNS resolution failed"
            exit 1
        fi
        
        # Test actual connection
        nc -zv codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com 5432
    '
}

# Add after starting both containers
echo "Testing network connectivity between containers..."
docker exec codeladder-frontend curl -I "http://codeladder-backend:8000/api/health" || {
    echo "WARNING: Frontend container cannot reach backend container"
    echo "Internal network connectivity issue"
} 