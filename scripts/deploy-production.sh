#!/bin/bash
# ──────────────────────────────────────────────
# 30-0 RPL — Production Deploy Script (runs on Jino)
# ──────────────────────────────────────────────
# Structure on Jino:
#   ~/domains/30-0.xn--p1ai/
#     app.js              <- Passenger entrypoint (starts standalone server)
#     .next/standalone/   <- Next.js standalone server
#       server.js
#       node_modules/
#       public/
#       .next/
#         static/         <- static assets (MUST be here)
#         server/         <- server chunks
#     prisma/             <- Prisma schema
#     tmp/restart.txt     <- triggers Passenger restart
#
# IMPORTANT: Passenger is configured through the Jino control panel,
# NOT through .htaccess. The .htaccess only has security headers,
# caching, and rewrite rules.
# ──────────────────────────────────────────────
set -euo pipefail

# Load nvm if available (needed for SSH non-interactive sessions)
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Also try common node paths on Jino shared hosting
if ! command -v node &> /dev/null; then
  for NODE_PATH in "$HOME/.nvm/versions/node/"*/bin; do
    if [ -d "$NODE_PATH" ]; then
      export PATH="$NODE_PATH:$PATH"
      break
    fi
  done
fi

# Resolve APP_DIR — use env var if set, otherwise default to Jino domain directory
APP_DIR="${APP_DIR:-$HOME/domains/30-0.xn--p1ai}"
APP_NAME="30-0-app"
HEALTH_URL="https://30-0.xn--p1ai/api/health"
BACKUP_COUNT=3

echo "=========================================="
echo "  30-0 RPL — Production Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""
echo "  APP_DIR: $APP_DIR"
echo "  Node.js: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "  Node path: $(which node 2>/dev/null || echo 'NOT FOUND')"
echo ""

# ─── Step 1: Pre-flight checks ───
echo "📋 Step 1: Pre-flight checks"

if [ ! -f /tmp/deploy.tar.gz ]; then
  echo "❌ No deployment package found at /tmp/deploy.tar.gz"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required (current: $(node -v))"
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "❌ APP_DIR does not exist: $APP_DIR"
  exit 1
fi

echo "✅ Pre-flight checks passed (Node $(node -v), APP_DIR exists)"

# ─── Step 2: Create backup ───
echo ""
echo "📦 Step 2: Creating backup"
cd "$APP_DIR"
mkdir -p logs
mkdir -p tmp

# Backup current standalone directory
if [ -d .next/standalone ]; then
  BACKUP_NAME="standalone-backup-$(date +%Y%m%d%H%M%S)"
  cp -r .next/standalone "$BACKUP_NAME"
  echo "✅ Backup created: $BACKUP_NAME"
  # Clean old backups (keep only last N)
  ls -dt standalone-backup-* 2>/dev/null | tail -n +$((BACKUP_COUNT + 1)) | xargs rm -rf 2>/dev/null || true
  echo "✅ Old backups cleaned (keeping last $BACKUP_COUNT)"
else
  echo "⚠️ No existing .next/standalone to backup"
fi

# ─── Step 3: Extract deployment ───
echo ""
echo "📂 Step 3: Extracting deployment package"
mkdir -p .next/standalone
tar -xzf /tmp/deploy.tar.gz -C .
rm -f /tmp/deploy.tar.gz

echo "✅ Deployment package extracted"
echo "   Structure after extraction:"
ls -la | head -15
ls -la .next/standalone/ | head -10
ls -la .next/standalone/.next/ 2>/dev/null | head -5 || echo "   (no .next inside standalone)"
echo "   app.js exists: $(test -f app.js && echo YES || echo NO)"
echo "   .htaccess exists: $(test -f .htaccess && echo YES || echo NO)"

# ─── Step 4: Ensure Passenger entrypoint ───
echo ""
echo "🔧 Step 4: Ensuring Passenger entrypoint (app.js)"

if [ ! -f app.js ]; then
  echo "⚠️ app.js not found in deployment package, creating..."
  cat > app.js << 'APPJS'
// Passenger entrypoint for 30-0 RPL
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
require(serverPath);
APPJS
  echo "✅ app.js created"
else
  echo "✅ app.js already exists"
fi

# ─── Step 5: Ensure .env file for database connection ───
echo ""
echo "🔧 Step 5: Checking .env file"

# The Next.js standalone server changes CWD to .next/standalone/
# We need DATABASE_URL available as an environment variable.
# Passenger sets env vars from the Jino control panel.
# Also check if .env exists at APP_DIR for the loadEnvFromFile() fallback.

if [ ! -f .env ]; then
  echo "⚠️ No .env file found at $APP_DIR/.env"
  echo "   Make sure DATABASE_URL is set in Jino control panel or create .env manually"
else
  echo "✅ .env file exists"
  # Verify DATABASE_URL is present
  if grep -q "^DATABASE_URL=" .env; then
    echo "✅ DATABASE_URL is configured in .env"
  else
    echo "⚠️ DATABASE_URL not found in .env"
  fi
fi

# ─── Step 6: Ensure Prisma client ───
echo ""
echo "🔧 Step 6: Ensuring Prisma client modules"

STANDALONE_NM=".next/standalone/node_modules"
mkdir -p "$STANDALONE_NM"

# Copy Prisma client from existing node_modules if available
if [ -d node_modules/.prisma ]; then
  cp -r node_modules/.prisma "$STANDALONE_NM/" 2>/dev/null || true
  echo "✅ .prisma client copied from node_modules"
fi
if [ -d node_modules/@prisma ]; then
  cp -r node_modules/@prisma "$STANDALONE_NM/" 2>/dev/null || true
  echo "✅ @prisma client copied from node_modules"
fi

# If Prisma client still missing, generate it
if [ ! -d "$STANDALONE_NM/.prisma" ]; then
  echo "⚠️ Prisma client not found, generating..."
  cp prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true
  npx prisma generate
  cp -r node_modules/.prisma "$STANDALONE_NM/" 2>/dev/null || true
  cp -r node_modules/@prisma "$STANDALONE_NM/" 2>/dev/null || true
  echo "✅ Prisma client generated and copied"
fi

# ─── Step 7: Database migration ───
echo ""
echo "🗄️ Step 7: Running database sync"
cp prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true
if [ -f .env ]; then
  npx prisma db push --accept-data-loss 2>/dev/null && echo "✅ Database schema synced" || echo "⚠️ Database sync warning (non-fatal)"
else
  echo "⚠️ No .env file found, skipping database sync"
fi

# ─── Step 8: Restart application ───
echo ""
echo "🚀 Step 8: Restarting application"

# Ensure HOSTNAME is set to 0.0.0.0 (needed for Next.js standalone)
if [ -f .envrc ] && ! grep -q 'export HOSTNAME=0.0.0.0' .envrc; then
  echo 'export HOSTNAME=0.0.0.0' >> .envrc
  echo "✅ HOSTNAME=0.0.0.0 added to .envrc"
elif [ ! -f .envrc ]; then
  echo 'export HOSTNAME=0.0.0.0' > .envrc
  echo "✅ .envrc created with HOSTNAME=0.0.0.0"
fi

# Trigger Phusion Passenger restart
mkdir -p tmp
touch tmp/restart.txt
echo "✅ Passenger restart triggered (tmp/restart.txt)"

# ─── Step 9: Health check ───
echo ""
echo "🏥 Step 9: Running health check"
echo "   Waiting 30s for Passenger to restart..."
sleep 30

MAX_RETRIES=40
RETRY_INTERVAL=5
HEALTHY=false

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(curl -s --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "")
  if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Health check PASSED after $((30 + i * RETRY_INTERVAL))s"
    HEALTHY=true
    break
  fi
  if [ $i -lt $MAX_RETRIES ]; then
    echo "   ⏳ Attempt $i/$MAX_RETRIES — response: ${RESPONSE:0:100}..."
    sleep $RETRY_INTERVAL
  fi
done

if [ "$HEALTHY" = false ]; then
  echo ""
  echo "❌ Health check FAILED after $((30 + MAX_RETRIES * RETRY_INTERVAL))s"
  echo ""
  echo "🔄 Rolling back to previous version..."

  # Find the latest backup
  LATEST_BACKUP=$(ls -dt standalone-backup-* 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    rm -rf .next/standalone
    mv "$LATEST_BACKUP" .next/standalone
    touch tmp/restart.txt
    echo "✅ Rolled back to previous version"
  else
    echo "❌ No backup available for rollback"
  fi

  echo ""
  echo "❌ DEPLOY FAILED — see logs above"
  exit 1
fi

# ─── Step 10: Deploy summary ───
echo ""
echo "=========================================="
echo "  ✅ DEPLOY SUCCESSFUL"
echo "=========================================="
echo ""
echo "  App: $APP_NAME"
echo "  URL: https://30-0.xn--p1ai"
echo "  Health: $HEALTH_URL"
echo "  Server: Apache + Phusion Passenger"
echo "  Node: $(node -v)"
echo "  Entrypoint: app.js"
echo ""
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Clean old backups after successful deploy
ls -dt standalone-backup-* 2>/dev/null | tail -n +$((BACKUP_COUNT + 1)) | xargs rm -rf 2>/dev/null || true
