#!/bin/bash

if [ "$1" = "local" ]; then
    echo "Switching to local database..."
    cp .env.local .env
    echo "Now using local database"
elif [ "$1" = "shared" ]; then
    echo "Switching to shared database..."
    cp .env.shared .env
    echo "Now using shared database"
else
    echo "Usage: ./switch-db.sh [local|shared]"
    echo "  local  - Use local PostgreSQL database"
    echo "  shared - Use shared Railway database"
    exit 1
fi

# Display current database URL (with credentials hidden)
echo "Current DATABASE_URL (hidden credentials):"
grep DATABASE_URL .env | sed 's/:[^:]*@/@/g' 