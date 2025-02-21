import express, { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/db';
import env from '../config/env';
import { Role } from '@prisma/client';

const router = express.Router();

const debug = {
  log: (...args: any[]) => {
    if (env.NODE_ENV !== 'production') {
      console.log('[Auth Route]', ...args);
    }
  },
  error: (...args: any[]) => console.error('[Auth Route Error]', ...args)
};

interface JwtPayload {
  userId: string;
  role: Role;
  tokenVersion: number;
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'DEVELOPER']).default('USER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Add your auth routes here
router.post('/register', async (req: Request, res: Response) => {
  // ... your register route implementation
});

const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        tokenVersion: true
      }
    });
    
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload: JwtPayload = { 
      userId: user.id, 
      role: user.role,
      tokenVersion: user.tokenVersion 
    };

    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    };
    
    const accessToken = jwt.sign(
      payload, 
      env.JWT_SECRET, 
      signOptions
    );

    res.cookie('refreshToken', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    debug.log('Login successful:', {
      userId: user.id,
      role: user.role
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mount the handler
router.post('/login', loginHandler);

// ... other auth routes

export default router; 