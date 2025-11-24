# 🚀 План развертывания AstraLink на VPS

**Дата:** 2025-11-23
**Проект:** AstraLink - Астрологическое приложение

---

## 📋 Архитектура развертывания

```
┌─────────────────────────────────────────────────────────────┐
│                        КЛИЕНТЫ                               │
├─────────────────────────────────────────────────────────────┤
│  iOS App (TestFlight/App Store)                             │
│  ↓ HTTPS                                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      VPS СЕРВЕР                              │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐     │
│  │  Nginx Proxy   │  │ Certbot SSL  │  │   Docker    │     │
│  │  (Port 80/443) │  │ Let's Encrypt│  │   Engine    │     │
│  └────────────────┘  └──────────────┘  └─────────────┘     │
│           ↓                                    ↓             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Docker Compose Services                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Backend    │  │  PostgreSQL  │               │   │
│  │  │   NestJS     │  │   Database   │               │   │
│  │  │   (Node.js)  │  │              │               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  │         ↓                  ↓                        │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │    Redis     │  │  Swiss Eph.  │               │   │
│  │  │   Cache      │  │  (Python)    │               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   ВНЕШНИЕ СЕРВИСЫ                            │
├─────────────────────────────────────────────────────────────┤
│  Supabase (Auth)  │  OpenAI API  │  Sentry (Monitoring)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐳 1. Контейнеризация (Docker)

### 1.1 Backend Dockerfile

**`backend/Dockerfile`:**

```dockerfile
# ===== Stage 1: Build Stage =====
FROM node:20-alpine AS builder

# Install Python and build dependencies for Swiss Ephemeris
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    libc-dev \
    libffi-dev \
    openssl-dev \
    python3-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ===== Stage 2: Production Stage =====
FROM node:20-alpine

# Install Python runtime for Swiss Ephemeris
RUN apk add --no-cache \
    python3 \
    py3-pip

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install Swiss Ephemeris Python package
RUN pip3 install --no-cache-dir pyswisseph

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nestjs:nodejs logs

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
```

### 1.2 Docker Compose

**`docker-compose.yml`:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: astralink-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - astralink-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: astralink-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - astralink-network

  # Backend Application
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: astralink-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
    volumes:
      - ./backend/logs:/app/logs
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - astralink-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: astralink-nginx
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    networks:
      - astralink-network

  # Certbot for SSL
  certbot:
    image: certbot/certbot
    container_name: astralink-certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  certbot_www:
    driver: local
  certbot_conf:
    driver: local

networks:
  astralink-network:
    driver: bridge
```

### 1.3 Nginx Configuration

**`nginx/nginx.conf`:**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name api.astralink.app;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name api.astralink.app;

        ssl_certificate /etc/letsencrypt/live/api.astralink.app/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.astralink.app/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=auth_limit burst=10 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend;
            access_log off;
        }
    }
}
```

---

## 🔄 2. CI/CD Pipeline (GitHub Actions)

### 2.1 Backend CI/CD

**`.github/workflows/backend-deploy.yml`:**

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, dev]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/backend

jobs:
  test:
    name: Test Backend
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Lint code
        working-directory: ./backend
        run: npm run lint

      - name: Type check
        working-directory: ./backend
        run: npm run build

      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: test-jwt-secret-for-ci-only
          NODE_ENV: test

      - name: Test coverage
        working-directory: ./backend
        run: npm run test:cov

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend

  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev')

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT || 22 }}
          script: |
            cd /opt/astralink

            # Pull latest images
            docker compose pull backend

            # Run database migrations
            docker compose run --rm backend npm run prisma:migrate:deploy

            # Restart services with zero downtime
            docker compose up -d --no-deps backend

            # Clean up old images
            docker image prune -f

            # Verify deployment
            sleep 10
            curl -f http://localhost:3000/health || exit 1

      - name: Notify deployment status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Backend deployment to production: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2.2 Frontend CI/CD (iOS)

**`.github/workflows/ios-deploy.yml`:**

```yaml
name: iOS CI/CD

on:
  push:
    branches: [main, dev]
    paths:
      - 'frontend/**'
      - '.github/workflows/ios-deploy.yml'
  pull_request:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  test:
    name: Test Frontend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Lint code
        working-directory: ./frontend
        run: npm run lint

      - name: Type check
        working-directory: ./frontend
        run: npx tsc --noEmit

      - name: Run tests
        working-directory: ./frontend
        run: npm test -- --passWithNoTests

  build-ios:
    name: Build iOS App
    runs-on: macos-latest
    needs: test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Configure environment
        working-directory: ./frontend
        run: |
          cat > .env.production << EOF
          EXPO_PUBLIC_API_URL=${{ secrets.PRODUCTION_API_URL }}
          EXPO_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
          EOF

      - name: Build iOS App (TestFlight)
        working-directory: ./frontend
        run: |
          eas build --platform ios --profile production --non-interactive
        env:
          EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}
          EXPO_APPLE_APP_PASSWORD: ${{ secrets.EXPO_APPLE_APP_PASSWORD }}

      - name: Submit to TestFlight
        if: github.ref == 'refs/heads/main'
        working-directory: ./frontend
        run: |
          eas submit --platform ios --latest --non-interactive

      - name: Notify build status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'iOS build for TestFlight: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📦 3. Deployment Scripts

### 3.1 Initial VPS Setup Script

**`scripts/vps-setup.sh`:**

```bash
#!/bin/bash
set -e

echo "🚀 AstraLink VPS Setup Script"
echo "=============================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for local development/debugging)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python for Swiss Ephemeris
echo "🐍 Installing Python..."
sudo apt install -y python3 python3-pip python3-dev

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/astralink
sudo chown $USER:$USER /opt/astralink
cd /opt/astralink

# Clone repository (you'll need to set this up with deploy keys)
echo "📥 Repository setup..."
echo "Please set up your GitHub deploy keys and clone the repository manually:"
echo "git clone git@github.com:YOUR_ORG/astralink.git ."

# Create logs directory
mkdir -p backend/logs

# Install fail2ban for security
echo "🔒 Installing fail2ban..."
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# Setup automatic security updates
echo "🔒 Setting up automatic security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Create .env file with production credentials"
echo "2. Run: ./scripts/deploy.sh"
```

### 3.2 Deployment Script

**`scripts/deploy.sh`:**

```bash
#!/bin/bash
set -e

echo "🚀 Deploying AstraLink to Production"
echo "===================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Load environment variables
source .env

# Pull latest code (if needed)
if [ "$1" == "--pull" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker compose pull

# Build and start services
echo "🏗️  Building and starting services..."
docker compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose exec -T backend npm run prisma:migrate:deploy

# Run database seeding (if needed)
if [ "$1" == "--seed" ]; then
    echo "🌱 Seeding database..."
    docker compose exec -T backend npm run prisma:seed
fi

# Setup SSL certificates (first time only)
if [ ! -d "nginx/ssl" ]; then
    echo "🔒 Setting up SSL certificates..."
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        --email admin@astralink.app \
        --agree-tos \
        --no-eff-email \
        -d api.astralink.app
fi

# Restart nginx to apply SSL
docker compose restart nginx

# Check health
echo "🏥 Checking health..."
sleep 5
curl -f http://localhost:3000/health || {
    echo "❌ Health check failed!"
    docker compose logs backend
    exit 1
}

echo "✅ Deployment complete!"
echo ""
echo "Services running:"
docker compose ps
```

### 3.3 Backup Script

**`scripts/backup.sh`:**

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/astralink"
DATE=$(date +%Y%m%d_%H%M%S)

echo "💾 Creating backup: $DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
echo "📦 Backing up database..."
docker compose exec -T postgres pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup Redis data
echo "📦 Backing up Redis..."
docker compose exec -T redis redis-cli --rdb /data/dump.rdb save
docker cp astralink-redis:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Backup environment files
echo "📦 Backing up configuration..."
cp .env "$BACKUP_DIR/env_$DATE"

# Cleanup old backups (keep last 30 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete

echo "✅ Backup complete: $BACKUP_DIR"
```

---

## 🔐 4. Environment Variables Setup

### 4.1 Production .env Template

**`.env.production.template`:**

```bash
# ===== Node Environment =====
NODE_ENV=production
PORT=3000

# ===== Database =====
DB_USER=astralink_prod
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=astralink_prod
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}

# ===== Redis =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# ===== JWT =====
JWT_SECRET=CHANGE_ME_MINIMUM_64_CHARS_JWT_SECRET_FOR_PRODUCTION
JWT_EXPIRES_IN=7d

# ===== Supabase =====
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# ===== AI Providers =====
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...

# ===== Logging =====
LOG_LEVEL=info

# ===== CORS =====
CORS_ORIGIN=https://yourdomain.com,exp://127.0.0.1:19000

# ===== Sentry (Optional) =====
SENTRY_DSN=https://...@sentry.io/...

# ===== Domain =====
API_DOMAIN=api.astralink.app
```

---

## 📱 5. iOS/Expo Configuration

### 5.1 EAS Build Configuration

**`frontend/eas.json`:**

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "bundler": "metro",
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.astralink.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      }
    }
  }
}
```

---

## 🔍 6. Monitoring & Observability

### 6.1 Health Check Endpoint

Already implemented in `backend/src/app.controller.ts`

### 6.2 Prometheus Metrics (Optional)

Add to `docker-compose.yml`:

```yaml
  prometheus:
    image: prom/prometheus:latest
    container_name: astralink-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - astralink-network

  grafana:
    image: grafana/grafana:latest
    container_name: astralink-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - astralink-network
```

---

## 📋 7. Checklist для развертывания

### Pre-deployment:
- [ ] VPS подготовлен (минимум 2GB RAM, 20GB SSD)
- [ ] Домен настроен (A-запись на IP сервера)
- [ ] GitHub Actions secrets настроены
- [ ] Supabase проект создан
- [ ] API ключи получены (OpenAI, DeepSeek, Claude)
- [ ] Apple Developer Account готов для TestFlight

### Initial Deployment:
- [ ] Запущен `vps-setup.sh`
- [ ] Создан `.env` файл с production credentials
- [ ] SSL сертификаты установлены
- [ ] Запущен `deploy.sh --seed`
- [ ] Проверен health check
- [ ] Настроены cron jobs для backup

### iOS Deployment:
- [ ] EAS CLI установлен
- [ ] `eas.json` настроен
- [ ] Apple certificates настроены
- [ ] Build запущен: `eas build --platform ios --profile production`
- [ ] Приложение отправлено в TestFlight

### Post-deployment:
- [ ] Мониторинг настроен (Sentry/Grafana)
- [ ] Backups протестированы
- [ ] Load testing проведён
- [ ] Документация обновлена

---

## 🆘 8. Troubleshooting

### Проблема: Swiss Ephemeris не работает
```bash
# Проверить установку Python в контейнере
docker compose exec backend python3 -c "import swisseph; print(swisseph.version())"

# Переустановить
docker compose exec backend pip3 install --force-reinstall pyswisseph
```

### Проблема: Database migration fails
```bash
# Проверить подключение к БД
docker compose exec backend npm run prisma:studio

# Сбросить и пересоздать
docker compose exec backend npm run prisma:migrate:reset
```

### Проблема: SSL сертификаты не обновляются
```bash
# Принудительно обновить
docker compose run --rm certbot renew --force-renewal

# Проверить срок действия
docker compose run --rm certbot certificates
```

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

**Автор:** Claude AI
**Последнее обновление:** 2025-11-23
