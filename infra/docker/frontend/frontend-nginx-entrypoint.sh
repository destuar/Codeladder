#!/bin/sh
set -e

echo "=== Starting custom entrypoint ==="
echo "Current working directory: $(pwd)"
echo "Listing nginx html directory:"
ls -la /usr/share/nginx/html/

# Set default values for environment variables
: "${VITE_API_URL:=http://localhost:8000/api}"
: "${VITE_NODE_ENV:=development}"

echo "VITE_API_URL is: ${VITE_API_URL}"
echo "VITE_NODE_ENV is: ${VITE_NODE_ENV}"

# Generate or update config.js
if [ -f "/usr/share/nginx/html/config.js.template" ]; then
    echo "Generating config.js from template..."
    envsubst '${VITE_API_URL} ${VITE_NODE_ENV}' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js
    # Ensure config.js has correct permissions
    chmod 644 /usr/share/nginx/html/config.js
else
    echo "Warning: config.js.template not found!"
    echo "Creating config.js with default values..."
    echo '(function(window) { window.ENV = { API_URL: "'${VITE_API_URL}'", NODE_ENV: "'${VITE_NODE_ENV}'" }; })(window);' > /usr/share/nginx/html/config.js
    chmod 644 /usr/share/nginx/html/config.js
fi

echo "Generated config.js contents:"
cat /usr/share/nginx/html/config.js

# Verify nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx in the foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
