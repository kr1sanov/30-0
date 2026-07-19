#!/bin/bash
# ──────────────────────────────────────────────
# 30-0 RPL — Server Diagnostic Script
# ──────────────────────────────────────────────
# Run this script on the Jino server via SSH to diagnose deployment issues.
# Usage: bash diagnostic.sh
# ──────────────────────────────────────────────

echo "=========================================="
echo "  30-0 RPL — Server Diagnostic"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. Node.js
echo "=== 1. Node.js ==="
echo "Path: $(which node 2>/dev/null || echo 'NOT FOUND')"
echo "Version: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "Real path: $(readlink -f $(which node) 2>/dev/null || echo 'N/A')"
echo ""

# 2. Directory structure
echo "=== 2. Domain directories ==="
echo "--- ~/domains/ ---"
ls -la ~/domains/ 2>/dev/null || echo "No ~/domains/"
echo ""

echo "--- ~/domains/30-0.xn--p1ai/ ---"
ls -la ~/domains/30-0.xn--p1ai/ 2>/dev/null || echo "Directory does NOT exist"
echo ""

echo "--- ~/domains/30-0.xn--p1ai/public_html/ ---"
ls -la ~/domains/30-0.xn--p1ai/public_html/ 2>/dev/null || echo "public_html does NOT exist"
echo ""

echo "--- ~/30-0/ (old PM2 setup) ---"
ls -la ~/30-0/ 2>/dev/null | head -20 || echo "Directory does NOT exist"
echo ""

# 3. .htaccess files
echo "=== 3. .htaccess files ==="
echo "--- ~/domains/30-0.xn--p1ai/.htaccess ---"
cat ~/domains/30-0.xn--p1ai/.htaccess 2>/dev/null || echo "NOT FOUND"
echo ""

echo "--- ~/domains/30-0.xn--p1ai/public_html/.htaccess ---"
cat ~/domains/30-0.xn--p1ai/public_html/.htaccess 2>/dev/null || echo "NOT FOUND"
echo ""

echo "--- ~/30-0/.htaccess ---"
cat ~/30-0/.htaccess 2>/dev/null || echo "NOT FOUND"
echo ""

# 4. App files
echo "=== 4. App files ==="
for dir in ~/domains/30-0.xn--p1ai ~/30-0; do
  echo "--- $dir/app.js ---"
  cat "$dir/app.js" 2>/dev/null || echo "NOT FOUND"
  echo ""
  echo "--- $dir/.next/standalone/server.js ---"
  ls -la "$dir/.next/standalone/server.js" 2>/dev/null || echo "NOT FOUND"
  echo ""
  echo "--- $dir/.env ---"
  if [ -f "$dir/.env" ]; then
    echo "EXISTS (contents hidden for security)"
    grep -c "DATABASE_URL" "$dir/.env" 2>/dev/null && echo "  DATABASE_URL: present" || echo "  DATABASE_URL: MISSING"
  else
    echo "NOT FOUND"
  fi
  echo ""
done

# 5. Passenger / app process
echo "=== 5. Running processes ==="
ps aux 2>/dev/null | grep -E "node|passenger|30-0" | grep -v grep || echo "No relevant processes found"
echo ""

# 6. Passenger log
echo "=== 6. Passenger / Apache logs ==="
for log in \
  ~/domains/30-0.xn--p1ai/logs/error.log \
  ~/domains/30-0.xn--p1ai/logs/stderr.log \
  ~/domains/30-0.xn--p1ai/logs/stdout.log \
  ~/domains/30-0.xn--p1ai/tmp/passenger.* \
  ~/30-0/logs/error.log \
  ~/30-0/logs/stderr.log \
  ~/30-0/logs/stdout.log \
  /var/log/apache2/error.log \
  /var/log/httpd/error_log; do
  if [ -f "$log" ]; then
    echo "--- $log (last 20 lines) ---"
    tail -20 "$log" 2>/dev/null
    echo ""
  fi
done

# 7. Try to start the app manually
echo "=== 7. Manual app startup test ==="
APP_DIR=""
for dir in ~/domains/30-0.xn--p1ai ~/30-0; do
  if [ -f "$dir/app.js" ] && [ -f "$dir/.next/standalone/server.js" ]; then
    APP_DIR="$dir"
    break
  fi
done

if [ -n "$APP_DIR" ]; then
  echo "Found app at: $APP_DIR"
  echo "Attempting to start manually..."
  cd "$APP_DIR"
  HOSTNAME=0.0.0.0 PORT=3999 NODE_ENV=production timeout 10 node app.js 2>&1 || echo "App exited with code: $?"
else
  echo "No app directory found with both app.js and .next/standalone/server.js"
fi

echo ""
echo "=========================================="
echo "  Diagnostic complete"
echo "=========================================="
