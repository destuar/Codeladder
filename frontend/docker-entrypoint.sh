#!/bin/sh
set -e

echo "=== Starting custom entrypoint ==="
echo "Current working directory: $(pwd)"
echo "Listing nginx html directory:"
ls -la /usr/share/nginx/html/

echo "API_URL is: ${API_URL}"

# Generate config.js with proper environment variable substitution
envsubst '${API_URL} ${NODE_ENV}' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

echo "Generated config.js contents:"
cat /usr/share/nginx/html/config.js

# Verify nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx in the foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
