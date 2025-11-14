#!/bin/bash
# Apply migration SQL directly to the database

# Get DATABASE_URL from environment or use default
if [ -f .env.migration ]; then
  source .env.migration
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

echo "📝 Applying migration: add_ai_generated_at"
echo "Database: $DATABASE_URL"

# Apply migration SQL
psql "$DATABASE_URL" -f prisma/migrations/*/migration.sql 2>&1

echo "✅ Migration applied"
