#!/bin/bash

set -e  # Exit on error

# Print commands as they are executed
set -x

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Clean up on error
cleanup() {
    log "Error occurred. Cleaning up..."
    docker ps -a
    docker logs codeladder-frontend 2>&1 || true
    docker logs codeladder-backend 2>&1 || true
}

# Set up error handling
trap cleanup ERR

# Main deployment logic
log "Starting deployment..."

# Clean up existing containers
log "Cleaning up existing containers..."
docker rm -f codeladder-frontend codeladder-backend || true
docker network rm app-network || true

# Create network
log "Creating Docker network..."
docker network create app-network || true

# Build and start backend
log "Building and starting backend..."
cd backend
docker build -t codeladder-backend -f Dockerfile.backend .
docker run -d --name codeladder-backend --network app-network -p 8000:8000 --env-file ../.env.deploy codeladder-backend

# Build and start frontend
log "Building and starting frontend..."
cd ../frontend
docker build -t codeladder-frontend -f Dockerfile.frontend .
docker run -d --name codeladder-frontend --network app-network -p 8085:80 codeladder-frontend

log "Deployment completed successfully"

# Add detailed error reporting function
report_error() {
    echo "Error occurred. Gathering diagnostic information..."
    echo "Container status:"
    docker ps -a
    echo "Backend logs:"
    docker logs codeladder-backend
    echo "Database connection test:"
    docker exec codeladder-backend nc -zv codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com 5432
    echo "Environment variables:"
    docker exec codeladder-backend printenv | grep -v "SECRET\|KEY\|PASSWORD"
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

# Transfer files to EC2 and verify
echo "Transferring files to EC2..."
scp -r .env.deploy ec2-user@3.21.246.147:~/codeladder/

echo "Checking .env.deploy on EC2 instance..."
ssh ec2-user@3.21.246.147 "cat ~/codeladder/.env.deploy | grep DATABASE_URL"

# Clean up Docker resources
docker rm -f codeladder-backend codeladder-frontend || true
docker network rm app-network || true
docker builder prune -f  # Add this line to clear build cache

# Create network
echo "Creating Docker network..."
docker network create app-network || true

# Build the backend image with better error output
echo "Building backend image..."
docker build -t codeladder-backend -f backend/Dockerfile.backend ./backend 2>&1 | tee build.log || {
    echo "Build failed. Showing TypeScript errors:"
    grep "TS" build.log
    exit 1
}

# Build the frontend image
echo "Building frontend image..."
docker build -t codeladder-frontend -f frontend/Dockerfile.frontend ./frontend

# Stop and remove existing containers if they exist
echo "Cleaning up existing containers..."
docker rm -f codeladder-backend codeladder-frontend || true

echo "Starting backend container..."
docker run -d \
    --name codeladder-backend \
    --network app-network \
    -p 8000:8000 \
    --env-file .env.deploy \
    codeladder-backend || {
    echo "Failed to start backend container. Checking logs..."
    docker logs codeladder-backend
    exit 1
}

# Wait for container to initialize
echo "Waiting for backend to initialize..."
sleep 5

echo "Checking environment variables in container..."
docker exec codeladder-backend env | grep DATABASE_URL

echo "Testing DNS resolution..."
docker exec codeladder-backend nslookup codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com

echo "Testing database connection..."
docker exec codeladder-backend bash -c '
  echo "Current DATABASE_URL (sanitized):"
  echo "$DATABASE_URL" | sed "s/:[^:]*@/@/g"
  
  echo "Testing DNS resolution for database host..."
  host codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com

  echo "Testing TCP connection to database..."
  nc -zv -w 5 codeladder-db.c1y8u4sey2wa.us-east-2.rds.amazonaws.com 5432

  echo "Testing PostgreSQL connection with explicit credentials..."
  # Properly escape special characters in password
  PGPASSWORD="${DATABASE_URL#*:}" psql "${DATABASE_URL}" -c "\l"
' || {
    echo "Failed to connect to database. Checking logs..."
    docker logs codeladder-backend
    exit 1
}

# Install SSL certificates and tools
docker exec codeladder-backend apt-get update
docker exec codeladder-backend apt-get install -y ca-certificates postgresql-client

# Test database connection with psql
echo "Testing PostgreSQL connection..."
docker exec codeladder-backend psql "$DATABASE_URL" -c '\l'

echo "Running Prisma commands..."
docker exec codeladder-backend npx prisma generate
docker exec codeladder-backend npx prisma migrate deploy

# Get the public IP or hostname
PUBLIC_IP="3.21.246.147"
PUBLIC_API_URL="http://${PUBLIC_IP}:8000/api"

# Update the frontend container run command
echo "Starting frontend container..."
docker run -d \
  --name codeladder-frontend \
  --network app-network \
  -p 8085:80 \
  -e API_URL="/api" \
  -e NODE_ENV="production" \
  codeladder-frontend

# Add verification of the config
echo "Verifying frontend configuration..."
sleep 2  # Give nginx time to generate the config
docker exec codeladder-frontend cat /usr/share/nginx/html/config.js

# Test API reachability
echo "Testing API reachability..."
echo "Testing root endpoint..."
curl -I "http://${PUBLIC_IP}:8000/" || {
    echo "WARNING: Root endpoint not reachable"
}

echo "Testing API health endpoint..."
curl -I -H "Origin: http://${PUBLIC_IP}:8085" "${PUBLIC_API_URL}/health" || {
    echo "WARNING: API not reachable at ${PUBLIC_API_URL}"
    echo "Please verify your security groups and network settings"
}

echo "Testing API response..."
curl -H "Origin: http://${PUBLIC_IP}:8085" "${PUBLIC_API_URL}/health" || {
    echo "WARNING: Could not get health check response"
}

echo "Deployment complete! Services should be available at:"
echo "Frontend: http://3.21.246.147:8085"
echo "Backend: http://3.21.246.147:8000"
echo ""
echo "Checking container status..."
docker ps

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

# After transferring files to EC2
echo "Checking .env.deploy on EC2 instance..."
ssh ec2-user@3.21.246.147 "cat ~/codeladder/.env.deploy | grep DATABASE_URL"

# After starting the backend container
echo "Checking environment variables in the backend container..."
docker exec codeladder-backend env | grep DATABASE_URL

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