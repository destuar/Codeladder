export const OAUTH_CONFIG = {
  google: {
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback/google`,
    scope: 'email profile',
  },
  github: {
    client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback/github`,
    scope: 'user:email',
  },
  apple: {
    client_id: import.meta.env.VITE_APPLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback/apple`,
    scope: 'name email',
  },
} as const; 