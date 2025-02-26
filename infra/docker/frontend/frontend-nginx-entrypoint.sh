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

# Replace environment variables in the Nginx configuration
envsubst '${VITE_API_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Start nginx in the foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
