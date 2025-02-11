import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/db';
import env from '../../config/env';

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

interface JwtPayload {
  userId: string;
  role: 'USER' | 'ADMIN' | 'DEVELOPER';
  tokenVersion?: number;
}

const accessTokenOptions: SignOptions = {
  expiresIn: '15m'
};

const refreshTokenOptions: SignOptions = {
  expiresIn: '7d'
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Generate token
    const payload: JwtPayload = { userId: user.id, role: user.role };
    const token = jwt.sign(payload, env.JWT_SECRET, accessTokenOptions);

    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const payload: JwtPayload = { 
      userId: user.id, 
      role: user.role,
      tokenVersion: user.tokenVersion 
    };
    
    const accessToken = jwt.sign(payload, env.JWT_SECRET, accessTokenOptions);
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshTokenOptions);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify refresh token
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    
    // Get user and verify token version
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true
      }
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const newPayload: JwtPayload = { 
      userId: user.id, 
      role: user.role,
      tokenVersion: user.tokenVersion 
    };
    
    const accessToken = jwt.sign(newPayload, env.JWT_SECRET, accessTokenOptions);

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
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Increment token version to invalidate all existing refresh tokens
  if (req.user?.id) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tokenVersion: { increment: 1 } }
    });
  }
  
  res.json({ message: 'Logged out successfully' });
}; 