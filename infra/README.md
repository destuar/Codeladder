# CodeLadder Infrastructure

This directory contains infrastructure configurations for the CodeLadder project. The setup supports both development and production environments through Docker containerization.

## Quick Navigation

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Environment Management](#environment-management)
- [Maintenance & Troubleshooting](#maintenance--troubleshooting)

## Directory Structure

```
infra/
├── docker/
│   ├── backend/
│   │   └── Dockerfile.backend        # Backend container
│   ├── frontend/
│   │   ├── Dockerfile.frontend       # Frontend container
│   │   ├── frontend-nginx-entrypoint.sh
│   │   └── frontend-nginx.conf
│   ├── docker-compose.dev.yml        # Development setup
│   └── docker-compose.production.yml  # Production setup
└── jenkins/
    └── deploy/
        └── Jenkinsfile.production    # Deployment pipeline
```

## Development Setup

### Prerequisites

```bash
# Required software versions
Node.js >= 18.0.0
Docker    latest
Docker Compose
```

### Step-by-Step Development Setup

1. **Initial Environment Configuration**
   ```bash
   # Clone the repository (if not done already)
   git clone <repository-url>
   cd codeladder

   # Copy environment template
   cp .env.example .env
   ```

2. **Configure Environment Variables**
   ```bash
   # Required variables in .env:
   DATABASE_URL=<your-database-url>
   JWT_SECRET=<your-jwt-secret>
   JWT_REFRESH_SECRET=<your-refresh-secret>
   AWS_ACCESS_KEY_ID=<your-aws-key>
   AWS_SECRET_ACCESS_KEY=<your-aws-secret>
   AWS_REGION=<your-aws-region>
   AWS_BUCKET_NAME=<your-bucket-name>

   # Development-specific settings
   NODE_ENV=development
   VITE_NODE_ENV=development
   VITE_API_URL=http://localhost:8000/api
   CORS_ORIGIN=http://localhost:5173
   VITE_ENABLE_DEBUG=true
   VITE_ENABLE_ANALYTICS=false
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run dev  # Backend runs on http://localhost:8000
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev  # Frontend runs on http://localhost:5173
   ```

5. **Docker Development (Alternative)**
   ```bash
   # Start all services
   docker-compose -f docker/docker-compose.dev.yml up

   # Rebuild after changes
   docker-compose -f docker/docker-compose.dev.yml up --build

   # Run in background
   docker-compose -f docker/docker-compose.dev.yml up -d
   ```

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Prisma Studio: http://localhost:5555
- Health Check: http://localhost:8000/health

## Production Setup

### Environment Switch to Production

1. **Update Environment Variables**
   ```bash
   # In your .env file, modify these settings:
   
   # Core settings
   NODE_ENV=production
   VITE_NODE_ENV=production
   
   # API configuration
   VITE_API_URL=/api                        # Uncomment this line
   # VITE_API_URL=http://localhost:8000/api  # Comment this line
   
   # CORS settings
   CORS_ORIGIN=http://3.21.246.147:8085     # Uncomment this line
   # CORS_ORIGIN=http://localhost:5173       # Comment this line
   
   # Feature flags
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_DEBUG=false
   ```

2. **Deploy to Production**
   ```bash
   # Stop any running services
   docker-compose -f docker/docker-compose.production.yml down
   
   # Deploy with new settings
   docker-compose -f docker/docker-compose.production.yml up -d --build
   ```

## Maintenance & Troubleshooting

### Common Operations

1. **Update Deployment**
   ```bash
   git pull
   docker-compose -f docker/docker-compose.production.yml up -d --build
   ```

2. **View Logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f [backend|frontend|db]
   ```

3. **Service Management**
   ```bash
   # Restart specific service
   docker-compose restart [service_name]
   
   # Check service status
   docker-compose ps
   ```

### Health Monitoring
- Production Frontend: http://3.21.246.147:8085/health
- Production Backend: http://3.21.246.147:8000/health

## Security & CI/CD

### Security Measures
- Production credentials in Jenkins credentials store
- AWS Secrets Manager for sensitive data
- SSL certificates via AWS Certificate Manager

### CI/CD Pipeline
1. Environment validation
2. Container builds and tests
3. Production deployment
4. Health check verification