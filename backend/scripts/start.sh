#!/bin/sh
set -eu

if [ "${SKIP_PRISMA_MIGRATIONS:-true}" = "true" ]; then
  echo "Automatic migrations disabled; use the reviewed migration release step"
else
  echo "Running Prisma migrations..."
  if [ ! -x ./node_modules/.bin/prisma ]; then
    echo "Prisma CLI is excluded from the runtime image. Run the dedicated migrations image after baseline verification." >&2
    exit 1
  fi
  ./node_modules/.bin/prisma migrate deploy
fi

echo "Starting AstraLink backend..."
exec node dist/main.js
