# Frontend Dockerfile for development/testing
# Note: For production, use Expo EAS Build

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Expo dev server port
EXPOSE 19000 19001 19002

# Start Expo dev server
CMD ["npm", "start"]
