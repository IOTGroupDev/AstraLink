#!/bin/sh
set -eu

if [ "${SKIP_PRISMA_MIGRATIONS:-false}" = "true" ]; then
  echo "Skipping Prisma migrations because SKIP_PRISMA_MIGRATIONS=true"
else
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Starting AstraLink backend..."
exec node dist/main.js
