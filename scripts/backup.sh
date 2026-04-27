#!/bin/bash

#######################################
# AstraLink Backup Script
# Automated backups of Redis and optional logical Supabase DB dumps
#######################################

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/astralink}"
BACKUP_DIR="${BACKUP_DIR:-/opt/astralink/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PROJECT_REF="${PROJECT_REF:-ayoucajwdyinyhamousz}"
STORAGE_BUCKETS="${STORAGE_BUCKETS:-user-photos chat-media}"

echo "💾 AstraLink Backup"
echo "=================="
echo "Backup Directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo ""
echo "ℹ️  Supabase project: $PROJECT_REF"
echo "ℹ️  Storage buckets: $STORAGE_BUCKETS"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"/{redis,db}

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
DB_DUMP_STATUS="skipped"
DB_DUMP_REASON="SUPABASE_DB_URL not provided"
DB_DUMP_PATH=""
STORAGE_BACKUP_STATUS="skipped"
STORAGE_BACKUP_REASON="SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not provided"
STORAGE_BACKUP_PATH=""

# Change to app directory
cd "$APP_DIR"

run_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  return 127
}

# Backup Redis
echo ""
echo "📦 Backing up Redis..."
if run_compose exec -T redis redis-cli SAVE >/dev/null 2>&1; then
  sleep 2
  docker cp astralink-redis:/data/dump.rdb "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" 2>/dev/null || true
else
  echo "⚠️  Redis backup skipped (redis container or compose is unavailable)"
fi

if [ -f "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" ]; then
  REDIS_SIZE=$(du -h "$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb" | cut -f1)
  echo "✅ Redis backup created: redis_${TIMESTAMP}.rdb ($REDIS_SIZE)"
else
  echo "⚠️  Redis backup skipped (dump.rdb not found)"
fi

# Backup Supabase database logically when connection string is available
echo ""
echo "📦 Backing up Supabase database..."

run_supabase_cli() {
  if command -v supabase >/dev/null 2>&1; then
    supabase "$@"
    return
  fi

  if command -v npx >/dev/null 2>&1; then
    npx --yes supabase "$@"
    return
  fi

  return 127
}

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    DB_DUMP_REASON="docker is not installed; supabase db dump requires Docker"
    echo "⚠️  Database backup skipped ($DB_DUMP_REASON)"
  elif ! docker info >/dev/null 2>&1; then
    DB_DUMP_REASON="docker daemon is not available"
    echo "⚠️  Database backup skipped ($DB_DUMP_REASON)"
  else
    DB_DUMP_DIR="$BACKUP_DIR/db/db_${TIMESTAMP}"
    mkdir -p "$DB_DUMP_DIR"

    if run_supabase_cli db dump --db-url "$SUPABASE_DB_URL" -f "$DB_DUMP_DIR/roles.sql" --role-only &&
      run_supabase_cli db dump --db-url "$SUPABASE_DB_URL" -f "$DB_DUMP_DIR/schema.sql" &&
      run_supabase_cli db dump --db-url "$SUPABASE_DB_URL" -f "$DB_DUMP_DIR/data.sql" --use-copy --data-only; then
      DB_DUMP_STATUS="created"
      DB_DUMP_REASON=""
      DB_DUMP_PATH="db/db_${TIMESTAMP}"
      DB_SIZE=$(du -sh "$DB_DUMP_DIR" | cut -f1)
      echo "✅ Database backup created: $DB_DUMP_PATH ($DB_SIZE)"
    else
      DB_DUMP_REASON="supabase db dump failed"
      echo "⚠️  Database backup failed; keeping Redis backup and manifest"
    fi
  fi
else
  echo "⚠️  Database backup skipped ($DB_DUMP_REASON)"
fi

# Backup Supabase storage objects when admin credentials are available
echo ""
echo "📦 Backing up Supabase storage..."

if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  if [ ! -d "$APP_DIR/backend" ]; then
    STORAGE_BACKUP_REASON="backend directory not found"
    echo "⚠️  Storage backup skipped ($STORAGE_BACKUP_REASON)"
  else
    mkdir -p "$BACKUP_DIR/storage"
    STORAGE_BACKUP_DIR="$BACKUP_DIR/storage/storage_${TIMESTAMP}"

    if (
      cd "$APP_DIR/backend" &&
      STORAGE_BACKUP_DIR="$STORAGE_BACKUP_DIR" \
      STORAGE_BUCKETS="$STORAGE_BUCKETS" \
      npx ts-node src/scripts/backup.storage.ts
    ); then
      STORAGE_BACKUP_STATUS="created"
      STORAGE_BACKUP_REASON=""
      STORAGE_BACKUP_PATH="storage/storage_${TIMESTAMP}"
      STORAGE_SIZE=$(du -sh "$STORAGE_BACKUP_DIR" | cut -f1)
      echo "✅ Storage backup created: $STORAGE_BACKUP_PATH ($STORAGE_SIZE)"
    else
      STORAGE_BACKUP_REASON="storage backup script failed"
      echo "⚠️  Storage backup failed; see logs above"
    fi
  fi
else
  echo "⚠️  Storage backup skipped ($STORAGE_BACKUP_REASON)"
fi

# Create manifest
echo ""
echo "📄 Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_${TIMESTAMP}.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$DATE",
  "project_ref": "$PROJECT_REF",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "note": "Supabase Storage objects are not included in database backups",
  "backups": {
    "redis": "redis/redis_${TIMESTAMP}.rdb",
    "database": {
      "status": "$DB_DUMP_STATUS",
      "path": "$DB_DUMP_PATH",
      "reason": "$DB_DUMP_REASON"
    },
    "storage": {
      "status": "$STORAGE_BACKUP_STATUS",
      "path": "$STORAGE_BACKUP_PATH",
      "reason": "$STORAGE_BACKUP_REASON"
    }
  },
  "storage": {
    "buckets": ["user-photos", "chat-media"],
    "note": "Storage objects are exported separately from the database dump"
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
find "$BACKUP_DIR/db" -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
find "$BACKUP_DIR/storage" -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
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
echo "Recent database backups:"
find "$BACKUP_DIR/db" -mindepth 1 -maxdepth 1 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | tail -5 || echo "  No backups yet"
echo ""
echo "Recent storage backups:"
find "$BACKUP_DIR/storage" -mindepth 1 -maxdepth 1 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | tail -5 || echo "  No backups yet"
echo ""

echo "✅ Backup completed successfully!"
echo ""
echo "To restore Redis:"
echo "  docker cp $BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb astralink-redis:/data/dump.rdb"
echo "  docker-compose restart redis"
echo ""
if [ "$DB_DUMP_STATUS" = "created" ]; then
  echo "To restore the database into a new Supabase project:"
  echo "  1. See docs/SUPABASE_BACKUP_RESTORE_PLAYBOOK.md"
  echo "  2. Use roles.sql + schema.sql + data.sql from $BACKUP_DIR/$DB_DUMP_PATH"
  echo ""
fi
if [ "$STORAGE_BACKUP_STATUS" = "created" ]; then
  echo "Storage objects were exported to:"
  echo "  $BACKUP_DIR/$STORAGE_BACKUP_PATH"
  echo ""
fi
echo "Supabase dashboard backups:"
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/database/backups"
echo ""
echo "Important:"
echo "  Storage objects in buckets [$STORAGE_BUCKETS] are NOT included in DB backups."
echo "  Export them separately if media preservation matters."
echo ""
