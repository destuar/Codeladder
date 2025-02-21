#!/bin/bash

# Create a temporary directory for the files we want to transfer
mkdir -p temp_transfer
mkdir -p temp_transfer/frontend
mkdir -p temp_transfer/backend
mkdir -p temp_transfer/backend/prisma

# Verify .env.deploy exists and contains correct URL
echo "Verifying .env.deploy contents..."
if ! grep -q "codeladder-db" .env.deploy; then
    echo "ERROR: .env.deploy must contain 'codeladder-db'"
    exit 1
fi

# Copy deployment files first to verify
cp .env.deploy temp_transfer/
cp deploy.sh temp_transfer/

# Verify the copy worked
echo "Verifying .env.deploy was copied correctly..."
if ! grep -q "codeladder-db" temp_transfer/.env.deploy; then
    echo "ERROR: .env.deploy copy failed"
    exit 1
fi

# Copy frontend files
cp -r frontend/src temp_transfer/frontend/
cp -r frontend/public temp_transfer/frontend/
cp frontend/package*.json temp_transfer/frontend/
cp frontend/tsconfig*.json temp_transfer/frontend/
cp frontend/tsconfig.node.json temp_transfer/frontend/
cp frontend/vite.config.ts temp_transfer/frontend/
cp frontend/index.html temp_transfer/frontend/
cp frontend/nginx.conf temp_transfer/frontend/
cp frontend/Dockerfile.frontend temp_transfer/frontend/
cp frontend/.dockerignore temp_transfer/frontend/
cp frontend/config.js.template temp_transfer/frontend/
cp frontend/docker-entrypoint.sh temp_transfer/frontend/
cp frontend/tailwind.config.js temp_transfer/frontend/
cp frontend/postcss.config.cjs temp_transfer/frontend/
cp -r frontend/styles temp_transfer/frontend/

# Copy backend files
cp -r backend/src temp_transfer/backend/
cp -r backend/prisma temp_transfer/backend/
cp backend/package*.json temp_transfer/backend/
cp backend/tsconfig.json temp_transfer/backend/
cp backend/Dockerfile.backend temp_transfer/backend/
cp backend/.dockerignore temp_transfer/backend/

# Before transferring to EC2 (around line 52)
echo "Final verification of .env.deploy contents before transfer:"
cat temp_transfer/.env.deploy | grep DATABASE_URL

# Ensure the URL is correct
if ! grep -q "codeladder-db" temp_transfer/.env.deploy; then
    echo "FATAL: .env.deploy still contains incorrect database URL"
    echo "Current value (sanitized):"
    grep DATABASE_URL temp_transfer/.env.deploy | sed 's/:[^:]*@/@/g'
    exit 1
fi

# Transfer to EC2
echo "Transferring files to EC2..."
scp -r temp_transfer/* ec2-user@3.21.246.147:~/codeladder/

# Verify transfer on EC2
echo "Verifying .env.deploy on EC2..."
ssh ec2-user@3.21.246.147 "cd ~/codeladder && grep -q 'codeladder-db' .env.deploy" || {
    echo "ERROR: .env.deploy verification failed on EC2"
    exit 1
}

# Clean up
rm -rf temp_transfer

echo "Files transferred successfully!"
echo "Now run these commands on your EC2 instance:"
echo "1. ssh ec2-user@3.21.246.147"
echo "2. cd ~/codeladder"

# After transfer
echo "Making deploy.sh executable..."
ssh ec2-user@3.21.246.147 "chmod +x ~/codeladder/deploy.sh"

# 1. Updated the Dockerfile.frontend locally

# 2. SSH into EC2
ssh ec2-user@3.21.246.147

# 3. Navigate to project directory
cd ~/codeladder

# 4. Check if files were transferred correctly
ls -la
cat frontend/nginx.conf
cat frontend/Dockerfile.frontend

# 5. Deploy
./deploy.sh

# 6. Check container logs
docker logs codeladder-frontend
docker logs codeladder-backend

# After line 17
echo "Content of temp_transfer/.env.deploy:"
cat temp_transfer/.env.deploy | grep DATABASE_URL 