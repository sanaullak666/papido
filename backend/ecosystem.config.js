module.exports = {
  apps: [
    {
      name: 'papido-backend',
      script: './src/server.js',
      instances: 'max', // Automatically spawns workers across all CPU cores
      exec_mode: 'cluster', // Enables Node.js native cluster load balancing
      watch: false,
      max_memory_restart: '800M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      }
    }
  ]
};
