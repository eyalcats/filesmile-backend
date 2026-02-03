# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Build arguments (these become environment variables during build)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the app (env vars are baked into the bundle)
RUN npm run build

# Production stage - serve static files with nginx
FROM nginx:alpine AS production

# Install curl for healthcheck (wget not available in alpine by default)
RUN apk add --no-cache curl

# Add .mjs MIME type for ES modules (not in default nginx mime.types)
RUN echo "text/javascript mjs;" >> /etc/nginx/mime.types

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing (Traefik strips /scanner prefix)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
