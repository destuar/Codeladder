# CodeLadder

A robust full-stack application with automated deployment pipeline and containerized services.

## System Overview

CodeLadder is a containerized web application consisting of a React frontend and Node.js backend, deployed through an automated CI/CD pipeline on AWS infrastructure.

## Technical Stack

Frontend:
- React
- TypeScript
- Vite build system
- Nginx

Backend:
- Node.js
- Express
- Prisma ORM
- JWT Authentication
- AWS SDK

Infrastructure:
- Docker
- AWS (EC2, S3)
- Jenkins
- PostgreSQL

## Architecture

### Frontend Service
- React-based web application
- Nginx server for production deployment
- Port: 8085
- Environment-aware configuration
- API proxy integration

### Backend Service
- Node.js API service
- Prisma ORM for database operations
- JWT-based authentication system
- AWS S3 integration for file storage
- Port: 8000
- Health monitoring endpoint

### Infrastructure Components
- Docker containerization with isolated network
- AWS EC2 hosting
- Jenkins pipeline automation
- PostgreSQL database
- AWS S3 bucket for file storage

## System Requirements

Infrastructure:
- AWS EC2 instance
- Jenkins server with required plugins
- Docker runtime environment
- PostgreSQL database instance

Ports:
- Frontend: 8085
- Backend: 8000

Network:
- Isolated Docker network (app-network)
- Proxy configuration for API communication

## Environment Configuration

The application supports multiple environment configurations through environment variables:
- Database connection
- JWT secrets
- AWS credentials
- CORS settings
- Port configurations
- Environment-specific settings

## Deployment Process

The deployment process is fully automated through Jenkins pipeline:

1. Environment Preparation
   - Dynamic environment file generation
   - Secure credential management
   - Port configuration

2. Build Process
   - Docker image building for both services
   - Multi-stage builds for optimization
   - Production-ready configurations

3. Deployment
   - Container cleanup and network reset
   - Isolated network creation
   - Container orchestration
   - Health verification

4. Monitoring
   - Container health checks
   - Service availability verification
   - Automated retry mechanism
   - Comprehensive logging

## Maintenance

The system includes automated maintenance procedures:

1. Disk Space Management
   - Regular Docker system pruning
   - Volume cleanup
   - Old build removal
   - Continuous monitoring

2. Health Monitoring
   - Container status verification
   - Service endpoint checking
   - Automated recovery procedures
   - Failure logging and notification

3. Environment Management
   - Secure credential handling
   - Dynamic environment configuration
   - Multi-environment support
   - Configuration verification