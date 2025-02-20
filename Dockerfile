# Build frontend
FROM node:18 AS frontend-builder
WORKDIR /app
COPY frontend/ .
RUN npm install
# Update API URL for Docker environment
ENV VITE_API_URL=http://3.21.246.147:8085/api
RUN npm run build

# Build backend
FROM node:18 AS backend-builder
WORKDIR /app
COPY backend/ .
RUN npm install
RUN npm run build

# Final stage
FROM nginx:alpine
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY --from=backend-builder /app/dist /app/backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add command to start both frontend and backend
CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
