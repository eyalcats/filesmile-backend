#!/bin/bash

# FileSmile Docker Entrypoint
# Handles database initialization on first run

DB_DIR="/app/db"
DB_FILE="$DB_DIR/filesmile.db"
SEED_DB="/app/db-seed/filesmile.db"

# Create db directory if it doesn't exist
mkdir -p "$DB_DIR"

# If database doesn't exist but seed does, copy seed database
if [ ! -f "$DB_FILE" ] && [ -f "$SEED_DB" ]; then
    echo "First run detected - copying seed database..."
    cp "$SEED_DB" "$DB_FILE"
    echo "Seed database copied successfully"
elif [ ! -f "$DB_FILE" ]; then
    echo "No database found - will be created on startup"
else
    echo "Existing database found - preserving data"
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8002
