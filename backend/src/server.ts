/**
 * @file backend/src/server.ts
 * 
 * Server Entry Point
 * This file initializes and starts the Express server for the CodeLadder application.
 * It imports the configured Express application and environment variables,
 * then starts listening on the specified port.
 */

import app from './app';
import { logger } from './shared/logger.service';
import env from './config/env';
import './jobs/scheduler'; // Import to initialize the scheduler

// Parse port from environment configuration, defaulting to base-10 integer
const PORT = parseInt(env.PORT, 10);

/**
 * Start the server and listen for incoming connections
 * Logs the server status including:
 * - Port number
 * - Environment mode (development/production)
 */
app.listen(PORT, () => {
  logger.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.log(`Access the API at http://localhost:${PORT}`);
  logger.log(`Builtin.com jobs endpoint: http://localhost:${PORT}/api/jobs/builtin`);
  logger.log(`Health check: http://localhost:${PORT}/health`);
}).on('error', (err: Error) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
}); 