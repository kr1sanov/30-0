# Production Environment — 30-0 RPL

> Complete reference for the production environment running at https://30-0.рф

---

## Table of Contents

1. [Server & Infrastructure](#server--infrastructure)
2. [Stack](#stack)
3. [Environment Variables](#environment-variables)
4. [PM2 Configuration](#pm2-configuration)
5. [Security Headers](#security-headers)
6. [Caching Strategy](#caching-strategy)
7. [Health Check](#health-check)
8. [Monitoring](#monitoring)
9. [SSL/TLS](#ssltls)
10. [Backup Strategy](#backup-strategy)
11. [Incident Response](#incident-response)

---

## Server & Infrastructure

| Parameter | Value |
|-----------|-------|
| **Domain** | `30-0.рф` (Punycode: `xn--30-6kc4b.xn--p1ai`) |
| **Hosting Provider** | Jino (X2 tariff) |
| **Server Path** | `/home/j97915155/30-0` |
| **SSH Port** | Non-standard (configured in GitHub Secrets) |
| **Public URL** | `https://30-0.рф` |
| **App Port** | 3000 (internal only, proxied by Nginx) |
| **Database Host** | `mysql.925c78adb421.hosting.myjino.ru` (Jino external MySQL) |

### Network Topology

```
Internet
    │
    │ HTTPS (443)
    ▼
┌──────────────────┐
│      Nginx       │
│  SSL termination │
│  Reverse proxy   │
│  Gzip            │
│  Static cache    │
└────────┬─────────┘
         │ HTTP (localhost:3000)
         ▼
┌──────────────────┐     ┌───────────────────────────────┐
│  Next.js (PM2)   │────►│  MySQL (Jino external)        │
│  30-0-app        │     │  mysql.925c78adb421           │
│  port 3000       │     │  .hosting.myjino.ru:3306      │
└──────────────────┘     └───────────────────────────────┘
```

---

## Stack

| Component | Technology | Version | Details |
|-----------|-----------|---------|---------|
| **Runtime** | Node.js | 22 LTS | Standalone server mode |
| **Framework** | Next.js | 16.1+ | App Router, standalone output |
| **Process Manager** | PM2 | Latest | Auto-restart, log management, memory limits |
| **Web Server** | Nginx | Latest | Reverse proxy, SSL termination, caching |
| **Database** | MySQL | 8.x | Jino external hosting |
| **ORM** | Prisma | 6.x | Type-safe database access |
| **SSL** | Let's Encrypt | Latest | Auto-renewed via certbot |
| **Analytics** | Yandex.Metrika | Counter 110726199 | Client-side event tracking |

---

## Environment Variables

File: `/home/j97915155/30-0/.env`

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | MySQL connection string | `mysql://j97915155:password@mysql.925c78adb421.hosting.myjino.ru:3306/j97915155` |
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token for auth validation | `123456:ABC-DEF1234...` |
| `NODE_ENV` | ✅ | Node environment | `production` |
| `PORT` | ✅ | Application port | `3000` |
| `HOSTNAME` | ✅ | Listen address | `0.0.0.0` |

### Additional (Optional) Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the app | — |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Bot username for WebApp | — |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Metrika counter ID | `110726199` (hardcoded in layout) |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | — |
| `NEXTAUTH_URL` | URL for NextAuth.js | — |

> **Security**: The `.env` file is git-ignored and should never be committed to the repository. It must be created manually on the server.

---

## PM2 Configuration

File: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: '30-0-app',
      script: '.next/standalone/server.js',
      cwd: '/home/j97915155/30-0',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },

      // Auto-restart configuration
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      max_memory_restart: '512M',

      // Log configuration
      out_file: '/home/j97915155/30-0/logs/out.log',
      error_file: '/home/j97915155/30-0/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Watch for file changes (disabled in production)
      watch: false,

      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 30000,
      shutdown_with_message: true,
    },
  ],
};
```

### Key PM2 Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `max_restarts` | 10 | Max consecutive restarts before PM2 stops trying |
| `restart_delay` | 5000ms | Wait between restarts to avoid crash loops |
| `min_uptime` | 10s | Process must run 10s to be considered "stable" |
| `max_memory_restart` | 512M | Auto-restart if memory exceeds 512MB |
| `kill_timeout` | 10000ms | Wait 10s before force-killing |
| `listen_timeout` | 30000ms | Wait 30s for app to start listening |
| `watch` | false | No file watching in production |

### Log Rotation

Install PM2 log rotation module:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

---

## Security Headers

Configured in `next.config.ts` via the `headers()` function and reinforced by Nginx:

### Next.js Security Headers (applied to all routes)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |
| `X-XSS-Protection` | `1; mode=block` | XSS filter for older browsers |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS (2 years) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |

### Content-Security-Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://mc.yandex.ru;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https: http:;
font-src 'self' data:;
connect-src 'self' https://mc.yandex.ru https://api.telegram.org;
frame-src https://web.telegram.org;
object-src 'none';
base-uri 'self';
```

**Allowed External Domains:**
- `telegram.org` — Telegram WebApp SDK scripts
- `mc.yandex.ru` — Yandex.Metrika analytics
- `api.telegram.org` — Telegram API for auth validation

### Nginx Security Headers (additional layer)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru; connect-src 'self' wss://30-0.рф https://mc.yandex.ru;" always;
```

### Verifying Headers

```bash
curl -sI https://30-0.рф | grep -E "X-Frame|X-Content|X-XSS|Referrer|Content-Security|Strict-Transport|Permissions-Policy"
```

---

## Caching Strategy

### Static Assets (1 Year)

Applied to `/_next/static/*` in `next.config.ts`:

```
Cache-Control: public, max-age=31536000, immutable
```

Next.js adds content hashes to all static assets (JS, CSS, images), making them cacheable indefinitely. When files change, the hash changes and browsers fetch the new version.

### Images (1 Day + Stale-While-Revalidate)

Applied to `/images/*` in `next.config.ts`:

```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

Images are cached for 1 day, with a 7-day stale-while-revalidate window. Browsers serve stale content while fetching fresh versions in the background.

### Nginx Static Caching

```nginx
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

### API Responses

API responses are not cached (dynamic content). Each request hits the Next.js server and queries the database.

---

## Health Check

### Endpoint

```
GET /api/health
```

### Implementation

Located in `src/app/api/health/route.ts`:

1. Records start time
2. Queries 6 database counts: `club`, `player`, `season`, `playerSeason`, `gameRun`, `user`
3. Calculates response time
4. Returns JSON with status, database connectivity, version, and stats

### Success Response (HTTP 200)

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

### Error Response (HTTP 500)

```json
{
  "status": "error",
  "database": "disconnected",
  "responseTime": "5003ms",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "error": "Can't reach database server at `mysql.925c78adb421.hosting.myjino.ru`"
}
```

### Health Check Usage

```bash
# Quick check (exit code)
curl -f https://30-0.рф/api/health

# Detailed check with JSON
curl -s https://30-0.рф/api/health | jq .

# Check response time
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://30-0.рф/api/health

# Monitoring loop
watch -n 30 'curl -s https://30-0.рф/api/health | jq "{status, responseTime, stats}"'
```

---

## Monitoring

### Yandex.Metrika

- **Counter ID**: 110726199
- **Dashboard**: [Yandex.Metrika](https://metrika.yandex.ru/)
- **Features**: Pageviews, custom events, webvisor, clickmap, error tracking
- **19+ custom events** tracked (see ARCHITECTURE.md for full list)

### PM2 Monitoring

```bash
# Process status
pm2 status

# Real-time monitoring dashboard
pm2 monit

# Process details
pm2 describe 30-0-app

# Memory usage
pm2 describe 30-0-app | grep -i memory

# Live logs
pm2 logs 30-0-app --lines 100

# Error logs only
pm2 logs 30-0-app --err
```

### Health API Monitoring

The `/api/health` endpoint can be monitored by:
- **UptimeRobot**: Check `https://30-0.рф/api/health` for keyword `"status":"ok"`
- **Hetrix Tools**: HTTP check with 1-minute intervals
- **Custom cron**: Health check script with Telegram alerts

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Site-specific logs
sudo tail -f /var/log/nginx/30-0.рф.access.log
sudo tail -f /var/log/nginx/30-0.рф.error.log
```

### Application Logs

```bash
# PM2 application logs
tail -f /home/j97915155/30-0/logs/out.log
tail -f /home/j97915155/30-0/logs/error.log
```

---

## SSL/TLS

### Certificate

- **Provider**: Let's Encrypt
- **Domain**: `30-0.рф`, `www.30-0.рф`
- **Certificate Path**: `/etc/letsencrypt/live/30-0.рф/fullchain.pem`
- **Key Path**: `/etc/letsencrypt/live/30-0.рф/privkey.pem`

### Configuration

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
```

### Auto-Renewal

Let's Encrypt certificates are auto-renewed via certbot's systemd timer or cron:

```bash
# Check renewal status
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### HSTS

HSTS is enabled via the `Strict-Transport-Security` header:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

This tells browsers to only use HTTPS for the next 2 years, including all subdomains, and requests inclusion in the HSTS preload list.

### Verification

```bash
# Check certificate validity
echo | openssl s_client -connect 30-0.рф:443 2>/dev/null | openssl x509 -noout -dates

# Check SSL/TLS grade (external tool)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=30-0.рф
```

---

## Backup Strategy

### 1. PM2 Auto-Restart

PM2 automatically restarts the application if it crashes, runs out of memory, or becomes unresponsive. Configuration:

| Setting | Value | Purpose |
|---------|-------|---------|
| `autorestart` | true | Auto-restart on crash |
| `max_memory_restart` | 512M | Restart on memory leak |
| `max_restarts` | 10 | Stop restart loop after 10 attempts |
| `pm2 save` | — | Save process list for auto-restore on reboot |
| `pm2 startup` | — | Generate init script for boot-time start |

### 2. Deployment Backups

Before each deployment, the existing build is backed up:

```bash
# Backup current .next build
cp -r .next .next-backup-$(date +%Y%m%d_%H%M%S)

# Keep only the last 3 backups
ls -dt .next-backup-* | tail -n +4 | xargs rm -rf
```

### 3. MySQL Database Backups

#### Manual Backup

```bash
mysqldump -u j97915155 -p j97915155 > /var/backups/game_db_$(date +%Y%m%d_%H%M%S).sql
```

#### Scheduled Backup (Cron)

```bash
# Daily backup at 3:00 AM MSK (0:00 UTC)
(crontab -l 2>/dev/null; echo "0 0 * * * mysqldump -u j97915155 -p'PASSWORD' j97915155 > /var/backups/game_db_\$(date +\%Y\%m\%d).sql") | crontab -

# Clean up backups older than 30 days
(crontab -l 2>/dev/null; echo "0 1 * * * find /var/backups/ -name 'game_db_*.sql' -mtime +30 -delete") | crontab -
```

#### Jino Panel Backup

Jino hosting provides built-in MySQL backup via the control panel:
1. Log in to Jino panel
2. Navigate to MySQL databases
3. Use the built-in backup tool

#### Database Restore

```bash
# Stop the application
pm2 stop 30-0-app

# Restore from backup
mysql -u j97915155 -p j97915155 < /var/backups/game_db_20250101_120000.sql

# Restart the application
pm2 start ecosystem.config.js --env production

# Verify
curl -f http://localhost:3000/api/health
```

### 4. Git Repository

The entire codebase is version-controlled in Git. Any version can be restored:

```bash
git log --oneline -20          # View recent commits
git checkout <COMMIT_HASH>     # Switch to any version
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1** | Critical — site down | < 15 min | App unresponsive, database down, SSL expired |
| **P2** | High — partial failure | < 1 hour | API errors, auth broken, slow performance |
| **P3** | Medium — degraded | < 4 hours | Slow responses, non-critical bugs |
| **P4** | Low — cosmetic | < 24 hours | UI glitches, typos |

### P1: Site Down — Response Steps

```bash
# Step 1: Check server connectivity
ping 30-0.рф

# Step 2: SSH into server
ssh -p 2222 root@123.45.67.89

# Step 3: Check process status
pm2 status

# Step 4: If app is stopped/crashed
pm2 restart 30-0-app
sleep 5
curl -f http://localhost:3000/api/health

# Step 5: If app won't start, check logs
pm2 logs 30-0-app --err --lines 50

# Step 6: If database issue, check MySQL
mysql -u j97915155 -p -h mysql.925c78adb421.hosting.myjino.ru j97915155 -e "SELECT 1"

# Step 7: If Nginx issue
sudo systemctl status nginx
sudo systemctl restart nginx

# Step 8: If all else fails, rollback
cd /home/j97915155/30-0
git log --oneline -5
git reset --hard <LAST_WORKING_COMMIT>
bun install
bun run build
pm2 restart 30-0-app
```

### P2: API Errors — Response Steps

```bash
# Check health endpoint
curl -s https://30-0.рф/api/health | jq .

# If database is disconnected
pm2 logs 30-0-app --err --lines 30

# Restart app
pm2 restart 30-0-app

# Verify specific API routes
curl -s https://30-0.рф/api/clubs | head -c 200
curl -s https://30-0.рф/api/seasons | head -c 200
curl -s https://30-0.рф/api/formations | head -c 200
```

### Post-Incident Checklist

After resolving an incident:

- [ ] Verify `/api/health` returns 200
- [ ] Test critical user flow (auth → play → simulate)
- [ ] Check PM2 logs for recurring errors: `pm2 logs --err --lines 50`
- [ ] Verify no memory leak: `pm2 describe 30-0-app | grep memory`
- [ ] Document the incident (what, why, fix, prevention)
- [ ] Update monitoring if needed
- [ ] Send status update to team Telegram channel

### Quick Reference Commands

```bash
# === Status ===
pm2 status                                    # Process status
pm2 describe 30-0-app                        # Process details
pm2 monit                                    # Real-time monitoring

# === Restart ===
pm2 restart 30-0-app                         # Hard restart
pm2 reload 30-0-app                          # Graceful reload
pm2 stop 30-0-app                            # Stop the app

# === Logs ===
pm2 logs 30-0-app --lines 100                # Recent logs
pm2 logs 30-0-app --err                      # Error logs only
pm2 flush 30-0-app                           # Clear logs

# === Health ===
curl -s https://30-0.рф/api/health | jq .   # Full health check
curl -f http://localhost:3000/api/health      # Local check

# === Services ===
sudo systemctl status nginx                   # Nginx status
sudo systemctl restart nginx                  # Nginx restart
sudo systemctl status mysql                   # MySQL status (if local)

# === Resources ===
free -h                                      # Memory
df -h                                        # Disk space
top -bn1 | head -20                          # CPU/processes

# === Database ===
mysql -u j97915155 -p -e "SELECT 1"          # DB connectivity test
mysqldump -u j97915155 -p j97915155 > backup.sql  # Backup

# === Deploy ===
cd /home/j97915155/30-0 && git pull origin main  # Pull latest
bun install && bun run build                      # Build
pm2 reload ecosystem.config.js --env production   # Deploy
```
