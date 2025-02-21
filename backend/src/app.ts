import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import apiRouter from './routes/index';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, registerLimiter } from './middleware/rateLimit';
import { requestDebugger } from './middleware/debugger';

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(requestDebugger);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/register', registerLimiter);

// Mount all routes under /api
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CodeLadder API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app; 