import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';

export default function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange the code for tokens
        const response = await api.post(`/auth/${provider}/callback`, { code });

        // Send the success message back to the opener window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_success',
            payload: response
          }, window.location.origin);
        }
      } catch (error) {
        // Send the error message back to the opener window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            error: error instanceof Error ? error.message : 'Authentication failed'
          }, window.location.origin);
        }
      } finally {
        // Close this popup window
        window.close();
      }
    };

    handleCallback();
  }, [provider]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
} 