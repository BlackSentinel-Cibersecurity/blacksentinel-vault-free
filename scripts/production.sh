#!/bin/bash
set -e

echo "Starting BlackSentinel Vault in production mode..."

# Build application
echo "Building application..."
npm run build

# Start with Docker Compose
echo "Starting services..."
docker-compose up -d --build

echo ""
echo "BlackSentinel Vault is running!"
echo "Access at: http://localhost:3000"
echo ""
echo "View logs: docker-compose logs -f app"
echo "Stop: docker-compose down"
