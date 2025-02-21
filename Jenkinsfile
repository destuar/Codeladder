pipeline {
    agent any
    
    environment {
        EC2_HOST = '3.21.246.147'
        DEPLOY_PATH = '~/codeladder'
        ARCHIVE_NAME = 'repo.tar.gz'
        FRONTEND_PORT = '8085'
        BACKEND_PORT = '8000'
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
        stage('Prepare Deployment') {
            steps {
                script {
                    currentBuild.description = "Deploying to ${params.ENVIRONMENT}"
                    // Verify .env.deploy exists
                    sh '''
                        if [ ! -f .env.deploy ]; then
                            echo "Error: .env.deploy file not found!"
                            exit 1
                        fi
                    '''
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
                    sh '''
                        set -e  # Exit on any error
                        
                        echo "Creating archive..."
                        git archive --format=tar.gz -o ${ARCHIVE_NAME} HEAD
                        
                        echo "Copying .env.deploy..."
                        cp .env.deploy ${WORKSPACE}/
                        
                        echo "Testing SSH connection..."
                        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} "echo 'SSH connection successful'"
                        
                        echo "Transferring files to EC2..."
                        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" \
                            ${ARCHIVE_NAME} \
                            .env.deploy \
                            ${SSH_USER}@${EC2_HOST}:${DEPLOY_PATH}/
                        
                        echo "Executing deployment..."
                        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} """
                            cd ${DEPLOY_PATH} && \
                            tar -xzf ${ARCHIVE_NAME} && \
                            rm ${ARCHIVE_NAME} && \
                            chmod +x deploy.sh && \
                            echo 'Making deploy.sh executable...' && \
                            ENVIRONMENT=${ENVIRONMENT} ./deploy.sh || {
                                echo 'Deploy script failed. Checking Docker status...'
                                docker ps -a
                                echo 'Checking Docker logs...'
                                docker logs codeladder-frontend 2>&1 || true
                                docker logs codeladder-backend 2>&1 || true
                                exit 1
                            }
                        """
                    '''
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
                            
                            deployed = true
                            echo "Deployment verified successfully!"
                        } catch (Exception e) {
                            retryCount++
                            if (retryCount == maxRetries) {
                                // Collect diagnostic information
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
                                            echo "Checking deploy.sh permissions:"
                                            ls -l deploy.sh
                                            echo "Checking .env.deploy:"
                                            cat .env.deploy | grep -v "PASSWORD\\|SECRET"
                                        '
                                    """
                                }
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
                // Collect logs and diagnostic information on failure
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
                            echo "Disk space:"
                            df -h
                            echo "Memory usage:"
                            free -h
                            echo "Running processes:"
                            ps aux | grep -E "docker|node|nginx"
                        '
                    """
                }
            }
            echo "Deployment failed! Check the logs above for details."
        }
        always {
            cleanWs()
        }
    }
} 