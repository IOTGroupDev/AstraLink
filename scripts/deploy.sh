#!/bin/bash

#######################################
# AstraLink Deployment Script
# Deploy updates to production
#######################################

set -e

APP_DIR="${APP_DIR:-/opt/astralink}"
BACKUP_DIR="${BACKUP_DIR:-/opt/astralink/backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"

echo "🚀 AstraLink Deployment"
echo "======================="
echo "Environment: $ENVIRONMENT"
echo "App Directory: $APP_DIR"
echo ""

# Change to app directory
cd "$APP_DIR"

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch --all
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"

if [ -n "${GIT_COMMIT:-}" ]; then
  echo "Checking out commit: $GIT_COMMIT"
  git checkout "$GIT_COMMIT"
else
  echo "Pulling latest from main branch..."
  git pull origin main
fi

NEW_COMMIT=$(git rev-parse HEAD)
echo "New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
  echo "✅ Already up to date"
else
  echo "✅ Updated from $CURRENT_COMMIT to $NEW_COMMIT"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo ""
echo "💾 Backing up database..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-astralink} | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
echo "✅ Database backed up to $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete

# Backup Redis (if needed)
echo ""
echo "💾 Backing up Redis..."
docker-compose exec -T redis redis-cli SAVE
docker cp astralink-redis:/data/dump.rdb "$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb" 2>/dev/null || true
echo "✅ Redis backed up"

# Build new images
echo ""
echo "🔨 Building new images..."
docker-compose build --no-cache backend

# Run database migrations (before restarting)
echo ""
echo "🗄️  Running database migrations..."
docker-compose run --rm backend npx prisma migrate deploy

# Deploy with zero downtime
echo ""
echo "🔄 Deploying new version..."

if [ "$ENVIRONMENT" == "production" ]; then
  # Production: zero-downtime deployment
  echo "Using zero-downtime deployment strategy..."

  # Start new containers without stopping old ones
  docker-compose --profile production up -d --no-deps --scale backend=2 backend

  # Wait for new containers to be healthy
  echo "Waiting for new containers to be healthy..."
  sleep 10

  for i in {1..30}; do
    if docker-compose exec -T backend node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
      echo "✅ New containers are healthy"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "❌ Health check failed after 30 attempts"
      echo "Rolling back..."
      docker-compose --profile production up -d --scale backend=1 backend
      exit 1
    fi
    echo "Attempt $i/30 - waiting for health check..."
    sleep 2
  done

  # Scale down to single instance
  docker-compose --profile production up -d --scale backend=1 backend

else
  # Staging/Development: simple restart
  docker-compose up -d --no-deps backend
fi

# Restart nginx to pick up any config changes
echo ""
echo "🔄 Restarting nginx..."
docker-compose --profile production restart nginx 2>/dev/null || echo "Nginx not running in this environment"

# Cleanup old images
echo ""
echo "🧹 Cleaning up old images..."
docker image prune -f

# Show status
echo ""
echo "📊 Deployment status:"
docker-compose ps

# Verify deployment
echo ""
echo "🔍 Verifying deployment..."
sleep 5

if docker-compose exec -T backend node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  echo "Rolling back to previous version..."

  git checkout "$CURRENT_COMMIT"
  docker-compose up -d --no-deps backend

  exit 1
fi

# Show logs
echo ""
echo "📝 Recent logs:"
docker-compose logs --tail=50 backend

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Deployed commit: $NEW_COMMIT"
echo "Backup location: $BACKUP_DIR"
echo ""
echo "To rollback: cd $APP_DIR && git checkout $CURRENT_COMMIT && docker-compose up -d --no-deps backend"
echo ""
