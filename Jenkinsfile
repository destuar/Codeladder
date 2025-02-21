pipeline {
    agent any
    
    environment {
        EC2_HOST = '3.21.246.147'
        DEPLOY_PATH = '~/codeladder'
        ARCHIVE_NAME = 'repo.tar.gz'
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
                        
                        echo "Transferring files to EC2..."
                        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" ${ARCHIVE_NAME} ${SSH_USER}@${EC2_HOST}:${DEPLOY_PATH}/
                        
                        echo "Executing deployment..."
                        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ${SSH_USER}@${EC2_HOST} """
                            cd ${DEPLOY_PATH} && \
                            tar -xzf ${ARCHIVE_NAME} && \
                            rm ${ARCHIVE_NAME} && \
                            ENVIRONMENT=${ENVIRONMENT} ./deploy.sh
                        """
                    '''
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    def maxRetries = 5
                    def retryCount = 0
                    def deployed = false
                    
                    while (!deployed && retryCount < maxRetries) {
                        try {
                            sh "curl -f http://${EC2_HOST}"
                            deployed = true
                            echo "Deployment verified successfully!"
                        } catch (Exception e) {
                            retryCount++
                            if (retryCount == maxRetries) {
                                error "Failed to verify deployment after ${maxRetries} attempts"
                            }
                            sleep(10)
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
            echo "Deployment failed!"
        }
        always {
            cleanWs()
        }
    }
} 