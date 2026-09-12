#!/bin/bash
set -e

echo "=========================================="
echo "BlackSentinel Vault - Setup Script"
echo "=========================================="

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ is required"
    exit 1
fi

echo "Node.js version: $(node -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Copy .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cat > .env << EOF
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blacksentinel_vault
DATABASE_SSL=false
REDIS_URL=redis://localhost:6379
MASTER_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=604800
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUDIT_LOG_ENABLED=true
SESSION_RECORDING_ENABLED=true
AI_ENGINE_ENABLED=true
ENCRYPTION_AT_REST_ENABLED=true
EOF
fi

# Start database
echo ""
echo "Starting database..."
docker-compose up -d postgres redis
sleep 5

# Run migrations
echo ""
echo "Running database migrations..."
npm run db:migrate

# Seed data
echo ""
echo "Seeding database..."
npm run db:seed

echo ""
echo "=========================================="
echo "Setup complete!"
echo ""
echo "Start the application with:"
echo "  npm run dev"
echo ""
echo "Access at: http://localhost:3000"
echo "Default credentials: admin@blacksentinel.com / Admin@123456"
echo "=========================================="
