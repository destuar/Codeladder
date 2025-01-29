# SmarterStruct Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Project Structure

```
smarterstruct/
├── backend/         # Express + Prisma backend
├── frontend/        # React + Vite frontend
├── docs/           # Documentation
└── README.md
```

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/cee8/smarterstruct/
cd smarterstruct
```

2. Set up the backend:
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Set up the database
npm run prisma:migrate
npm run prisma:generate

# Start the development server
npm run dev
```

3. Set up the frontend:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Environment Variables

### Backend (.env)
```env
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smarterstruct"
JWT_SECRET="your-super-secret-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"
JWT_EXPIRES_IN=1d
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:8000/api"
```

## Development

### Backend Development
- The backend runs on `http://localhost:8000`
- API routes are prefixed with `/api`
- Prisma Studio (database GUI) can be accessed by running `npm run prisma:studio`

### Frontend Development
- The frontend runs on `http://localhost:5173`
- Built with React + Vite
- Uses shadcn/ui components
- Tailwind CSS for styling

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port 8000
   lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

2. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Run migrations: `npm run prisma:migrate`

3. **CORS Issues**
   - Ensure frontend URL is listed in backend CORS configuration
   - Check that API requests include credentials

## Scripts Reference

### Backend
```json
{
  "dev": "Start development server",
  "build": "Build for production",
  "prisma:generate": "Generate Prisma client",
  "prisma:migrate": "Run database migrations",
  "prisma:studio": "Open Prisma Studio"
}
```

### Frontend
```json
{
  "dev": "Start development server",
  "build": "Build for production",
  "preview": "Preview production build"
}
``` 