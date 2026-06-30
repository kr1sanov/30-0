#!/usr/bin/env bash
# ──────────────────────────────────────────────
# 30-0 RPL — Deploy Script
# ──────────────────────────────────────────────
# Usage:
#   ./scripts/deploy.sh vercel    # Deploy to Vercel
#   ./scripts/deploy.sh docker    # Build & run Docker
#   ./scripts/deploy.sh supabase  # Setup Supabase
#   ./scripts/deploy.sh seed      # Seed the database
#   ./scripts/deploy.sh migrate   # Run Prisma migrations

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[30-0]${NC} $1"; }
ok() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Vercel Deploy ───
deploy_vercel() {
  log "Deploying to Vercel..."
  
  # Check Vercel CLI
  if ! command -v vercel &> /dev/null; then
    warn "Vercel CLI not found. Installing..."
    npm i -g vercel
  fi
  
  cd "$PROJECT_DIR"
  
  # Generate Prisma client
  log "Generating Prisma client..."
  npx prisma generate
  
  # Deploy
  log "Running vercel deploy..."
  vercel --prod
  
  ok "Deployed to Vercel!"
  log "Set environment variables in Vercel Dashboard:"
  log "  DATABASE_URL = your Supabase pooled connection string"
  log "  DIRECT_URL   = your Supabase direct connection string"
}

# ─── Docker Deploy ───
deploy_docker() {
  log "Building Docker image..."
  
  cd "$PROJECT_DIR"
  
  # Build image
  docker build -t 30-0-rpl:latest .
  
  # Stop existing containers
  docker compose down 2>/dev/null || true
  
  # Start services
  docker compose up -d
  
  ok "Docker containers started!"
  log "App:    http://localhost:3000"
  log "DB:     localhost:5432"
  log "Logs:   docker compose logs -f app"
}

# ─── Supabase Setup ───
setup_supabase() {
  log "Setting up Supabase..."
  
  # Check Supabase CLI
  if ! command -v supabase &> /dev/null; then
    warn "Supabase CLI not found. Installing..."
    npm i -g supabase
  fi
  
  cd "$PROJECT_DIR"
  
  # Initialize Supabase
  log "Initializing Supabase..."
  supabase init
  
  log "Supabase initialized!"
  log ""
  log "Next steps:"
  log "  1. Create a project at https://supabase.com/dashboard"
  log "  2. Link your project: supabase link --project-ref <ref>"
  log "  3. Set DATABASE_URL and DIRECT_URL in .env.production"
  log "  4. Run migrations: ./scripts/deploy.sh migrate"
  log "  5. Seed the database: ./scripts/deploy.sh seed"
}

# ─── Run Migrations ───
run_migrate() {
  log "Running Prisma migrations..."
  cd "$PROJECT_DIR"
  
  # Check for DATABASE_URL
  if [ -z "${DATABASE_URL:-}" ]; then
    source .env.production 2>/dev/null || source .env 2>/dev/null || true
  fi
  
  npx prisma migrate deploy
  
  ok "Migrations applied!"
}

# ─── Seed Database ───
run_seed() {
  log "Seeding database..."
  cd "$PROJECT_DIR"
  
  # Check for DATABASE_URL
  if [ -z "${DATABASE_URL:-}" ]; then
    source .env.production 2>/dev/null || source .env 2>/dev/null || true
  fi
  
  bun run db:seed
  
  ok "Database seeded!"
}

# ─── Create Migration ───
create_migration() {
  log "Creating Prisma migration..."
  cd "$PROJECT_DIR"
  
  local name="${1:-init}"
  npx prisma migrate dev --name "$name"
  
  ok "Migration created: $name"
}

# ─── Main ───
case "${1:-}" in
  vercel)
    deploy_vercel
    ;;
  docker)
    deploy_docker
    ;;
  supabase)
    setup_supabase
    ;;
  migrate)
    run_migrate
    ;;
  seed)
    run_seed
    ;;
  migration)
    create_migration "${2:-init}"
    ;;
  *)
    echo "30-0 RPL — Deploy Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  vercel     Deploy to Vercel"
    echo "  docker     Build & run with Docker Compose"
    echo "  supabase   Setup Supabase project"
    echo "  migrate    Run Prisma migrations"
    echo "  seed       Seed the database"
    echo "  migration  Create a new Prisma migration"
    echo ""
    exit 1
    ;;
esac
