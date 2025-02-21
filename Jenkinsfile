pipeline {
    agent any

    options {
        skipDefaultCheckout(true)  // Skip the default checkout
    }

    tools {
        nodejs 'Node 18'
    }

    environment {
        NODE_VERSION = '18'
        DATABASE_URL = credentials('DATABASE_URL')
        JWT_SECRET = credentials('JWT_SECRET')
        JWT_REFRESH_SECRET = credentials('JWT_REFRESH_SECRET')
    }

    stages {
        stage('Initialize') {
            steps {
                echo "Starting build..."
            }
        }

        stage('Checkout') {
            steps {
                script {
                    echo "Checking out repository..."
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        extensions: [[$class: 'CleanBeforeCheckout']],
                        userRemoteConfigs: [[
                            url: 'https://github.com/cee8/codeladder.git'
                        ]]
                    ])
                }
                sh '''
                    echo "Current directory contents:"
                    ls -la
                    echo "Git status:"
                    git status
                    echo "Current commit:"
                    git rev-parse HEAD
                '''
            }
        }

        stage('Environment Info') {
            steps {
                sh '''
                    echo "Node version:"
                    node --version
                    echo "NPM version:"
                    npm --version
                    echo "Git version:"
                    git --version
                    echo "Current directory:"
                    pwd
                    ls -la
                '''
            }
        }

        stage('Backend Tests') {
            stages {
                stage('Setup') {
                    steps {
                        dir('backend') {
                            sh '''
                                echo "Installing backend dependencies..."
                                npm ci
                                echo "Generating Prisma client..."
                                npx prisma generate
                            '''
                        }
                    }
                }

                stage('Run Tests') {
                    steps {
                        dir('backend') {
                            sh '''
                                echo "Building backend..."
                                npm run build
                                echo "Running tests..."
                                chmod +x test.sh
                                ./test.sh
                            '''
                        }
                    }
                }
            }
        }

        stage('Frontend Tests') {
            stages {
                stage('Setup') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Installing frontend dependencies..."
                                npm ci
                            '''
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
    }
} 