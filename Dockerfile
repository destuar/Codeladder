# Build frontend
FROM node:18 AS frontend-builder
WORKDIR /app
# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm install
# Then copy the rest of the frontend files
COPY frontend/ ./
# Set the API URL
ENV VITE_API_URL=http://3.21.246.147:8085/api
# Build the frontend (skip type checking for now)
RUN npm run build
# List contents to verify build (debugging)
RUN ls -la dist/

# Build backend
FROM node:18 AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Final stage
FROM nginx:alpine
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*
# Copy the built frontend files to NGINX's serve directory
COPY --from=frontend-builder /app/dist/ /usr/share/nginx/html/
# Copy the backend build
COPY --from=backend-builder /app/dist /app/backend
# Copy NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify the files are copied (debugging)
RUN ls -la /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
