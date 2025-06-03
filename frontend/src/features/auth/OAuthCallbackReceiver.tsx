import React, { useEffect } from 'react';
// useNavigate might not be strictly needed if the page only closes itself,
// but it's good practice if any conditional navigation might be added later.
import { useNavigate } from 'react-router-dom'; 
import { logger } from '@/lib/logger';

const OAuthCallbackReceiver: React.FC = () => {
  const navigate = useNavigate(); 

  useEffect(() => {
    logger.debug('[OAuthCallbackReceiver] Loaded.');
    
    // Extract data from URL (regardless of search or hash)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash?.substring(1)); // Remove the # and parse
    
    // Try both search and hash for the token and user info
    const token = urlParams.get('token') || hashParams.get('token');
    const userId = urlParams.get('userId') || hashParams.get('userId');
    const email = urlParams.get('email') || hashParams.get('email');
    const name = urlParams.get('name') || hashParams.get('name');
    const role = urlParams.get('role') || hashParams.get('role');
    const error = urlParams.get('error') || hashParams.get('error');

    if (error) {
      const errorData = {
        type: 'oauth_error',
        error: error,
        timestamp: Date.now()
      };
      
      logger.error('[OAuthCallbackReceiver] OAuth error received:', error);
      
      // Try postMessage first
      try {
        const openerOrigin = window.opener?.location?.origin || window.location.origin;
        logger.debug('[OAuthCallbackReceiver] Attempting to send error via postMessage to origin:', openerOrigin);
        
        if (window.opener) {
          window.opener.postMessage(errorData, openerOrigin);
          logger.debug('[OAuthCallbackReceiver] Error postMessage sent successfully.');
        } else {
          logger.warn('[OAuthCallbackReceiver] window.opener not available for error postMessage.');
        }
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error sending error postMessage:', e);
      }
      
      // Fallback to localStorage
      try {
        localStorage.setItem('oauth_callback_data', JSON.stringify(errorData));
        logger.debug('[OAuthCallbackReceiver] Error data set in localStorage.');
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error setting error data in localStorage:', e);
      }
      
      // Close popup
      logger.debug('[OAuthCallbackReceiver] Closing popup due to error.');
      window.close();
      return;
    }

    if (token && userId && email && name && role) {
      // Success case
      const messagePayload = {
        type: 'oauth_success',
        payload: {
          user: { id: userId, email, name, role },
          token
        },
        timestamp: Date.now()
      };
      
      logger.debug('[OAuthCallbackReceiver] Parsed data:', messagePayload);
      
      // Try postMessage first
      try {
        const openerOrigin = window.opener?.location?.origin || window.location.origin;
        logger.debug('[OAuthCallbackReceiver] window.opener IS available. Attempting postMessage to origin:', openerOrigin);
        
        if (window.opener) {
          window.opener.postMessage(messagePayload, openerOrigin);
          logger.debug('[OAuthCallbackReceiver] postMessage sent successfully.');
        } else {
          logger.warn('[OAuthCallbackReceiver] window.opener is NOT available. postMessage will not be attempted directly via opener reference.');
        }
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error sending postMessage:', e);
      }
      
      // Fallback to localStorage for all cases (even if postMessage succeeded)
      try {
        localStorage.setItem('oauth_callback_data', JSON.stringify(messagePayload));
        logger.debug('[OAuthCallbackReceiver] Data set in localStorage key "oauth_callback_data".');
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error setting localStorage:', e);
      }
      
      // Close the popup
      logger.debug('[OAuthCallbackReceiver] Closing popup.');
      window.close();
    } else {
      // Missing required parameters
      logger.error('[OAuthCallbackReceiver] Missing token or essential user details in URL parameters.');
      logger.debug('[OAuthCallbackReceiver] Received params: token=' + token + ', userId=' + userId + ', email=' + email + ', name=' + name + ', role=' + role);
      
      const errorData = {
        type: 'oauth_error',
        error: 'Missing authentication data',
        timestamp: Date.now()
      };
      
      // Try postMessage first
      try {
        const openerOrigin = window.opener?.location?.origin || window.location.origin;
        if (window.opener) {
          window.opener.postMessage(errorData, openerOrigin);
        }
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error sending error postMessage:', e);
      }
      
      // Fallback to localStorage
      try {
        localStorage.setItem('oauth_callback_data', JSON.stringify(errorData));
      } catch (e) {
        logger.error('[OAuthCallbackReceiver] Error setting localStorage:', e);
      }
      
      // Close popup
      logger.debug('[OAuthCallbackReceiver] Closing popup due to error.');
      window.close();
    }
  }, [navigate]); // navigate is stable, effect runs once on mount

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl mb-4">Processing authentication...</h2>
        <p className="text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  );
};

export default OAuthCallbackReceiver; 