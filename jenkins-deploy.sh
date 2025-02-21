#!/bin/bash
set -e

# Configuration
EC2_HOST="3.21.246.147"
EC2_USER="ec2-user"
SSH_KEY="/var/lib/jenkins/.ssh/codeladder-jenkins.pem"
REMOTE_DIR="~/codeladder"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: ${TEMP_DIR}"

# Verify and copy .env.deploy first
if ! grep -q "codeladder-db" .env.deploy; then
    echo "ERROR: .env.deploy must contain 'codeladder-db'"
    exit 1
fi

# Create tarball excluding unnecessary files
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='*.log' \
    -czf "${TEMP_DIR}/repo.tar.gz" .

# Copy .env.deploy separately
cp .env.deploy "${TEMP_DIR}/"

# Transfer files to EC2
echo "Transferring files to EC2..."
scp -i "${SSH_KEY}" \
    "${TEMP_DIR}/repo.tar.gz" \
    "${TEMP_DIR}/.env.deploy" \
    "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"

# Execute deployment on EC2
echo "Executing deployment on EC2..."
ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "
    cd ${REMOTE_DIR}
    tar -xzf repo.tar.gz
    rm repo.tar.gz
    chmod +x deploy.sh
    ./deploy.sh
"

# Cleanup
rm -rf "${TEMP_DIR}" 