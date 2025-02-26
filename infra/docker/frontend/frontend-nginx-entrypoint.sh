#!/bin/sh
# =============================================================================
# CodeLadder Frontend Nginx Entrypoint Script
# 
# This script runs when the frontend container starts and:
# 1. Sets up runtime configuration for the React/Vite app
# 2. Injects environment variables into the frontend
# 3. Verifies Nginx configuration
# 4. Starts Nginx in foreground mode
# =============================================================================

# Exit on any error and enable command printing for debugging
set -e

# Log startup information for debugging purposes
echo "=== Starting CodeLadder Frontend Container ==="
echo "Current working directory: $(pwd)"
echo "Listing nginx html directory:"
ls -la /usr/share/nginx/html/

# ============================= ENVIRONMENT SETUP ==============================
# Set default values for required environment variables
# These ensure the application works even if variables aren't provided
: "${VITE_API_URL:=http://localhost:8000/api}"  # Default API URL
: "${VITE_NODE_ENV:=development}"               # Default environment

# Log environment configuration for debugging
echo "Environment Configuration:"
echo "VITE_API_URL: ${VITE_API_URL}"
echo "VITE_NODE_ENV: ${VITE_NODE_ENV}"

# ========================== RUNTIME CONFIGURATION ============================
# Generate the runtime configuration file (config.js)
# This allows environment-specific settings to be injected at runtime
if [ -f "/usr/share/nginx/html/config.js.template" ]; then
    echo "Generating config.js from template..."
    # Use envsubst to replace environment variables in the template
    envsubst '${VITE_API_URL} ${VITE_NODE_ENV}' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js
    
    # Set appropriate permissions for the config file
    # 644 = (owner:rw-, group:r--, others:r--)
    chmod 644 /usr/share/nginx/html/config.js
else
    # Fallback: Create config.js directly if template is missing
    echo "Warning: config.js.template not found!"
    echo "Creating config.js with default values..."
    echo '(function(window) { window.ENV = { API_URL: "'${VITE_API_URL}'", NODE_ENV: "'${VITE_NODE_ENV}'" }; })(window);' > /usr/share/nginx/html/config.js
    chmod 644 /usr/share/nginx/html/config.js
fi

# Verify the generated configuration
echo "Generated config.js contents:"
cat /usr/share/nginx/html/config.js

# ============================= NGINX STARTUP ================================
# Test Nginx configuration before starting
echo "Verifying nginx configuration..."
nginx -t

# Start Nginx in foreground mode
# Using exec ensures Nginx receives signals properly
echo "Starting nginx in foreground mode..."
exec nginx -g "daemon off;"
