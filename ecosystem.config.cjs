module.exports = {
  apps: [
    {
      name: 'barber-db',
      script: './server/vps-db-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: '3001',
        HOST: '0.0.0.0',
        PUBLIC_BASE_URL: 'http://booking-cx33-server.hetzner.com',
        VPS_DB_ADMIN_TOKEN: 'e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e'
      },
      error_file: '.pm2-error.log',
      out_file: '.pm2-out.log',
      log_file: '.pm2-combined.log',
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
