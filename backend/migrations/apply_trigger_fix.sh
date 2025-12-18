#!/bin/bash
# Fix trigger placement: move from public.users to auth.users

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Fixing trigger placement (public.users → auth.users)${NC}"

# Get DATABASE_URL
if [ -f ../backend/.env ]; then
  source ../backend/.env
elif [ -f .env ]; then
  source .env
elif [ -f ../.env ]; then
  source ../.env
fi

DB_URL="${DIRECT_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL or DIRECT_URL not set${NC}"
  exit 1
fi

# Check psql
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql not found${NC}"
  exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/fix_trigger_placement.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}Applying migration...${NC}"
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Trigger fixed successfully!${NC}"
  echo ""
  echo -e "${GREEN}Verifying...${NC}"
  psql "$DB_URL" -c "SELECT trigger_name, event_object_schema, event_object_table FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';"
  echo ""
  echo -e "${GREEN}Expected: event_object_schema='auth', event_object_table='users'${NC}"
else
  echo -e "${RED}❌ Migration failed${NC}"
  exit 1
fi
