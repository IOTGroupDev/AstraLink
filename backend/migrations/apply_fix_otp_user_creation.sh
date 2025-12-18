#!/bin/bash
# Apply fix_otp_user_creation migration to the database

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📝 Applying migration: fix_otp_user_creation${NC}"

# Get DATABASE_URL from environment
if [ -f ../backend/.env ]; then
  source ../backend/.env
elif [ -f .env ]; then
  source .env
elif [ -f ../.env ]; then
  source ../.env
fi

# Try DIRECT_URL first, then fallback to DATABASE_URL
DB_URL="${DIRECT_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL or DIRECT_URL not set${NC}"
  echo "Please set DATABASE_URL or DIRECT_URL environment variable"
  exit 1
fi

echo -e "${YELLOW}Database URL found${NC}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql command not found${NC}"
  echo "Please install PostgreSQL client tools"
  exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/fix_otp_user_creation.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
  exit 1
fi

# Apply migration
echo -e "${YELLOW}Applying migration...${NC}"
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Migration applied successfully!${NC}"
  echo ""
  echo -e "${GREEN}The OTP authentication should now work correctly.${NC}"
  echo -e "${GREEN}Users will automatically get a profile in public.users when they sign up via OTP.${NC}"
else
  echo -e "${RED}❌ Migration failed${NC}"
  exit 1
fi
