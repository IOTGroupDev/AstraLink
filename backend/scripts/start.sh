#!/bin/sh
set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting AstraLink backend..."
exec node dist/main.js
