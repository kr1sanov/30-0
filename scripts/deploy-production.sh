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

# Jino shared hosting publishes versioned interpreters outside the default PATH.
# Prefer the configured production runtime (Node.js 22), then fall back to nvm.
if ! command -v node &> /dev/null; then
  JINO_NODE22_BIN="/opt/alt/alt-nodejs22/root/usr/bin"
  if [ -x "$JINO_NODE22_BIN/node" ]; then
    export PATH="$JINO_NODE22_BIN:$PATH"
  fi
fi

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

rollback_standalone() {
  local latest_backup
  latest_backup=$(ls -dt standalone-backup-* 2>/dev/null | head -1 || true)
  if [ -z "$latest_backup" ]; then
    echo "❌ No standalone backup is available for rollback"
    return 1
  fi

  rm -rf .next/standalone
  cp -r "$latest_backup" .next/standalone
  mkdir -p tmp
  touch tmp/restart.txt
  echo "✅ Rolled back to $latest_backup"
}

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
DEPLOY_STAGE=$(mktemp -d "$APP_DIR/.deploy-stage.XXXXXX")
tar -xzf /tmp/deploy.tar.gz -C "$DEPLOY_STAGE"
rm -f /tmp/deploy.tar.gz

# Never unpack a new standalone build over the previous one. Next.js gives
# generated server chunks and its runtime content-addressed names; mixing two
# builds can make route modules call methods that do not exist in the retained
# runtime (for example, `this.load is not a function`).
if [ ! -f "$DEPLOY_STAGE/.next/standalone/server.js" ] || \
   [ ! -f "$DEPLOY_STAGE/.next/standalone/.next/BUILD_ID" ] || \
   [ ! -d "$DEPLOY_STAGE/.next/standalone/.next/server" ]; then
  echo "❌ Deployment package does not contain a complete standalone Next.js build"
  rm -rf "$DEPLOY_STAGE"
  exit 1
fi

mkdir -p .next prisma scripts
rm -rf .next/standalone-next
mv "$DEPLOY_STAGE/.next/standalone" .next/standalone-next

# Install the non-standalone files from the same package without touching
# persistent runtime configuration such as .env and .envrc.
cp "$DEPLOY_STAGE/app.js" app.js
cp "$DEPLOY_STAGE/.htaccess" .htaccess
cp "$DEPLOY_STAGE/package.json" package.json
cp -r "$DEPLOY_STAGE/prisma/." prisma/
cp "$DEPLOY_STAGE/scripts/prepare-production-users.cjs" scripts/prepare-production-users.cjs
cp "$DEPLOY_STAGE/scripts/backfill-wingback-positions.mjs" scripts/backfill-wingback-positions.mjs

rm -rf .next/standalone
mv .next/standalone-next .next/standalone
rm -rf "$DEPLOY_STAGE"

echo "✅ Deployment package extracted"
echo "   Structure after extraction:"
ls -la | sed -n '1,15p'
ls -la .next/standalone/ | sed -n '1,10p'
ls -la .next/standalone/.next/ 2>/dev/null | sed -n '1,5p' || echo "   (no .next inside standalone)"
echo "   app.js exists: $(test -f app.js && echo YES || echo NO)"
echo "   .htaccess exists: $(test -f .htaccess && echo YES || echo NO)"

# ─── Step 4: Ensure Passenger entrypoint ───
echo ""
echo "🔧 Step 4: Ensuring Passenger entrypoint (app.js)"

if [ ! -f app.js ]; then
cat > app.js << 'APPJS'
// Passenger entrypoint for 30-0 RPL
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
const { loadEnvFile } = require('node:process');
try {
  loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
require(serverPath);
APPJS
  echo "✅ app.js created"
else
  echo "✅ app.js already exists"
fi

# ─── Step 5: Ensure production environment ───
echo ""
echo "🔧 Step 5: Checking .env file"

# The Next.js standalone server changes CWD to .next/standalone/
# We need DATABASE_URL available as an environment variable.
# Passenger sets env vars from the Jino control panel.
# Also check if .env exists at APP_DIR for the loadEnvFromFile() fallback.

if [ ! -f .env ] || ! grep -q "^DATABASE_URL=" .env; then
  echo "❌ $APP_DIR/.env with DATABASE_URL is required"
  rollback_standalone || true
  exit 1
fi

ensure_env() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" .env; then
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

ensure_env "NODE_ENV" "production"
ensure_env "NEXT_PUBLIC_BASE_URL" "https://30-0.xn--p1ai"
ensure_env "TELEGRAM_CLIENT_ID" "8197702906"
ensure_env "TELEGRAM_BOT_USERNAME" "RPL30_bot"
ensure_env "TELEGRAM_SESSION_SECRET" "$(openssl rand -hex 32)"
ensure_env "RUN_SESSION_SECRET" "$(openssl rand -hex 32)"
chmod 600 .env
echo "✅ Required production variables are present (values are not printed)"

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
  export MIGRATION_BACKUP_DIR="$APP_DIR/backups/private"
  if ! node --env-file=.env scripts/prepare-production-users.cjs; then
    echo "❌ Legacy user preflight failed; database schema was not changed"
    rollback_standalone || true
    exit 1
  fi
  # Prisma classifies adding a unique index as potentially destructive even
  # after the explicit preflight above proves the values are unique.
  if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema synced"
  else
    echo "❌ Database schema sync failed; refusing to restart the application"
    rollback_standalone || true
    exit 1
  fi
  if node --env-file=.env scripts/backfill-wingback-positions.mjs; then
    echo "✅ Existing fullback position data updated"
  else
    echo "❌ Wing-back position backfill failed"
    rollback_standalone || true
    exit 1
  fi
else
  echo "❌ No .env file found; refusing to deploy without a database connection"
  rollback_standalone || true
  exit 1
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

MAX_RETRIES=30
RETRY_INTERVAL=5
HEALTHY=false

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(curl -s --connect-timeout 3 --max-time 5 "$HEALTH_URL" 2>/dev/null || echo "")
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

  rollback_standalone || true

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
