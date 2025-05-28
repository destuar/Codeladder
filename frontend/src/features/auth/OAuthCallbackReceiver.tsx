import React, { useEffect } from 'react';
// useNavigate might not be strictly needed if the page only closes itself,
// but it's good practice if any conditional navigation might be added later.
import { useNavigate } from 'react-router-dom'; 

const OAuthCallbackReceiver: React.FC = () => {
  const navigate = useNavigate(); 

  useEffect(() => {
    console.log('[OAuthCallbackReceiver] Loaded.');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    const email = params.get('email');
    const name = params.get('name'); // This might be an empty string if name was null
    const role = params.get('role');

    // Clear the URL to remove sensitive parameters from browser history/display
    // window.history.replaceState({}, document.title, window.location.pathname);


    if (token && userId && email && role) {
      const userPayload = { 
        id: userId, 
        email, 
        name: name === '' ? null : name, // Convert empty string back to null for name
        role 
      };
      const messagePayload = {
        type: 'oauth_success',
        payload: {
          user: userPayload,
          token: token,
        },
      };

      console.log('[OAuthCallbackReceiver] Parsed data:', messagePayload);

      // Attempt 1: postMessage
      // The target origin for postMessage should be the origin of the window that opened the popup.
      // Assuming the main app is on the same origin as this callback receiver page.
      const openerOrigin = window.location.origin; 
      if (window.opener) {
        console.log('[OAuthCallbackReceiver] window.opener IS available. Attempting postMessage to origin:', openerOrigin);
        try {
          window.opener.postMessage(messagePayload, openerOrigin);
          console.log('[OAuthCallbackReceiver] postMessage sent successfully.');
        } catch (e) {
          console.error('[OAuthCallbackReceiver] Error sending postMessage:', e);
        }
      } else {
        console.warn('[OAuthCallbackReceiver] window.opener is NOT available. postMessage will not be attempted directly via opener reference.');
      }

      // Attempt 2: localStorage (as primary or fallback)
      // This is a more robust way if opener is unreliable.
      const localStoragePayload = { ...messagePayload, timestamp: Date.now() };
      try {
        // Use a specific, well-known key for the main app to listen to.
        localStorage.setItem('oauth_callback_data', JSON.stringify(localStoragePayload));
        console.log('[OAuthCallbackReceiver] Data set in localStorage key "oauth_callback_data".');
      } catch (e) {
        console.error('[OAuthCallbackReceiver] Error setting localStorage:', e);
      }
      
      // A small timeout before closing can help ensure postMessage/localStorage operations complete.
      setTimeout(() => {
        console.log('[OAuthCallbackReceiver] Closing popup.');
        window.close(); // Re-enabled
      }, 200);

    } else {
      console.error('[OAuthCallbackReceiver] Missing token or essential user details in URL parameters.');
      console.log('[OAuthCallbackReceiver] Received params: token=' + token + ', userId=' + userId + ', email=' + email + ', name=' + name + ', role=' + role);
      const errorPayload = { type: 'oauth_error', error: 'Missing token or user details in callback parameters from server.' };
      
      // Attempt to notify opener about the error
      if (window.opener) {
        try {
          window.opener.postMessage(errorPayload, window.location.origin);
        } catch (e) {
          console.error('[OAuthCallbackReceiver] Error sending error postMessage:', e);
        }
      }
      // Also set error in localStorage
      localStorage.setItem('oauth_callback_data', JSON.stringify({ ...errorPayload, timestamp: Date.now() }));
      
      setTimeout(() => {
        console.log('[OAuthCallbackReceiver] Closing popup due to error.');
        window.close(); // Re-enabled
      }, 200);
    }

  }, [navigate]); // navigate is stable, effect runs once on mount

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', color: '#333' }}>
      <h1>Authenticating...</h1>
      <p>Please wait a moment. This window will close automatically.</p>
      <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#777' }}>
        If this window does not close automatically, you may close it manually.
      </p>
    </div>
  );
};

export default OAuthCallbackReceiver; 