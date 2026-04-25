/**
 * PM2 Ecosystem Configuration for PropertyHub Chat Server
 * 
 * This configuration file manages the deployment and scaling
 * of the PropertyHub WebSocket server using PM2 process manager.
 */

module.exports = {
  apps: [
    {
      name: 'propertyhub-chat-server',
      script: 'server.js',
      instances: process.env.CLUSTER_WORKERS || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      // Performance monitoring
      pmx: true,
      
      // Automatic restart configuration
      watch: false, // Set to true for development
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Resource limits
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Environment variables
      env_file: '.env',
      
      // Startup configuration
      autorestart: true,
      vizion: false,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables for load balancing
      instance_var: 'INSTANCE_ID'
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip-1', 'your-server-ip-2'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/propertyhub-chat-server.git',
      path: '/var/www/propertyhub-chat',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging-server-ip',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/propertyhub-chat-server.git',
      path: '/var/www/propertyhub-chat-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};