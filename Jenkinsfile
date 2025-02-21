pipeline {
    agent any
    
    environment {
        EC2_HOST = '3.21.246.147'
        SSH_KEY = '/var/lib/jenkins/.ssh/codeladder-jenkins.pem'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                            -Dsonar.projectKey=codeladder \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'chmod +x jenkins-deploy.sh'
                sh './jenkins-deploy.sh'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
} 