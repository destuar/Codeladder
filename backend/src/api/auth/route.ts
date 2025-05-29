import { Router, Request, Response, RequestHandler as ExpressRequestHandler } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { login, register, refresh, logout } from './controller';
import { authenticate, authorize } from '../../core/middleware/authMiddleware';
import env from '../../config/env';
import querystring from 'querystring';

const router = Router();

// Public routes
router.post('/register', register as ExpressRequestHandler);
router.post('/login', login as ExpressRequestHandler);
router.post('/refresh', refresh as ExpressRequestHandler);

// Test endpoints
router.get('/verify', authenticate as ExpressRequestHandler, (req: Request, res: Response) => {
  res.json({
    message: 'Token is valid',
    user: req.user,
    tokenInfo: {
      hasToken: !!req.headers.authorization,
      tokenStart: req.headers.authorization?.split(' ')[1]?.substring(0, 20) + '...',
    }
  });
});

router.get('/verify-admin', 
  authenticate as ExpressRequestHandler,
  authorize('ADMIN', 'DEVELOPER') as ExpressRequestHandler,
  (req: Request, res: Response) => {
    res.json({
      message: 'Admin access verified',
      user: req.user
    });
  }
);

// Protected route example
router.get('/me', authenticate as ExpressRequestHandler, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Developer/Admin only route example
router.get('/users', authenticate as ExpressRequestHandler, authorize('ADMIN', 'DEVELOPER') as ExpressRequestHandler, async (req: Request, res: Response) => {
  res.json({ message: 'Access to admin/developer dashboard granted' });
});

// Protected routes
router.post('/logout', authenticate as ExpressRequestHandler, logout as ExpressRequestHandler);

// --- OAuth Routes ---
const oauthUrlHandler: ExpressRequestHandler = (req: Request, res: Response): void => {
  const provider = req.params.provider;
  let authUrl = '';
  let clientId = '';
  let callbackUrl = '';

  if (provider === 'google') {
    clientId = env.GOOGLE_CLIENT_ID;
    callbackUrl = env.GOOGLE_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      console.error('Google OAuth env vars not set.'); 
      res.status(500).json({error: 'OAuth not configured'});
      return;
    }
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=profile%20email&access_type=offline`;
  } else if (provider === 'github') {
    clientId = env.GITHUB_CLIENT_ID;
    callbackUrl = env.GITHUB_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      console.error('GitHub OAuth env vars not set.'); 
      res.status(500).json({error: 'OAuth not configured'});
      return;
    }
    authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email`;
  } else {
    res.status(400).json({ error: 'Unsupported OAuth provider' });
    return;
  }
  console.log(`[OAuth Debug] GitHub Auth URL generated: ${authUrl}`);
  res.json({ url: authUrl });
};

router.get('/:provider/url', oauthUrlHandler);

const oauthCallbackHandler = (provider: 'google' | 'github'): ExpressRequestHandler[] => [
  passport.authenticate(provider, { 
    failureRedirect: `${env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=${provider}-auth-failed`,
    session: false 
  }), 
  (req: Request, res: Response) => {
    if (!req.user) { 
      const frontendErrorRedirect = `${env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=${provider}-auth-failed&message=user_not_authenticated`;
      res.redirect(frontendErrorRedirect);
      return; 
    }
    const appUser = req.user;
    const payload = {
      userId: appUser.id,
      role: appUser.role,
      tokenVersion: appUser.tokenVersion,
    };
    
    let expiresInSeconds: number;
    const rawExpiresIn = env.JWT_EXPIRES_IN;
    if (typeof rawExpiresIn === 'number') {
      expiresInSeconds = rawExpiresIn;
    } else if (typeof rawExpiresIn === 'string') {
      if (rawExpiresIn.endsWith('m')) {
        expiresInSeconds = parseInt(rawExpiresIn.slice(0, -1), 10) * 60;
      } else if (rawExpiresIn.endsWith('h')) {
        expiresInSeconds = parseInt(rawExpiresIn.slice(0, -1), 10) * 60 * 60;
      } else if (rawExpiresIn.endsWith('d')) {
        expiresInSeconds = parseInt(rawExpiresIn.slice(0, -1), 10) * 24 * 60 * 60;
      } else if (/^[0-9]+$/.test(rawExpiresIn)) {
        expiresInSeconds = parseInt(rawExpiresIn, 10);
      } else {
        console.warn(`JWT_EXPIRES_IN format "${rawExpiresIn}" not recognized, using default 1 hour.`);
        expiresInSeconds = 3600;
      }
    } else {
      console.error('Invalid JWT_EXPIRES_IN value type:', rawExpiresIn, '(expected string or number), using default 1 hour.');
      expiresInSeconds = 3600;
    }

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresInSeconds });
    
    const queryParams = {
      token: accessToken,
      userId: String(appUser.id),
      email: String(appUser.email),
      name: String(appUser.name || ''),
      role: String(appUser.role)
    };

    const frontendRedirectUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/oauth-callback-receiver`;
    const redirectUrlWithParams = `${frontendRedirectUrl}?${querystring.stringify(queryParams)}`;
    
    res.redirect(redirectUrlWithParams);
  }
];

router.get('/google/callback', ...oauthCallbackHandler('google'));
router.get('/github/callback', ...oauthCallbackHandler('github'));

export default router; 