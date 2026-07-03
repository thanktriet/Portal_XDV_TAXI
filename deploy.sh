#!/bin/bash
# Deploy script for Portal XDV Taxi
# Run on VPS: bash deploy.sh
# IMPORTANT: Create .env files manually before running (see README)

set -e

APP_DIR="/www/wwwroot/xdv.vinfastnamthang.vn"
REPO="https://github.com/thanktriet/Portal_XDV_TAXI.git"
DB_PORT=5433

echo "=== Portal XDV Taxi - Deploy ==="

# Clone or pull
if [ -d "$APP_DIR/.git" ]; then
  echo ">> Pulling latest code..."
  cd "$APP_DIR"
  git pull origin main
else
  echo ">> Cloning repository..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# Check env files exist
if [ ! -f "$APP_DIR/apps/backend/.env" ]; then
  echo "ERROR: apps/backend/.env not found. Create it first!"
  exit 1
fi
if [ ! -f "$APP_DIR/apps/frontend/.env.local" ]; then
  echo "ERROR: apps/frontend/.env.local not found. Create it first!"
  exit 1
fi

# Install dependencies
echo ">> Installing dependencies..."
npm install --legacy-peer-deps

# Create database if not exists
echo ">> Setting up database..."
sudo -u postgres psql -p $DB_PORT -tc "SELECT 1 FROM pg_database WHERE datname = 'portal_xdv'" | grep -q 1 || \
sudo -u postgres psql -p $DB_PORT -c "CREATE DATABASE portal_xdv"

# Generate Prisma client & push schema
echo ">> Running Prisma..."
cd "$APP_DIR/apps/backend"
npx prisma generate
npx prisma db push --accept-data-loss

# Seed database (first time only)
if [ ! -f "$APP_DIR/.seeded" ]; then
  echo ">> Seeding database..."
  npx ts-node prisma/seed/index.ts && touch "$APP_DIR/.seeded"
fi

# Build backend
echo ">> Building backend..."
cd "$APP_DIR/apps/backend"
npx nest build

# Build frontend
echo ">> Building frontend..."
cd "$APP_DIR/apps/frontend"
npx next build

# Setup PM2
echo ">> Starting/Restarting PM2 processes..."
cd "$APP_DIR"

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'xdv-backend',
      cwd: './apps/backend',
      script: 'dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'xdv-frontend',
      cwd: './apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
EOF

# Start or restart PM2 (dùng npx pm2 vì pm2 có thể không nằm trong PATH của shell non-interactive)
npx pm2 delete xdv-backend 2>/dev/null || true
npx pm2 delete xdv-frontend 2>/dev/null || true
npx pm2 start ecosystem.config.js
npx pm2 save

echo ""
echo "=== Deploy complete! ==="
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3002"
echo ""
echo ">> Configure Nginx reverse proxy if not done yet."
