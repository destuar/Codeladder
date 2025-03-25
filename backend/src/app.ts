/**
 * @file backend/src/app.ts
 * 
 * Main application configuration file for CodeLadder API Server
 * This file sets up the Express application with all necessary middleware,
 * security configurations, and route handlers.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import apiRouter from './routes/index';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, registerLimiter, adminApiLimiter } from './middleware/rateLimit';
import { requestDebugger } from './middleware/debugger';
import debugRouter from './routes/debug-db';

const app = express();

// Log environment configuration for debugging purposes
console.log('Current environment:', process.env.NODE_ENV);

/**
 * Security Middleware Configuration
 * helmet: Adds various HTTP headers to help protect the application
 * - crossOriginResourcePolicy: Allows resources to be shared across origins
 * - crossOriginOpenerPolicy: Configures window.opener behavior for cross-origin links
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

/**
 * CORS Configuration
 * Implements a flexible CORS policy that:
 * - Allows different origins based on environment (production vs development)
 * - Supports credentials for authenticated requests
 * - Configures allowed HTTP methods and headers
 * - Includes proper error handling for unauthorized origins
 */
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.CORS_ORIGIN]
      : ['http://localhost:5173', 'http://localhost:8085', process.env.CORS_ORIGIN];
    
    // Filter out invalid origins and log allowed origins for debugging
    const validOrigins = allowedOrigins.filter(Boolean);
    console.log('CORS origins allowed:', validOrigins);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (validOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS. Allowed origins:`, validOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

/**
 * Request Processing Middleware
 * - express.json(): Parses JSON payloads in requests
 * - cookieParser: Handles HTTP cookies
 * - requestDebugger: Custom middleware for request logging and debugging
 */
app.use(express.json());
app.use(cookieParser());
app.use(requestDebugger);

/**
 * Rate Limiting Configuration
 * Implements tiered rate limiting for different API endpoints:
 * - General API endpoints
 * - Authentication endpoints
 * - Registration endpoint (stricter limits)
 * - Admin endpoints (higher limits)
 */
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/register', registerLimiter);
// Apply the more generous admin rate limiter to admin routes
app.use('/api/admin', adminApiLimiter);
// Also give the learning path admin routes higher limits
app.use('/api/learning', adminApiLimiter);

// Mount all API routes under the /api prefix
app.use('/api', apiRouter);

// Add the debug routes
app.use('/api/debug', debugRouter);

/**
 * Root Endpoint
 * Provides basic API information and available endpoints
 */
app.get('/', (req, res) => {
  res.json({
    message: 'CodeLadder API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

/**
 * Health Check Endpoint
 * Used for monitoring and load balancer checks
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Global Error Handler
 * Catches and processes all errors thrown within the application
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app; 