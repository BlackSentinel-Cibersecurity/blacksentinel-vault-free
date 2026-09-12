#!/bin/bash
set -e

echo "Starting BlackSentinel Vault..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Run ./scripts/setup.sh first."
    exit 1
fi

# Check if database is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "Starting database..."
    docker-compose up -d postgres redis
    sleep 5
fi

# Start application
echo "Starting application..."
npm run dev
