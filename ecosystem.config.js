module.exports = {
  apps: [{
    name: 'flashcharge-backend',
    script: './src/server.js',
    cwd: '/opt/ev-platform/flashCharge-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/root/.pm2/logs/flashcharge-backend-error.log',
    out_file: '/root/.pm2/logs/flashcharge-backend-out.log',
    env: {
      NODE_ENV: 'production'
    },
    exp_backoff_restart_delay: 100,
    max_restarts: 50,
    min_uptime: '5s',
    listen_timeout: 3000,
    kill_timeout: 3000
  }]
};
