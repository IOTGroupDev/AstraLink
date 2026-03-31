ARG NODE_VERSION=20.19.5
ARG ALPINE_VERSION=3.21

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

WORKDIR /app
ENV CI=true

FROM base AS deps

# Native build toolchain for npm packages with compiled bindings.
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    python3-dev \
    libc6-compat

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM deps AS builder

RUN mkdir -p /app/ephe

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runtime

WORKDIR /app

# Runtime-only packages for signal handling and native addon compatibility.
RUN apk add --no-cache \
    dumb-init \
    libstdc++ \
    libc6-compat

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--enable-source-maps --max-old-space-size=512"
ENV SE_EPHE_PATH=/app/ephe

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ephe ./ephe
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY scripts/start.sh ./start.sh

RUN chmod +x ./start.sh \
    && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["./start.sh"]
