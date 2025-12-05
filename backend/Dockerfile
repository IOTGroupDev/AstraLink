# ============================================
# Stage 1: Builder - Build with dependencies
# ============================================
FROM node:20-alpine3.19 AS builder

WORKDIR /app

RUN mkdir -p /app/ephe

# Build deps для нативных модулей
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    python3-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ============================================
# Stage 2: Production - Minimal runtime image
# ============================================
FROM node:20-alpine3.19

WORKDIR /app

# Python + pyswisseph + build tools для swisseph
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    python3-dev && \
    pip3 install --no-cache-dir --break-system-packages pyswisseph

# non-root юзер
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/ephe ./ephe

RUN chown -R nestjs:nodejs /app

ENV NODE_ENV=production
ENV PORT=3000

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
