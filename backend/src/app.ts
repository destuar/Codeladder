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

// Add near the start of your app.ts
console.log('Current environment:', process.env.NODE_ENV);
console.log('CORS origins allowed:', process.env.NODE_ENV === 'production' 
  ? [process.env.CORS_ORIGIN]
  : ['http://localhost:5173', process.env.CORS_ORIGIN].filter(Boolean)
);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

// CORS configuration for development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.CORS_ORIGIN]
      : ['http://localhost:5173', process.env.CORS_ORIGIN];
    
    // Remove any undefined/null values and filter empty strings
    const validOrigins = allowedOrigins.filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (validOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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