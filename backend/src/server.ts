/**
 * @file backend/src/server.ts
 * 
 * Server Entry Point
 * This file initializes and starts the Express server for the CodeLadder application.
 * It imports the configured Express application and environment variables,
 * then starts listening on the specified port.
 */

import app from './app';
import env from './config/env';

// Parse port from environment configuration, defaulting to base-10 integer
const PORT = parseInt(env.PORT, 10);

/**
 * Start the server and listen for incoming connections
 * Logs the server status including:
 * - Port number
 * - Environment mode (development/production)
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
}); 