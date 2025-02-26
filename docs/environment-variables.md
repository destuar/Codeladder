# Environment Variables

This document details all environment variables used in the CodeLadder project, separated by environment and service.

## Development Environment

### Backend Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=8000
CORS_ORIGIN=http://localhost:8085

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codeladder_dev"

# Authentication
JWT_SECRET=your_development_jwt_secret
JWT_REFRESH_SECRET=your_development_refresh_secret
JWT_EXPIRES_IN=15m

# AWS Configuration (if needed locally)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-2
S3_BUCKET=codeladder-dev
```

### Frontend Variables
```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_ENV=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_MOCK_API=true
```

## Production Environment

### Backend Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://your-domain.com

# Database
DATABASE_URL="postgresql://user:password@your-db-host:5432/codeladder_prod"

# Authentication
JWT_SECRET=your_secure_production_jwt_secret
JWT_REFRESH_SECRET=your_secure_production_refresh_secret
JWT_EXPIRES_IN=15m

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-2
S3_BUCKET=codeladder-prod
```

### Frontend Variables
```bash
# API Configuration
VITE_API_URL=https://api.your-domain.com
VITE_ENV=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_MOCK_API=false
```

## CI/CD Environment
Additional variables needed in Jenkins:

```bash
# Deployment
EC2_HOST=your-ec2-host
DEPLOY_PATH=/home/ec2-user/codeladder
FRONTEND_PORT=8085
BACKEND_PORT=8000

# AWS Credentials
AWS_ACCESS_KEY_ID=jenkins_aws_key
AWS_SECRET_ACCESS_KEY=jenkins_aws_secret
AWS_REGION=us-east-2

# Docker Registry (if using)
DOCKER_REGISTRY=your-registry-url
DOCKER_USERNAME=registry-username
DOCKER_PASSWORD=registry-password
```

## Security Best Practices

1. **Never commit .env files**
   - Use .env.example as templates
   - Keep different .env files for different environments

2. **Secure Storage**
   - Store production secrets in Jenkins Credentials
   - Use AWS Secrets Manager for cloud deployments
   - Rotate secrets regularly

3. **Access Control**
   - Limit access to production variables
   - Use least-privilege principle
   - Audit access to sensitive variables

4. **Variable Validation**
   - Validate environment variables on startup
   - Provide clear error messages for missing variables
   - Use TypeScript for type-safe environment variables

## Example Configuration Files

### `.env.example`
```bash
# Copy this file to .env and fill in the values
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codeladder_dev
```

### `docker-compose.yml` Environment Setup
```yaml
services:
  backend:
    environment:
      - NODE_ENV=development
      - PORT=8000
      # ... other variables

  frontend:
    environment:
      - VITE_API_URL=http://localhost:8000/api
      # ... other variables
```

## Troubleshooting

1. **Missing Variables**
   - Check if all required variables are set
   - Verify variable names match exactly
   - Ensure no trailing spaces in values

2. **Connection Issues**
   - Verify database connection string
   - Check API URL configuration
   - Confirm CORS settings

3. **Permission Problems**
   - Verify AWS credentials and permissions
   - Check file system permissions
   - Confirm database user privileges 