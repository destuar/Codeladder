pipeline {
    agent any
    
    environment {
        EC2_HOST = '3.21.246.147'
        DEPLOY_PATH = '~/codeladder'
        ARCHIVE_NAME = 'repo.tar.gz'
        FRONTEND_PORT = '8085'
        BACKEND_PORT = '8000'
        DATABASE_URL = credentials('DATABASE_URL')
        JWT_SECRET = credentials('JWT_SECRET')
        JWT_REFRESH_SECRET = credentials('JWT_REFRESH_SECRET')
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
        AWS_REGION = 'us-east-2'
        S3_BUCKET = 'codeladder-s3'
        CORS_ORIGIN = "http://${EC2_HOST}:${FRONTEND_PORT}"
    }
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['staging', 'production'], description: 'Select deployment environment')
        booleanParam(name: 'FORCE_DEPLOY', defaultValue: false, description: 'Force deployment even if tests fail')
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        ansiColor('xterm')
    }
    
    stages {
        stage('Test Pipeline') {
            steps {
                echo "Testing pipeline configuration..."
                sh 'pwd'
                sh 'ls -la'
                sh '''
                    echo "Checking credentials..."
                    if [ -n "$DATABASE_URL" ]; then echo "DATABASE_URL is set"; fi
                    if [ -n "$JWT_SECRET" ]; then echo "JWT_SECRET is set"; fi
                    if [ -n "$JWT_REFRESH_SECRET" ]; then echo "JWT_REFRESH_SECRET is set"; fi
                    if [ -n "$AWS_ACCESS_KEY_ID" ]; then echo "AWS_ACCESS_KEY_ID is set"; fi
                    if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then echo "AWS_SECRET_ACCESS_KEY is set"; fi
                '''
            }
        }
        
        stage('Test SSH Connection') {
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'codeladder-jenkins-key', 
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh '''
                        # Show SSH key permissions
                        ls -l "$SSH_KEY"
                        
                        # Try SSH connection with verbose output
                        ssh -v -o StrictHostKeyChecking=no -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} '
                            echo "=== Connection Test ==="
                            echo "Current user: $(whoami)"
                            echo "Current directory: $(pwd)"
                            echo "SSH_USER: $SSH_USER"
                            echo "Host: $(hostname)"
                            echo "=== File Permissions ==="
                            ls -la ~/.ssh/
                        '
                    '''
                }
            }
        }
        
        stage('Create Environment File') {
            steps {
                script {
                    sh """
                        cat > .env.deploy << EOL
NODE_ENV=${params.ENVIRONMENT}
PORT=${BACKEND_PORT}
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
CORS_ORIGIN=${CORS_ORIGIN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
EOL
                    """
                    
                    sh 'test -f .env.deploy && echo ".env.deploy created successfully"'
                }
            }
        }
        
        stage('Deploy to EC2') {
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'codeladder-jenkins-key', 
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh """
                        set -e  # Exit on any error
                        
                        # Fix SSH key permissions
                        chmod 600 "\$SSH_KEY"
                        
                        echo "Creating archive..."
                        git archive --format=tar.gz -o \${ARCHIVE_NAME} HEAD
                        
                        echo "Creating remote directory..."
                        ssh -o StrictHostKeyChecking=no -i "\$SSH_KEY" \${SSH_USER}@\${EC2_HOST} 'mkdir -p ~/codeladder'
                        
                        echo "Transferring files to EC2..."
                        scp -o StrictHostKeyChecking=no -i "\$SSH_KEY" \
                            \${ARCHIVE_NAME} \
                            .env.deploy \
                            "\${SSH_USER}@\${EC2_HOST}:~/codeladder/"
                        
                        echo "Executing deployment..."
                        ssh -o StrictHostKeyChecking=no -i "\$SSH_KEY" \${SSH_USER}@\${EC2_HOST} "
                            set -x  # Enable debug mode
                            cd ~/codeladder
                            ls -la  # Check files
                            echo 'Extracting archive...'
                            tar -xzf \${ARCHIVE_NAME}
                            echo 'Removing archive...'
                            rm \${ARCHIVE_NAME}
                            echo 'Setting permissions...'
                            chmod +x deploy.sh
                            echo 'Running deploy script...'
                            # Map staging to production for NODE_ENV
                            NODE_ENV=\${params.ENVIRONMENT == 'staging' ? 'production' : params.ENVIRONMENT} bash -x deploy.sh
                        "
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    def maxRetries = 10
                    def retryCount = 0
                    def deployed = false
                    
                    while (!deployed && retryCount < maxRetries) {
                        try {
                            // Check if Docker containers are running
                            withCredentials([sshUserPrivateKey(
                                credentialsId: 'codeladder-jenkins-key', 
                                keyFileVariable: 'SSH_KEY',
                                usernameVariable: 'SSH_USER'
                            )]) {
                                sh """
                                    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} '
                                        echo "Checking Docker containers..."
                                        docker ps | grep -q "codeladder-frontend" || (echo "Frontend container not running" && exit 1)
                                        docker ps | grep -q "codeladder-backend" || (echo "Backend container not running" && exit 1)
                                    '
                                """
                                
                                // Check frontend
                                sh "curl -f http://${EC2_HOST}:${FRONTEND_PORT}"
                                
                                // Check backend health endpoint
                                sh "curl -f http://${EC2_HOST}:${BACKEND_PORT}/api/health"
                            }
                            
                            deployed = true
                            echo "Deployment verified successfully!"
                        } catch (Exception e) {
                            retryCount++
                            if (retryCount == maxRetries) {
                                error "Failed to verify deployment after ${maxRetries} attempts"
                            }
                            echo "Retry ${retryCount}/${maxRetries}. Waiting 15 seconds..."
                            sleep(15)
                        }
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo "Deployment completed successfully!"
        }
        failure {
            script {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'codeladder-jenkins-key',
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh """
                        ssh -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} '
                            cd ${DEPLOY_PATH}
                            echo "Docker container status:"
                            docker ps -a
                            echo "Docker networks:"
                            docker network ls
                            echo "Frontend logs:"
                            docker logs codeladder-frontend 2>&1 || true
                            echo "Backend logs:"
                            docker logs codeladder-backend 2>&1 || true
                        '
                    """
                }
            }
            echo "Deployment failed! Check the logs above for details."
        }
        always {
            sh 'rm -f .env.deploy || true'
            cleanWs()
        }
    }
} 