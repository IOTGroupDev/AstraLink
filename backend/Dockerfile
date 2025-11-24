# ===================================
# Multi-stage Dockerfile for AstraLink Backend
# Handles Node.js + Python Swiss Ephemeris
# ===================================

# ============================================
# Stage 1: Builder - Build with dependencies
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for Swiss Ephemeris and native modules
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    python3-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production - Minimal runtime image
# ============================================
FROM node:20-alpine

WORKDIR /app

# Install Python runtime for Swiss Ephemeris
RUN apk add --no-cache \
    python3 \
    py3-pip && \
    pip3 install --no-cache-dir pyswisseph

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy Prisma schema and generate client
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Swiss Ephemeris data files if they exist
COPY --from=builder --chown=nestjs:nodejs /app/ephe ./ephe 2>/dev/null || true

# Set ownership
RUN chown -R nestjs:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]