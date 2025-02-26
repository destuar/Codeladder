# CodeLadder Infrastructure

This directory contains infrastructure configurations for the CodeLadder project. All environment variables are managed through the root `.env` file.

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

## Quick Start

1. **Development**
   ```bash
   # Start services (uses root .env)
   docker-compose -f docker/docker-compose.dev.yml up
   ```

2. **Production**
   ```bash
   # Deploy (uses root .env)
   docker-compose -f docker/docker-compose.production.yml up -d
   ```

## Environment Variables

All environment variables are managed in the root `.env` file. This includes:
- Database configuration
- AWS credentials
- JWT secrets
- API endpoints
- Feature flags

## Security

- Production credentials are stored in Jenkins credentials store
- AWS Secrets Manager for sensitive data
- SSL certificates through AWS Certificate Manager

## CI/CD Pipeline

Jenkins pipeline automatically:
1. Loads environment from root `.env`
2. Builds and tests containers
3. Deploys to production
4. Performs health checks

## Maintenance

1. **Updates**
   ```bash
   # Pull latest changes
   git pull
   
   # Rebuild and restart services
   docker-compose -f docker/docker-compose.production.yml up -d --build
   ```

2. **Logs**
   ```bash
   # View service logs
   docker-compose logs -f [service_name]
   ```

## Troubleshooting

1. **Service Issues**
   ```bash
   # Restart services
   docker-compose restart [service_name]
   
   # Check logs
   docker-compose logs [service_name]
   ```

2. **Health Checks**
   - Frontend: http://localhost:8085/health
   - Backend: http://localhost:8000/health 