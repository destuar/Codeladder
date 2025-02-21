import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

const debug = {
  log: (...args: any[]) => {
    if (env.NODE_ENV !== 'production') {
      console.log('[Backend]', ...args);
    }
  },
  error: (...args: any[]) => console.error('[Backend Error]', ...args),
  request: (req: Request) => {
    debug.log(`📥 ${req.method} Request to ${req.originalUrl}:`, {
      headers: req.headers,
      query: req.query,
      body: req.body,
      cookies: req.cookies,
      ip: req.ip,
    });
  },
  response: (res: Response, body: any) => {
    debug.log(`📤 Response ${res.statusCode}:`, {
      headers: res.getHeaders(),
      body,
    });
  }
};

export const requestDebugger = (req: Request, res: Response, next: NextFunction) => {
  // Log incoming request
  debug.request(req);

  // Capture the original res.json to intercept responses
  const originalJson = res.json;
  res.json = function(body: any) {
    debug.response(res, body);
    return originalJson.call(this, body);
  };

  next();
}; 