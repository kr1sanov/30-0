#!/bin/bash
# ──────────────────────────────────────────────
# 30-0 RPL — Production Deploy Script (runs on Jino)
# ──────────────────────────────────────────────
# Jino uses Apache + Phusion Passenger to serve Node.js apps.
# Passenger auto-detects changes and restarts the app.
# ──────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-/home/j97915155/30-0}"
APP_NAME="30-0-app"
HEALTH_URL="https://30-0.рф/api/health"
BACKUP_COUNT=3

echo "=========================================="
echo "  30-0 RPL — Production Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
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

echo "✅ Pre-flight checks passed (Node $(node -v))"

# ─── Step 2: Create backup ───
echo ""
echo "📦 Step 2: Creating backup"

cd "$APP_DIR"
mkdir -p logs

# Backup current .next directory
if [ -d .next ]; then
  BACKUP_NAME=".next-backup-$(date +%Y%m%d%H%M%S)"
  cp -r .next "$BACKUP_NAME"
  echo "✅ Backup created: $BACKUP_NAME"

  # Clean old backups (keep only last N)
  ls -dt .next-backup-* 2>/dev/null | tail -n +$((BACKUP_COUNT + 1)) | xargs rm -rf 2>/dev/null || true
  echo "✅ Old backups cleaned (keeping last $BACKUP_COUNT)"
else
  echo "⚠️  No existing .next directory to backup"
fi

# ─── Step 3: Extract deployment ───
echo ""
echo "📂 Step 3: Extracting deployment package"

mkdir -p .next
tar -xzf /tmp/deploy.tar.gz -C .
rm -f /tmp/deploy.tar.gz

echo "✅ Deployment package extracted"

# ─── Step 4: Ensure Prisma client ───
echo ""
echo "🔧 Step 4: Ensuring Prisma client modules"

mkdir -p .next/standalone/node_modules

# Copy Prisma client modules if node_modules exists from previous install
if [ -d node_modules/.prisma ]; then
  cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
  echo "✅ .prisma client copied"
fi

if [ -d node_modules/@prisma ]; then
  cp -r node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true
  echo "✅ @prisma client copied"
fi

# If Prisma client isn't available yet, install it
if [ ! -d .next/standalone/node_modules/.prisma ]; then
  echo "⚠️  Prisma client not found, generating..."
  cd "$APP_DIR"
  cp prisma/schema.mysql.prisma prisma/schema.prisma
  npx prisma generate
  cp -r node_modules/.prisma .next/standalone/node_modules/ 2>/dev/null || true
  cp -r node_modules/@prisma .next/standalone/node_modules/ 2>/dev/null || true
  echo "✅ Prisma client generated and copied"
fi

# ─── Step 5: Database migration ───
echo ""
echo "🗄️  Step 5: Running database sync"

cd "$APP_DIR"
cp prisma/schema.mysql.prisma prisma/schema.prisma 2>/dev/null || true

if [ -f .env ]; then
  npx prisma db push --accept-data-loss 2>/dev/null && echo "✅ Database schema synced" || echo "⚠️  Database sync warning (non-fatal)"
else
  echo "⚠️  No .env file found, skipping database migration"
fi

# ─── Step 6: Restart application ───
echo ""
echo "🚀 Step 6: Restarting application"

# Phusion Passenger auto-restarts on file changes
# Create a restart.txt file to trigger Passenger restart
mkdir -p tmp
touch tmp/restart.txt
echo "✅ Passenger restart triggered (tmp/restart.txt)"

# If PM2 is available, also restart via PM2 (for non-Passenger environments)
if command -v pm2 &> /dev/null; then
  if pm2 describe "$APP_NAME" &> /dev/null; then
    pm2 restart "$APP_NAME" --update-env
    echo "✅ PM2 process restarted"
  else
    echo "ℹ️  PM2 available but no process running — Passenger is handling the app"
  fi
fi

# ─── Step 7: Health check ───
echo ""
echo "🏥 Step 7: Running health check"

MAX_RETRIES=30
RETRY_INTERVAL=2
HEALTHY=false

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(curl -s --connect-timeout 3 --max-time 5 "$HEALTH_URL" 2>/dev/null || echo "")

  if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Health check PASSED after $((i * RETRY_INTERVAL))s"
    HEALTHY=true
    break
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "   ⏳ Attempt $i/$MAX_RETRIES — waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  fi
done

if [ "$HEALTHY" = false ]; then
  echo ""
  echo "❌ Health check FAILED after $((MAX_RETRIES * RETRY_INTERVAL))s"
  echo ""
  echo "🔄 Rolling back to previous version..."

  # Find the latest backup
  LATEST_BACKUP=$(ls -dt .next-backup-* 2>/dev/null | head -1)

  if [ -n "$LATEST_BACKUP" ]; then
    rm -rf .next
    mv "$LATEST_BACKUP" .next
    touch tmp/restart.txt
    echo "✅ Rolled back to previous version"
  else
    echo "❌ No backup available for rollback"
  fi

  echo ""
  echo "❌ DEPLOY FAILED — see logs above"
  exit 1
fi

# ─── Step 8: Deploy summary ───
echo ""
echo "=========================================="
echo "  ✅ DEPLOY SUCCESSFUL"
echo "=========================================="
echo ""
echo "  App:     $APP_NAME"
echo "  URL:     https://30-0.рф"
echo "  Health:  $HEALTH_URL"
echo "  Server:  Apache + Phusion Passenger"
echo ""
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Clean old backups after successful deploy
ls -dt .next-backup-* 2>/dev/null | tail -n +$((BACKUP_COUNT + 1)) | xargs rm -rf 2>/dev/null || true
