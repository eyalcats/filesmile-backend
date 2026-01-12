#!/bin/bash

# FileSmile Docker Entrypoint
# Handles database initialization for SQLite or PostgreSQL

if [[ "$DATABASE_URL" == sqlite* ]]; then
    DB_DIR="/app/db"
    DB_FILE="$DB_DIR/filesmile.db"
    SEED_DB="/app/db-seed/filesmile.db"

    mkdir -p "$DB_DIR"

    if [ ! -f "$DB_FILE" ] && [ -f "$SEED_DB" ]; then
        echo "First run detected - copying seed database..."
        cp "$SEED_DB" "$DB_FILE"
        echo "Seed database copied successfully"
    elif [ ! -f "$DB_FILE" ]; then
        echo "No database found - will be created on startup"
    else
        echo "Existing database found - preserving data"
    fi
else
    echo "Using PostgreSQL database - tables will be created on startup"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8002
