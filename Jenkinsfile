pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        POSTGRES_USER = 'postgres'
        POSTGRES_PASSWORD = credentials('POSTGRES_PASSWORD')
        POSTGRES_DB = 'smarterstruct_test'
        JWT_SECRET = credentials('JWT_SECRET')
        JWT_REFRESH_SECRET = credentials('JWT_REFRESH_SECRET')
        DATABASE_URL = "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            stages {
                stage('Setup') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npx prisma generate'
                        }
                    }
                }

                stage('Database') {
                    steps {
                        sh '''
                            docker run -d \
                                --name postgres-test \
                                -e POSTGRES_USER=${POSTGRES_USER} \
                                -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
                                -e POSTGRES_DB=${POSTGRES_DB} \
                                -p 5432:5432 \
                                postgres:latest
                            
                            # Wait for PostgreSQL to be ready
                            sleep 10
                        '''
                        
                        dir('backend') {
                            sh 'npx prisma migrate deploy'
                        }
                    }
                }

                stage('Run Tests') {
                    steps {
                        dir('backend') {
                            sh '''
                                npm run build
                                chmod +x test.sh
                                ./test.sh
                            '''
                        }
                    }
                }
            }

            post {
                always {
                    sh 'docker rm -f postgres-test || true'
                }
            }
        }

        stage('Frontend Tests') {
            stages {
                stage('Setup') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }

                stage('Type Check') {
                    steps {
                        dir('frontend') {
                            sh 'npm run type-check'
                        }
                    }
                }

                stage('Lint') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                        }
                    }
                }

                stage('Build') {
                    steps {
                        dir('frontend') {
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            environment {
                DEPLOY_CREDS = credentials('deploy-ssh-key')
                DEPLOY_HOST = credentials('DEPLOY_HOST')
                DEPLOY_USER = credentials('DEPLOY_USER')
                PROD_DATABASE_URL = credentials('PROD_DATABASE_URL')
            }
            steps {
                // Backend Deployment
                sh '''
                    cd backend
                    npm ci
                    npm run build
                    rsync -avz --delete dist/ ${DEPLOY_USER}@${DEPLOY_HOST}:/var/www/backend/
                    ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'cd /var/www/backend && npm ci --production'
                    DATABASE_URL=${PROD_DATABASE_URL} npx prisma migrate deploy
                '''

                // Frontend Deployment
                sh '''
                    cd frontend
                    npm ci
                    npm run build
                    rsync -avz --delete dist/ ${DEPLOY_USER}@${DEPLOY_HOST}:/var/www/html/
                '''

                // Restart Services
                sh '''
                    ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 restart backend frontend'
                '''
            }
        }
    }

    post {
        success {
            slackSend(
                color: 'good',
                message: "Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        failure {
            slackSend(
                color: 'danger',
                message: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        always {
            cleanWs()
        }
    }
} 