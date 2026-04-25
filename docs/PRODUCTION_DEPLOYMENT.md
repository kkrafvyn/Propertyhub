# PropertyHub Production Deployment Guide

## Complete Production Setup for Real-time Chat System

This guide covers the deployment of PropertyHub's production-ready WebSocket server, push notifications, voice messaging, file sharing, and end-to-end encryption features.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   WebSocket     │    │   Database      │
│   (React)       │◄──►│   Server        │◄──►│   (MongoDB)     │
│                 │    │   (Node.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN           │    │   Redis         │    │   File Storage  │
│   (Static)      │    │   (Cache)       │    │   (AWS S3)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Backend Deployment

### Prerequisites

- Node.js 18+ 
- MongoDB 7+
- Redis 7+
- AWS Account (for S3)
- Domain with SSL certificate

### Environment Setup

1. **Clone and setup the WebSocket server:**

```bash
cd backend/websocket-server
npm install
cp .env.example .env
```

2. **Configure environment variables:**

```bash
# Production Environment
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=mongodb://your-mongo-host:27017/propertyhub-chat
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-256-bit-key
JWT_EXPIRES_IN=7d

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=propertyhub-chat-files

# Client URLs
CLIENT_URLS=https://yourdomain.com,https://www.yourdomain.com

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MESSAGE_RATE_LIMIT_WINDOW_MS=60000
MESSAGE_RATE_LIMIT_MAX=30
```

### Deployment Options

#### Option 1: Docker Deployment

1. **Build and run with Docker:**

```bash
# Build the image
docker build -t propertyhub-chat-server .

# Run with docker-compose
docker-compose up -d
```

2. **Docker Compose for full stack:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mongodb://mongo:27017/propertyhub-chat
      - REDIS_HOST=redis
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=propertyhub-chat
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo-data:
  redis-data:
```

#### Option 2: PM2 Deployment

1. **Install PM2:**

```bash
npm install -g pm2
```

2. **Deploy with PM2:**

```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Setup PM2 to start on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs propertyhub-chat-server
```

#### Option 3: Cloud Platform Deployment

**Heroku:**

```bash
# Login and create app
heroku login
heroku create propertyhub-chat-server

# Add MongoDB and Redis addons
heroku addons:create mongolab:sandbox
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
# ... set other variables

# Deploy
git push heroku main
```

**Railway:**

```bash
railway login
railway init
railway add --database mongodb
railway add --database redis
railway deploy
```

**DigitalOcean App Platform:**

1. Create `app.yaml`:

```yaml
name: propertyhub-chat
services:
- name: api
  source_dir: /
  github:
    repo: your-username/propertyhub-chat-server
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${mongodb.DATABASE_URL}
databases:
- name: mongodb
  engine: MONGODB
- name: redis
  engine: REDIS
```

### SSL/TLS Configuration

1. **Nginx SSL Configuration:**

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8080;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## 2. Database Setup

### MongoDB Configuration

1. **Create MongoDB indexes:**

```javascript
// Connect to MongoDB and run these commands
use propertyhub-chat

// Message indexes
db.messages.createIndex({ "roomId": 1, "timestamp": -1 })
db.messages.createIndex({ "senderId": 1, "timestamp": -1 })
db.messages.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }) // 30 days

// Room indexes
db.rooms.createIndex({ "participants.userId": 1 })
db.rooms.createIndex({ "type": 1, "createdAt": -1 })

// User presence indexes
db.userpresences.createIndex({ "userId": 1 }, { unique: true })
db.userpresences.createIndex({ "status": 1 })
```

2. **MongoDB Replica Set (for production):**

```yaml
# MongoDB replica set configuration
replication:
  replSetName: "propertyhub-rs"
```

### Redis Configuration

1. **Redis persistence configuration:**

```conf
# redis.conf
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec
```

## 3. File Storage Setup

### AWS S3 Configuration

1. **Create S3 bucket:**

```bash
aws s3 mb s3://propertyhub-chat-files
```

2. **Set bucket policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PrivateReadWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:user/propertyhub-chat"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::propertyhub-chat-files/*"
    }
  ]
}
```

3. **Configure CORS:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

### Alternative: CloudFlare R2

1. **Create R2 bucket and configure:**

```bash
# Install Wrangler CLI
npm install -g wrangler

# Create bucket
wrangler r2 bucket create propertyhub-chat-files
```

## 4. Frontend Deployment

### Build Configuration

1. **Update environment variables:**

```bash
# .env.production
REACT_APP_WEBSOCKET_URL=wss://api.yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_VAPID_PUBLIC_KEY=your-vapid-public-key
```

2. **Build for production:**

```bash
npm run build
```

### Deployment Options

#### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  REACT_APP_WEBSOCKET_URL = "wss://api.yourdomain.com"
```

#### Vercel

```json
{
  "name": "propertyhub",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_WEBSOCKET_URL": "wss://api.yourdomain.com"
  }
}
```

## 5. Push Notifications Setup

### VAPID Keys Generation

1. **Generate VAPID keys:**

```bash
npx web-push generate-vapid-keys
```

2. **Configure service worker:**

Update `/public/sw.js` with your domain:

```javascript
// In sw.js, update the VAPID configuration
const VAPID_PUBLIC_KEY = 'your-generated-vapid-public-key';
```

### Firebase Cloud Messaging (Optional)

1. **Create Firebase project:**

```bash
npm install -g firebase-tools
firebase login
firebase init
```

2. **Configure Firebase:**

```javascript
// firebase-config.js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 6. Monitoring and Logging

### Application Monitoring

1. **Install monitoring tools:**

```bash
npm install --save @sentry/node @sentry/tracing
```

2. **Configure Sentry:**

```javascript
// In server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

### Health Checks

1. **Setup health check endpoint:**

```javascript
// Already included in server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

2. **Configure monitoring:**

```bash
# Use services like UptimeRobot or Pingdom
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=your-api-key&format=json&type=1&url=https://api.yourdomain.com/health"
```

## 7. Security Configuration

### Rate Limiting

1. **Configure rate limits:**

```javascript
// Already configured in server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### CORS Configuration

```javascript
// Configure CORS for production
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
  credentials: true
}));
```

### Security Headers

```javascript
// Configure Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));
```

## 8. Performance Optimization

### CDN Configuration

1. **CloudFlare setup:**

```javascript
// Configure CloudFlare for static assets
// Add Page Rules for caching:
// *.yourdomain.com/static/* - Cache Everything, Edge Cache TTL: 1 month
```

### Database Optimization

1. **MongoDB optimization:**

```javascript
// Connection pooling
mongoose.connect(DATABASE_URL, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false
});
```

2. **Redis optimization:**

```javascript
// Redis connection pooling
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});
```

## 9. Backup and Recovery

### Database Backups

1. **MongoDB backup script:**

```bash
#!/bin/bash
# backup-mongodb.sh
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$DATABASE_URL" --out="/backups/mongodb_$DATE"
aws s3 sync /backups/mongodb_$DATE s3://your-backup-bucket/mongodb/$DATE
```

2. **Automated backups with cron:**

```bash
# Add to crontab
0 2 * * * /path/to/backup-mongodb.sh
```

### File Storage Backup

```bash
# S3 cross-region replication
aws s3api put-bucket-replication \
  --bucket propertyhub-chat-files \
  --replication-configuration file://replication.json
```

## 10. Testing in Production

### Load Testing

1. **Install Artillery:**

```bash
npm install -g artillery
```

2. **WebSocket load test:**

```yaml
# load-test.yml
config:
  target: 'wss://api.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
  engines:
    ws:
      pool: 50

scenarios:
  - name: "WebSocket connection test"
    engine: ws
    flow:
      - connect:
          url: "/"
      - send:
          payload: '{"type":"join_room","data":{"roomId":"test"}}'
      - think: 5
      - send:
          payload: '{"type":"send_message","data":{"content":"Test message"}}'
```

### End-to-End Testing

```bash
# Run E2E tests against production
npm run test:e2e:prod
```

## 11. Scaling Considerations

### Horizontal Scaling

1. **Load balancer configuration:**

```nginx
upstream websocket_backend {
    ip_hash; # Ensure sticky sessions for WebSocket
    server app1:8080;
    server app2:8080;
    server app3:8080;
}
```

2. **Redis Cluster:**

```javascript
// Redis cluster configuration
const Redis = require('ioredis');
const cluster = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 }
]);
```

### Auto-scaling with Kubernetes

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: propertyhub-chat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: propertyhub-chat
  template:
    metadata:
      labels:
        app: propertyhub-chat
    spec:
      containers:
      - name: chat-server
        image: propertyhub-chat:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: propertyhub-chat-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: propertyhub-chat
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 12. Maintenance

### Regular Tasks

1. **Log rotation:**

```bash
# /etc/logrotate.d/propertyhub-chat
/var/log/propertyhub-chat/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 nodejs nodejs
    postrotate
        systemctl reload pm2-nodejs
    endscript
}
```

2. **Database maintenance:**

```javascript
// MongoDB maintenance script
// Clean up old messages
db.messages.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});

// Compact collections
db.runCommand({ compact: "messages" });
```

### Updates and Deployments

1. **Zero-downtime deployment:**

```bash
# Blue-green deployment script
#!/bin/bash
# deploy.sh

# Build new version
docker build -t propertyhub-chat:$NEW_VERSION .

# Deploy to blue environment
docker service update --image propertyhub-chat:$NEW_VERSION propertyhub-chat-blue

# Health check
if curl -f http://blue.internal/health; then
    # Switch traffic to blue
    # Update load balancer configuration
    echo "Deployment successful"
else
    echo "Deployment failed, rolling back"
    exit 1
fi
```

## Troubleshooting

### Common Issues

1. **WebSocket connection issues:**

```bash
# Check WebSocket connectivity
wscat -c wss://api.yourdomain.com

# Check logs
pm2 logs propertyhub-chat-server
```

2. **Database connection issues:**

```bash
# Test MongoDB connection
mongosh "mongodb://your-mongo-host:27017/propertyhub-chat"

# Check Redis connection
redis-cli -h your-redis-host ping
```

3. **File upload issues:**

```bash
# Test S3 connectivity
aws s3 ls s3://propertyhub-chat-files

# Check AWS credentials
aws sts get-caller-identity
```

### Performance Issues

1. **Monitor WebSocket connections:**

```javascript
// Add to server.js
setInterval(() => {
  console.log(`Active connections: ${io.engine.clientsCount}`);
  console.log(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
}, 30000);
```

2. **Database query optimization:**

```javascript
// Use MongoDB profiler
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

## Support and Maintenance

- **Monitoring**: Set up alerts for server health, database connections, and error rates
- **Logging**: Centralize logs using ELK stack or similar
- **Security**: Regular security updates and vulnerability scans
- **Backups**: Test backup and recovery procedures regularly
- **Documentation**: Keep deployment and operational documentation updated

This completes the production deployment setup for PropertyHub's advanced chat system with WebSocket server, push notifications, voice messaging, file sharing, and end-to-end encryption.