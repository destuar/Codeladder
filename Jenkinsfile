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
        NODE_ENV = 'production'
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
                sh '''
                    pwd
                    ls -la
                '''
                // Check if credentials are set
                sh '''
                    echo "Checking credentials..."
                    [ -n "$DATABASE_URL" ] && echo "DATABASE_URL is set"
                    [ -n "$JWT_SECRET" ] && echo "JWT_SECRET is set"
                    [ -n "$JWT_REFRESH_SECRET" ] && echo "JWT_REFRESH_SECRET is set"
                    [ -n "$AWS_ACCESS_KEY_ID" ] && echo "AWS_ACCESS_KEY_ID is set"
                    [ -n "$AWS_SECRET_ACCESS_KEY" ] && echo "AWS_SECRET_ACCESS_KEY is set"
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
        
        stage('Cleanup Disk Space') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'codeladder-jenkins-key', keyFileVariable: 'SSH_KEY')]) {
                    sh '''
                        # Clean local Jenkins workspace
                        echo "Cleaning local Docker system..."
                        docker system prune -af
                        docker volume prune -f
                        
                        # Clean EC2 instance
                        ssh -i "$SSH_KEY" ec2-user@3.21.246.147 '
                            echo "Current disk space:"
                            df -h
                            
                            echo "Cleaning up Docker system..."
                            docker-compose down --remove-orphans || true
                            docker rm -f $(docker ps -aq) || true
                            docker network prune -f
                            docker volume prune -f
                            docker system prune -af
                            
                            echo "Removing old builds..."
                            rm -rf ~/codeladder/node_modules
                            rm -rf ~/codeladder/frontend/node_modules
                            rm -rf ~/codeladder/backend/node_modules
                            
                            echo "Disk space after cleanup:"
                            df -h
                        '
                    '''
                }
            }
        }
        
        stage('Create Environment File') {
            steps {
                script {
                    // Map staging to production for NODE_ENV
                    def nodeEnv = params.ENVIRONMENT == 'staging' ? 'production' : params.ENVIRONMENT
                    
                    sh """
                        cat > .env.deploy << EOL
NODE_ENV=${nodeEnv}
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
                        # First ensure the deploy directory exists
                        ssh -o StrictHostKeyChecking=no -i "\$SSH_KEY" \${SSH_USER}@\${EC2_HOST} 'mkdir -p /home/ec2-user/codeladder'
                        
                        # Copy environment file
                        scp -i "\$SSH_KEY" .env.deploy \${SSH_USER}@\${EC2_HOST}:/home/ec2-user/codeladder/.env.deploy
                        
                        # Execute deployment commands
                        ssh -o StrictHostKeyChecking=no -i "\$SSH_KEY" \${SSH_USER}@\${EC2_HOST} '
                            cd /home/ec2-user/codeladder
                            
                            # Clean up existing containers
                            docker rm -f codeladder-backend codeladder-frontend || true
                            docker network rm app-network || true
                            
                            # Create network
                            docker network create app-network || true
                            
                            # Start containers
                            docker run -d \\
                                --name codeladder-backend \\
                                --network app-network \\
                                -p 8000:8000 \\
                                --env-file .env.deploy \\
                                codeladder-backend
                            
                            docker run -d \\
                                --name codeladder-frontend \\
                                --network app-network \\
                                -p 8085:80 \\
                                -e API_URL="/api" \\
                                -e NODE_ENV="production" \\
                                codeladder-frontend
                            
                            # Verify containers are running
                            docker ps | grep -q "codeladder-backend" || (echo "Backend failed to start" && exit 1)
                            docker ps | grep -q "codeladder-frontend" || (echo "Frontend failed to start" && exit 1)
                        '
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
        
        stage('Check Disk Space') {
            steps {
                sh '''
                    echo "Disk space before cleanup:"
                    df -h
                    
                    echo "Cleaning up Docker system..."
                    docker system prune -af
                    docker volume prune -f
                    
                    echo "Disk space after cleanup:"
                    df -h
                '''
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