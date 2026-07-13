#!/bin/bash
# ──────────────────────────────────────────────
# 30-0 RPL — Deployment Script
# ──────────────────────────────────────────────
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh          # Docker deployment (SQLite)
#   ./deploy.sh --node   # Direct Node.js deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 30-0 RPL — Deployment${NC}"
echo ""

# Check for .env.production
if [ ! -f .env.production ]; then
  echo -e "${RED}❌ .env.production not found!${NC}"
  echo -e "${YELLOW}   Create it from .env.production.example:${NC}"
  echo "   cp .env.production.example .env.production"
  echo "   Then edit it with your values."
  exit 1
fi

# Check for TELEGRAM_BOT_TOKEN in .env.production
if ! grep -q "TELEGRAM_BOT_TOKEN=.\+" .env.production; then
  echo -e "${RED}❌ TELEGRAM_BOT_TOKEN is not set in .env.production!${NC}"
  exit 1
fi

MODE="docker"
if [ "$1" = "--node" ]; then
  MODE="node"
fi

echo -e "Mode: ${YELLOW}${MODE}${NC}"
echo ""

# ─── Docker Deployment ───
if [ "$MODE" = "docker" ]; then
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "   Install it: https://docs.docker.com/engine/install/"
    exit 1
  fi

  if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
  fi

  echo -e "${YELLOW}📦 Building Docker image...${NC}"
  docker build -f Dockerfile.sqlite -t 30-0-app .

  echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
  docker compose -f docker-compose.simple.yml down 2>/dev/null || true

  echo -e "${YELLOW}🚀 Starting app...${NC}"
  docker compose -f docker-compose.simple.yml up -d

  echo ""
  echo -e "${GREEN}✅ App is running!${NC}"
  echo "   URL: http://localhost:3000"
  echo ""
  echo -e "Useful commands:"
  echo "   docker compose -f docker-compose.simple.yml logs -f app   # View logs"
  echo "   docker compose -f docker-compose.simple.yml down           # Stop"
  echo "   docker compose -f docker-compose.simple.yml restart        # Restart"

# ─── Direct Node.js Deployment ───
elif [ "$MODE" = "node" ]; then
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "   Install it: https://nodejs.org/"
    exit 1
  fi

  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ required (current: $(node -v))${NC}"
    exit 1
  fi

  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install

  echo -e "${YELLOW}🔧 Switching to SQLite schema...${NC}"
  cp prisma/schema.sqlite.prisma prisma/schema.prisma
  npx prisma generate

  echo -e "${YELLOW}🏗️  Building app...${NC}"
  export NODE_ENV=production
  npm run build

  # Create data directory
  mkdir -p data

  echo -e "${YELLOW}🌱 Seeding database...${NC}"
  export DATABASE_URL="file:$(pwd)/data/production.db"
  npx prisma db push
  npx tsx prisma/seed.ts

  echo ""
  echo -e "${GREEN}✅ Build complete!${NC}"
  echo ""
  echo -e "Start the app with PM2 (recommended):"
  echo "   npm install -g pm2"
  echo "   pm2 start .next/standalone/server.js --name 30-0-app"
  echo "   pm2 save && pm2 startup"
  echo ""
  echo -e "Or start directly:"
  echo "   DATABASE_URL=\"file:$(pwd)/data/production.db\" NODE_ENV=production node .next/standalone/server.js"
  echo ""
  echo -e "For reverse proxy, configure nginx to forward to port 3000"
fi
