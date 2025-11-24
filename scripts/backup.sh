#!/bin/bash

#######################################
# AstraLink Backup Script
# Automated backups of Redis and uploads
# Note: PostgreSQL is managed by Supabase with automatic backups
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
echo "ℹ️  Database: Managed by Supabase (automatic backups)"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"/{redis,uploads}

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)

# Change to app directory
cd "$APP_DIR"

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
  "note": "Database is managed by Supabase with automatic backups",
  "backups": {
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
echo "Recent Redis backups:"
ls -lh "$BACKUP_DIR/redis" 2>/dev/null | tail -5 || echo "  No backups yet"
echo ""
echo "Recent upload backups:"
ls -lh "$BACKUP_DIR/uploads" 2>/dev/null | tail -5 || echo "  No backups yet"
echo ""

echo "✅ Backup completed successfully!"
echo ""
echo "To restore Redis:"
echo "  docker cp $BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb astralink-redis:/data/dump.rdb"
echo "  docker-compose restart redis"
echo ""
echo "To restore uploads:"
echo "  tar -xzf $BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz -C $APP_DIR/backend"
echo ""
echo "Database backups are managed by Supabase:"
echo "  https://supabase.com/dashboard/project/[PROJECT-ID]/database/backups"
echo ""
