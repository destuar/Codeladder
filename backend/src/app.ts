/**
 * @file backend/src/app.ts
 * 
 * Main application configuration file for CodeLadder API Server
 * This file sets up the Express application with all necessary middleware,
 * security configurations, and route handlers.
 */

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import apiRouter from './routes/index';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback as GoogleVerifyCallback } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { prisma } from './config/db';
import { User as PrismaUser, Role as PrismaRole, Prisma } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, registerLimiter, adminApiLimiter } from './middleware/rateLimit';
import { requestDebugger } from './middleware/debugger';
import { jobsRouter } from './jobs/jobs.controller';
import { logger } from './shared/logger.service';

// Define PassportUser aligning with Express.User and PrismaUser
interface PassportUser {
  id: string;
  email: string;
  name: string | null;
  role: PrismaRole; 
  googleId: string | null;
  githubId: string | null;
  tokenVersion: number;
}

// Augment Express.User
declare global {
  namespace Express {
    interface User extends PassportUser {}
  }
}

const app = express();

// Log environment configuration for debugging purposes
console.log('Current environment:', env.NODE_ENV);

// Added: Initialize Passport Middleware
app.use(passport.initialize());

// Added: Passport Strategy Configurations
// --- Google Strategy Configuration ---
passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req: Request, accessToken: string, refreshToken: string | undefined, profile: GoogleProfile, done: GoogleVerifyCallback) => {
    try {
      if (!profile.emails || profile.emails.length === 0 || !profile.emails[0].value) {
        return done(new Error("No email found in Google profile"), undefined);
      }
      const email = profile.emails[0].value;
      let user: PrismaUser | null = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const createData: Prisma.UserCreateInput = {
          email: email,
          name: profile.displayName || null,
          googleId: profile.id,
          role: 'USER',
        };
        user = await prisma.user.create({ data: createData });
      } else if (!user.googleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id } });
      }
      const passportUser: PassportUser = { 
        id: user.id, email: user.email, name: user.name ?? null, role: user.role, 
        googleId: user.googleId ?? null, githubId: user.githubId ?? null, tokenVersion: user.tokenVersion 
      };
      return done(null, passportUser as Express.User);
    } catch (error: any) {
      return done(error, undefined);
    }
  }
));

// --- GitHub Strategy Configuration ---
// Type for GitHub done callback
type GitHubDoneCallback = (error: any, user?: Express.User | false | null, info?: any) => void;

passport.use(new GitHubStrategy({
    clientID: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    callbackURL: env.GITHUB_CALLBACK_URL,
    scope: ['user:email'],
    passReqToCallback: true
  },
  async (req: Request, accessToken: string, refreshToken: string | undefined, profile: GitHubProfile, done: GitHubDoneCallback) => {
    try {
      let primaryEmail: string | null = null;
      if (profile.emails && profile.emails.length > 0 && profile.emails[0].value) {
        primaryEmail = profile.emails[0].value;
      }

      if (!primaryEmail) {
        return done(new Error("Could not determine email for GitHub profile."), undefined);
      }

      let user: PrismaUser | null = await prisma.user.findUnique({ where: { email: primaryEmail } });

      if (!user) {
        const createData: Prisma.UserCreateInput = {
          email: primaryEmail,
          name: profile.displayName || profile.username || null,
          githubId: profile.id,
          role: 'USER',
        };
        user = await prisma.user.create({ data: createData });
      } else if (!user.githubId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { githubId: profile.id } });
      }
      const passportUser: PassportUser = { 
        id: user.id, email: user.email, name: user.name ?? null, role: user.role, 
        googleId: user.googleId ?? null, githubId: user.githubId ?? null, tokenVersion: user.tokenVersion 
      };
      return done(null, passportUser as Express.User);
    } catch (error: any) {
      return done(error, undefined);
    }
  }
));

// Optional: Serialize/Deserialize User (primarily for session-based auth)
// Since we're using JWTs and stateless API, these might not be strictly necessary
// if your `authenticate` middleware directly handles token validation without sessions.
// However, passport.authenticate in the callback *will* try to establish a session by default if these are present.
// For a fully stateless JWT flow initiated by OAuth, the key is to set `session: false` in `passport.authenticate` options
// and then immediately issue your JWT.
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) {
      const passportUser: PassportUser = { 
        id: user.id, email: user.email, name: user.name ?? null, role: user.role, 
        googleId: user.googleId ?? null, githubId: user.githubId ?? null, tokenVersion: user.tokenVersion
      };
      done(null, passportUser as Express.User);
    } else {
      done(null, undefined); 
    }
  } catch (error: any) {
    done(error, undefined);
  }
});

/**
 * Security Middleware Configuration
 * helmet: Adds various HTTP headers to help protect the application
 * - crossOriginResourcePolicy: Allows resources to be shared across origins
 * - crossOriginOpenerPolicy: Configures window.opener behavior for cross-origin links
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      // Add other directives here if needed, e.g., for styles or fonts from CDNs
    },
  },
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
    const allowedOrigins = env.NODE_ENV === 'production'
      ? [env.CORS_ORIGIN, 'https://www.codeladder.io']
      : ['http://localhost:5173', 'http://localhost:8085', env.CORS_ORIGIN].filter(Boolean) as string[];
        
    if (!origin || (allowedOrigins && allowedOrigins.includes(origin))) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS. Allowed origins:`, allowedOrigins);
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
app.use(requestDebugger as RequestHandler);

/**
 * Rate Limiting Configuration
 * Implements tiered rate limiting for different API endpoints:
 * - General API endpoints
 * - Authentication endpoints
 * - Registration endpoint (stricter limits)
 * - Admin endpoints (higher limits)
 */
app.use('/api/', apiLimiter as RequestHandler);
app.use('/api/auth', authLimiter as RequestHandler);
app.use('/api/auth/register', registerLimiter as RequestHandler);
// Apply the more generous admin rate limiter to admin routes
app.use('/api/admin', adminApiLimiter as RequestHandler);
// Also give the learning path admin routes higher limits
app.use('/api/learning', adminApiLimiter as RequestHandler);

// Mount all API routes under the /api prefix
app.use('/api', apiRouter);

// Routes
app.use('/api/jobs', jobsRouter);

/**
 * Root Endpoint
 * Provides basic API information and available endpoints
 */
const rootHandler: RequestHandler = (req, res) => {
  res.json({
    message: 'CodeLadder API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
};
app.get('/', rootHandler);

/**
 * Health Check Endpoint
 * Used for monitoring and load balancer checks
 */
const healthHandler: RequestHandler = (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Backend is healthy' });
};
app.get('/health', healthHandler);

/**
 * Global Error Handler
 * Catches and processes all errors thrown within the application
 */
const finalErrorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  // If req.user exists, ensure its 'name' property conforms to 'string | null' for errorHandler
  // This is a workaround for the persistent type mismatch.
  const typedReq = req as express.Request & { user?: { name: string | null } & Omit<Express.User, 'name'> };
  errorHandler(err, typedReq, res, next);
};
app.use(finalErrorHandler);

// Handle 404 for routes not found
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Resource not found' });
});

export default app; 