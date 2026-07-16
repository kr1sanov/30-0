# Deployment Guide — 30-0 RPL

> Step-by-step guide for deploying the 30-0 RPL app to production on Jino hosting.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [GitHub Secrets](#github-secrets)
3. [GitHub Actions Pipeline](#github-actions-pipeline)
4. [Server Setup (Jino)](#server-setup-jino)
5. [First Deployment](#first-deployment)
6. [Deploy Process](#deploy-process)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring & Verification](#monitoring--verification)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        External                                  │
│                    https://30-0.рф                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │  HTTPS (443)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Nginx                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SSL termination (Let's Encrypt)                            │ │
│  │  Gzip compression                                           │ │
│  │  Static files → /_next/static/ (1 year cache)              │ │
│  │  Proxy → http://127.0.0.1:3000                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js App                                 │
│                    (port 3000)                                    │
│                                                                  │
│  Managed by PM2 (30-0-app)                                      │
│  Standalone server (.next/standalone/server.js)                  │
│  Connects to MySQL via Prisma ORM                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │  Prisma ORM
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      MySQL Database                              │
│       mysql.925c78adb421.hosting.myjino.ru                       │
│              (Jino external MySQL)                               │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Flow

```
GitHub (main) ──push──> GitHub Actions ──SSH──> Jino Server ──PM2──> Running App
     │                      │                                         │
     │                   4 jobs:                               Health Check
     │                   lint → build → deploy → verify         (/api/health)
     │
     └── On failure: Telegram notification
```

---

## GitHub Secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret | Required | Description | Example |
|--------|----------|-------------|---------|
| `JINO_HOST` | ✅ | IP address or hostname of Jino VPS | `123.45.67.89` |
| `JINO_USERNAME` | ✅ | SSH username on the server | `root` |
| `JINO_SSH_KEY` | ✅ | Private SSH key for connection | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `JINO_SSH_PORT` | ✅ | SSH port (non-standard for security) | `2222` |
| `JINO_APP_DIR` | ✅ | Absolute path to app on server | `/home/j97915155/30-0` |
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token for deployment notifications | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | ✅ | Chat ID for deployment notifications | `-1001234567890` |

> **Security**: Never commit secret values to the repository. Use GitHub Secrets exclusively.

---

## GitHub Actions Pipeline

### Pipeline Configuration

File: `.github/workflows/deploy.yml`

### 4-Job Pipeline

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  LINT   │────►│  BUILD  │────►│  DEPLOY  │────►│  VERIFY  │
│         │     │         │     │          │     │          │
│ ESLint  │     │ next    │     │ SSH →    │     │ Health   │
│ tsc     │     │ build   │     │ PM2      │     │ check    │
│         │     │         │     │ reload   │     │ Telegram │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
     │               │               │                │
     ▼               ▼               ▼                ▼
   Error →        Error →        Error →          Error →
   Stop           Stop           Rollback         Notify
```

### Job 1: Lint & Type Check

```yaml
lint:
  name: Lint & Type Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - run: bun run lint
    - run: bunx tsc --noEmit
```

**On failure**: Pipeline stops. Fix lint errors or type issues before proceeding.

### Job 2: Build Application

```yaml
build:
  name: Build Application
  needs: lint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - run: bun run build
    - uses: actions/upload-artifact@v4
      with:
        name: build-output
        path: .next/
```

**On failure**: Pipeline stops. Fix build errors before proceeding.

### Job 3: Deploy to Jino

```yaml
deploy:
  name: Deploy to Jino
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with:
        name: build-output
        path: .next/

    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.JINO_HOST }}
        username: ${{ secrets.JINO_USERNAME }}
        key: ${{ secrets.JINO_SSH_KEY }}
        port: ${{ secrets.JINO_SSH_PORT }}
        script: |
          cd ${{ secrets.JINO_APP_DIR }}
          git pull origin main
          bun install --frozen-lockfile
          bun run build
          pm2 reload ecosystem.config.js --env production
          sleep 5
          curl -f http://localhost:3000/api/health || exit 1

    - name: Notify Telegram on Failure
      if: failure()
      uses: appleboy/telegram-action@master
      with:
        to: ${{ secrets.TELEGRAM_CHAT_ID }}
        token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
        message: |
          ❌ Deploy to 30-0.рф failed!
          Commit: ${{ github.sha }}
          Author: ${{ github.actor }}
```

**On failure**: Manual intervention required. See [Rollback Procedure](#rollback-procedure).

### Job 4: Verify Deployment

```yaml
verify:
  name: Verify Deployment
  needs: deploy
  runs-on: ubuntu-latest
  steps:
    - name: Health Check
      run: |
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://30-0.рф/api/health)
        if [ "$STATUS" != "200" ]; then
          echo "❌ Health check failed: HTTP $STATUS"
          exit 1
        fi
        echo "✅ Health check passed"

    - name: Notify Telegram on Success
      uses: appleboy/telegram-action@master
      with:
        to: ${{ secrets.TELEGRAM_CHAT_ID }}
        token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
        message: |
          ✅ Deploy to 30-0.рф successful!
          Commit: ${{ github.sha }}
```

### Triggers

- **Automatic**: On push to `main` branch
- **Manual**: Via `workflow_dispatch` in GitHub Actions UI

---

## Server Setup (Jino)

### 1. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # v22.x.x
```

### 2. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 3. Install PM2

```bash
sudo npm install -g pm2
pm2 startup
# Run the command that pm2 startup outputs
```

### 4. Install Nginx

```bash
sudo apt install -y nginx
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/30-0.рф`:

```nginx
server {
    listen 80;
    server_name 30-0.рф www.30-0.рф;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 30-0.рф www.30-0.рф;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/30-0.рф/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/30-0.рф/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Static assets (long cache)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/30-0.рф /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Install SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 30-0.рф -d www.30-0.рф
```

### 7. Configure MySQL

```bash
# Jino provides external MySQL access
# Set DATABASE_URL in .env with external host:
# mysql://user:password@mysql.925c78adb421.hosting.myjino.ru:3306/dbname
```

---

## First Deployment

### Step-by-Step

```bash
# 1. SSH into the Jino server
ssh -p 2222 root@123.45.67.89

# 2. Create the project directory
mkdir -p /home/j97915155/30-0
cd /home/j97915155/30-0

# 3. Clone the repository
git clone https://github.com/kr1sanov/30-0.git .

# 4. Install dependencies
bun install

# 5. Switch to MySQL schema for production
cp prisma/schema.mysql.prisma prisma/schema.prisma
npx prisma generate

# 6. Create the .env file
cat > .env << 'EOF'
DATABASE_URL=mysql://j97915155:PASSWORD@mysql.925c78adb421.hosting.myjino.ru:3306/j97915155
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
EOF

# 7. Push schema to MySQL database
npx prisma db push

# 8. Seed the database with RPL data
bun run db:seed

# 9. Build the application
bun run build

# 10. Start with PM2
pm2 start ecosystem.config.js --env production

# 11. Save PM2 configuration (auto-start on reboot)
pm2 save

# 12. Verify deployment
curl -f http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected",...}
```

### PM2 Configuration

The `ecosystem.config.js` file configures the process:

```javascript
module.exports = {
  apps: [{
    name: '30-0-app',
    script: '.next/standalone/server.js',
    cwd: '/home/j97915155/30-0',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    max_restarts: 10,
    restart_delay: 5000,
    min_uptime: '10s',
    max_memory_restart: '512M',
    out_file: '/home/j97915155/30-0/logs/out.log',
    error_file: '/home/j97915155/30-0/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    watch: false,
    kill_timeout: 10000,
    listen_timeout: 30000,
    shutdown_with_message: true,
  }],
};
```

---

## Deploy Process

### Automatic Deployment (Push to Main)

When code is pushed to the `main` branch, GitHub Actions automatically:

1. **Lint** — Runs ESLint and TypeScript type checking
2. **Build** — Compiles the Next.js production build
3. **Deploy** — Connects via SSH, performs:
   - `git pull origin main` — Get latest code
   - `bun install --frozen-lockfile` — Install dependencies
   - `bun run build` — Build on the server
   - `pm2 reload ecosystem.config.js --env production` — Restart the app
   - `sleep 5 && curl -f http://localhost:3000/api/health` — Health check
4. **Verify** — External health check via `https://30-0.рф/api/health`

### Manual Deployment

```bash
# SSH into server
ssh -p 2222 root@123.45.67.89
cd /home/j97915155/30-0

# Get latest code
git pull origin main

# Install dependencies
bun install

# Apply database migrations (if any)
bun run db:push

# Build
bun run build

# Restart PM2
pm2 reload ecosystem.config.js --env production

# Verify
curl -f http://localhost:3000/api/health
```

### Deployment with Database Changes

If the Prisma schema has changed:

```bash
cd /home/j97915155/30-0
git pull origin main
bun install

# Switch to MySQL schema
cp prisma/schema.mysql.prisma prisma/schema.prisma
npx prisma generate

# Apply schema changes
npx prisma db push

# Rebuild and restart
bun run build
pm2 reload ecosystem.config.js --env production
```

---

## Rollback Procedure

### Quick Rollback via Git

```bash
cd /home/j97915155/30-0

# 1. View recent commits
git log --oneline -10

# 2. Revert to the last working commit
git revert HEAD
# Or (DANGEROUS — rewrites history):
# git reset --hard <COMMIT_HASH>

# 3. Rebuild and restart
bun install
bun run build
pm2 reload ecosystem.config.js --env production

# 4. Verify
curl -f http://localhost:3000/api/health
```

### Rollback via PM2 (if app won't start)

```bash
# Stop the broken app
pm2 stop 30-0-app

# Revert the code
cd /home/j97915155/30-0
git reset --hard <LAST_WORKING_COMMIT>

# Rebuild
bun install
bun run build

# Start fresh
pm2 start ecosystem.config.js --env production

# Verify
curl -f http://localhost:3000/api/health
```

### Deployment Backup Strategy

Before each deployment, the existing `.next` build is backed up:

```bash
# Create backup before deploy
cp -r .next .next-backup-$(date +%Y%m%d_%H%M%S)

# If deploy fails, restore from backup
pm2 stop 30-0-app
rm -rf .next
cp -r .next-backup-XXXXXXXX_XXXXXX .next
pm2 start ecosystem.config.js --env production
```

> Keep only the last 3 backups to save disk space:
> ```bash
> ls -dt .next-backup-* | tail -n +4 | xargs rm -rf
> ```

### Database Backup Before Rollback

```bash
# Create a MySQL dump before any destructive operations
mysqldump -u j97915155 -p j97915155 > /var/backups/game_db_$(date +%Y%m%d_%H%M%S).sql

# Restore from dump if needed
mysql -u j97915155 -p j97915155 < /var/backups/game_db_20250101_120000.sql
```

---

## Monitoring & Verification

### Health Check Endpoint

```
GET https://30-0.рф/api/health
```

**Success Response** (HTTP 200):
```json
{
  "status": "ok",
  "database": "connected",
  "version": "production",
  "responseTime": "23ms",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "stats": {
    "clubs": 15,
    "players": 613,
    "playerSeasons": 1500,
    "seasons": 33,
    "gameRuns": 42,
    "users": 10
  }
}
```

**Error Response** (HTTP 500):
```json
{
  "status": "error",
  "database": "disconnected",
  "responseTime": "5003ms",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "error": "Can't reach database server"
}
```

### PM2 Commands

```bash
# Status of all processes
pm2 status

# Detailed info about the app
pm2 describe 30-0-app

# Real-time monitoring
pm2 monit

# View logs
pm2 logs 30-0-app --lines 100

# View error logs only
pm2 logs 30-0-app --err --lines 50

# Clear logs
pm2 flush 30-0-app
```

### External Monitoring

Set up an uptime monitoring service (UptimeRobot, Hetrix Tools) to check:

1. **Main site**: `https://30-0.рф` — HTTP check
2. **API health**: `https://30-0.рф/api/health` — Keyword check for `"status":"ok"`

Configure alerts to send notifications to Telegram.

---

## Troubleshooting

### Common Issues

#### 1. Build Fails on Server

**Symptom**: `bun run build` exits with error during GitHub Actions or manual deploy.

**Fix**:
```bash
# Check Node.js version
node --version  # Must be 20+

# Check disk space
df -h  # Need at least 2GB free

# Clear Next.js cache and rebuild
rm -rf .next
bun run build
```

#### 2. App Starts but API Returns 500

**Symptom**: PM2 shows app running, but `/api/health` returns 500 with `database: "disconnected"`.

**Fix**:
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test MySQL connection directly
mysql -u j97915155 -p -h mysql.925c78adb421.hosting.myjino.ru j97915155

# Restart app
pm2 restart 30-0-app
```

#### 3. PM2 Process Keeps Restarting

**Symptom**: `pm2 status` shows restart count increasing.

**Fix**:
```bash
# Check error logs
pm2 logs 30-0-app --err --lines 50

# Common causes:
# - Port 3000 already in use
lsof -i :3000
kill -9 <PID>

# - Missing .env file
ls -la .env

# - Out of memory
free -h
# Increase max_memory_restart in ecosystem.config.js
```

#### 4. Nginx 502 Bad Gateway

**Symptom**: Browser shows 502 error.

**Fix**:
```bash
# Check if Next.js app is running
pm2 status

# Check if app responds locally
curl http://localhost:3000/api/health

# If app is down, restart it
pm2 restart 30-0-app

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

#### 5. Git Pull Conflicts During Deploy

**Symptom**: `git pull` fails with merge conflicts on the server.

**Fix**:
```bash
# Force reset to match remote (CAUTION: loses local changes)
git fetch origin
git reset --hard origin/main

# Then continue with deploy
bun install
bun run build
pm2 reload ecosystem.config.js --env production
```

#### 6. Out of Disk Space

**Symptom**: Build fails with "No space left on device".

**Fix**:
```bash
# Check disk usage
df -h

# Clean up old backups
ls -dt .next-backup-* | tail -n +4 | xargs rm -rf

# Clean PM2 logs
pm2 flush

# Clean npm/bun cache
bun pm cache rm

# Clean old Git objects
git gc --prune=now
```

#### 7. Telegram Auth Not Working in Production

**Symptom**: Users can't log in via Telegram on production.

**Fix**:
```bash
# Check TELEGRAM_BOT_TOKEN in .env
cat .env | grep TELEGRAM_BOT_TOKEN

# Verify the token works
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Check that BotFather has the correct domain set:
# /setdomain → select bot → 30-0.рф
```

#### 8. Prisma Client Mismatch

**Symptom**: Errors like "Cannot read properties of undefined (reading 'findMany')".

**Fix**:
```bash
# Regenerate Prisma Client
npx prisma generate

# Rebuild the app
bun run build
pm2 restart 30-0-app
```
