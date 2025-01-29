import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import authRoutes from './api/auth/route';
import profileRoutes from './api/profile/route';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to SmarterStruct API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      health: '/health',
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

export default app; 