// PM2 Ecosystem Configuration for 30-0 RPL
// Usage: pm2 start ecosystem.config.js
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
