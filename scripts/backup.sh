#!/bin/bash

#######################################
# AstraLink Backup Script
# Automated backups of database and Redis
#######################################

set -e

APP_DIR="${APP_DIR:-/opt/astralink}"
BACKUP_DIR="${BACKUP_DIR:-/opt/astralink/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "💾 AstraLink Backup"
echo "=================="
echo "Backup Directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"/{database,redis,uploads}

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)

# Change to app directory
cd "$APP_DIR"

# Backup PostgreSQL database
echo "📦 Backing up PostgreSQL database..."
docker-compose exec -T postgres pg_dump \
  -U ${POSTGRES_USER:-postgres} \
  -d ${POSTGRES_DB:-astralink} \
  --format=custom \
  --verbose \
  --file=/tmp/backup.dump 2>&1

docker cp astralink-postgres:/tmp/backup.dump "$BACKUP_DIR/database/db_${TIMESTAMP}.dump"
docker-compose exec -T postgres rm /tmp/backup.dump

# Compress the backup
gzip "$BACKUP_DIR/database/db_${TIMESTAMP}.dump"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/database/db_${TIMESTAMP}.dump.gz" | cut -f1)
echo "✅ Database backup created: db_${TIMESTAMP}.dump.gz ($BACKUP_SIZE)"

# Backup Redis
echo ""
echo "📦 Backing up Redis..."
docker-compose exec -T redis redis-cli SAVE

# Wait for save to complete
sleep 2

docker cp astralink-redis:/data/dump.rdb "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" 2>/dev/null || true

if [ -f "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" ]; then
  REDIS_SIZE=$(du -h "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" | cut -f1)
  echo "✅ Redis backup created: redis_${TIMESTAMP}.rdb ($REDIS_SIZE)"
else
  echo "⚠️  Redis backup skipped (dump.rdb not found)"
fi

# Backup uploaded files
echo ""
echo "📦 Backing up uploaded files..."
if [ -d "$APP_DIR/backend/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz" \
    -C "$APP_DIR/backend" uploads 2>/dev/null || true

  if [ -f "$BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz" ]; then
    UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz" | cut -f1)
    echo "✅ Uploads backup created: uploads_${TIMESTAMP}.tar.gz ($UPLOADS_SIZE)"
  else
    echo "⚠️  Uploads backup skipped (no files found)"
  fi
else
  echo "⚠️  Uploads directory not found"
fi

# Create manifest
echo ""
echo "📄 Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_${TIMESTAMP}.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$DATE",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "backups": {
    "database": "database/db_${TIMESTAMP}.dump.gz",
    "redis": "redis/redis_${TIMESTAMP}.rdb",
    "uploads": "uploads/uploads_${TIMESTAMP}.tar.gz"
  }
}
EOF
echo "✅ Manifest created"

# Cleanup old backups
echo ""
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."

# Count before cleanup
TOTAL_BEFORE=$(find "$BACKUP_DIR" -type f | wc -l)

# Delete old files
find "$BACKUP_DIR/database" -name "db_*.dump.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/redis" -name "redis_*.rdb" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/uploads" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "manifest_*.json" -mtime +$RETENTION_DAYS -delete

# Count after cleanup
TOTAL_AFTER=$(find "$BACKUP_DIR" -type f | wc -l)
DELETED=$((TOTAL_BEFORE - TOTAL_AFTER))

echo "✅ Deleted $DELETED old backup files"

# Show backup summary
echo ""
echo "📊 Backup Summary:"
echo "  Total backups: $TOTAL_AFTER files"
echo "  Disk usage: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""

# List recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR/database" | tail -5
echo ""

echo "✅ Backup completed successfully!"
echo ""
echo "To restore database:"
echo "  gunzip $BACKUP_DIR/database/db_${TIMESTAMP}.dump.gz"
echo "  docker cp $BACKUP_DIR/database/db_${TIMESTAMP}.dump astralink-postgres:/tmp/"
echo "  docker-compose exec postgres pg_restore -U postgres -d astralink --clean /tmp/db_${TIMESTAMP}.dump"
echo ""
