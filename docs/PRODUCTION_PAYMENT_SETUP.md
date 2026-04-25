# PropertyHub Production Payment Setup Guide

This guide walks you through setting up production-ready payment processing with Paystack integration, webhook security, and admin analytics.

## 🔐 Production Environment Setup

### 1. Environment Variables Configuration

Create a `.env.production` file or configure your deployment platform with these variables:

```bash
# Production API Configuration
VITE_NODE_ENV=production
VITE_API_URL=https://api.propertyhub.app
VITE_WEBSOCKET_URL=wss://api.propertyhub.app

# Production Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key_here
VITE_PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
VITE_PAYMENT_WEBHOOK_URL=https://api.propertyhub.app/webhooks/paystack

# Backend Environment Variables
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
WEBHOOK_SECRET=your_secure_webhook_secret_64_chars_long

# Database Configuration
DATABASE_URL=mongodb://username:password@your-mongodb-cluster.mongodb.net/propertyhub
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
CLIENT_URLS=https://propertyhub.app,https://www.propertyhub.app

# File Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=propertyhub-production-files

# Monitoring and Logging
SENTRY_DSN=your_sentry_dsn_for_error_tracking
LOG_LEVEL=info
```

### 2. Paystack Account Setup

1. **Create Production Paystack Account**
   - Visit [Paystack Dashboard](https://dashboard.paystack.com)
   - Complete business verification
   - Submit required documents for live mode activation

2. **Obtain Live API Keys**
   ```bash
   # Live Public Key (starts with pk_live_)
   VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx
   
   # Live Secret Key (starts with sk_live_)
   VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
   ```

3. **Configure Webhook URL**
   - In Paystack Dashboard → Settings → Webhooks
   - Add webhook URL: `https://api.propertyhub.app/webhooks/paystack`
   - Select events:
     - `charge.success`
     - `charge.failed`
     - `refund.processed`
     - `dispute.create`
     - `dispute.resolve`

## 🔒 Webhook Security Configuration

### 1. Production Webhook URLs

Configure these webhook endpoints in your production environment:

```javascript
// Primary webhook endpoint for Paystack
https://api.propertyhub.app/webhooks/paystack

// Internal webhook endpoint for custom events
https://api.propertyhub.app/webhooks/payments

// Backup/staging webhook endpoints
https://api-staging.propertyhub.app/webhooks/paystack
https://api-staging.propertyhub.app/webhooks/payments
```

### 2. IP Whitelisting

Add Paystack's IP addresses to your firewall/security groups:

```bash
# Paystack Webhook IP Addresses (as of 2024)
52.31.139.75
52.49.173.169
52.214.14.220
18.201.63.9
3.250.176.89
52.214.213.179
```

### 3. SSL Certificate Configuration

Ensure your webhook endpoints have valid SSL certificates:

```bash
# Verify SSL certificate
curl -I https://api.propertyhub.app/webhooks/paystack

# Expected response headers
HTTP/2 200
content-type: application/json
```

## 📊 Admin Analytics Dashboard Setup

### 1. Database Indices for Performance

Create these MongoDB indices for optimal analytics performance:

```javascript
// Payment transactions indices
db.payments.createIndex({ "createdAt": -1 })
db.payments.createIndex({ "status": 1, "createdAt": -1 })
db.payments.createIndex({ "customerId": 1, "createdAt": -1 })
db.payments.createIndex({ "propertyId": 1, "createdAt": -1 })
db.payments.createIndex({ "paymentMethod": 1, "createdAt": -1 })

// Aggregation indices
db.payments.createIndex({ "createdAt": -1, "status": 1, "amount": 1 })
db.payments.createIndex({ "customerId": 1, "status": 1, "amount": 1 })
```

### 2. Analytics Data Pipeline

Set up automated data aggregation for real-time analytics:

```javascript
// MongoDB Aggregation Pipeline for Daily Revenue
const dailyRevenueAggregation = [
  {
    $match: {
      status: 'succeeded',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      totalRevenue: { $sum: "$amount" },
      transactionCount: { $sum: 1 },
      averageAmount: { $avg: "$amount" }
    }
  },
  {
    $sort: { "_id": 1 }
  }
];
```

### 3. Admin Role Configuration

Ensure admin users have proper access:

```javascript
// Admin user example
{
  "id": "admin_001",
  "email": "admin@propertyhub.app",
  "name": "PropertyHub Admin",
  "role": "admin",
  "permissions": [
    "view_all_payments",
    "view_analytics",
    "process_refunds",
    "manage_users",
    "view_security_logs"
  ]
}
```

## 🚀 Deployment Configuration

### 1. Docker Configuration

Create a production Dockerfile:

```dockerfile
# Production Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/websocket-server/package*.json ./backend/websocket-server/

# Install production dependencies
RUN npm ci --only=production
RUN cd backend/websocket-server && npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "run", "start:production"]
```

### 2. Docker Compose for Production

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - VITE_API_URL=https://api.propertyhub.app
    depends_on:
      - mongodb
      - redis

  websocket-server:
    build: ./backend/websocket-server
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:7
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

volumes:
  mongodb_data:
```

### 3. Nginx Configuration

Configure Nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name api.propertyhub.app;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Webhook endpoints
    location /webhooks/ {
        proxy_pass http://websocket-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for webhooks
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://websocket-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket endpoints
    location /ws/ {
        proxy_pass http://websocket-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔍 Monitoring and Logging

### 1. Payment Monitoring

Set up monitoring for payment health:

```javascript
// Health check endpoint
app.get('/health/payments', async (req, res) => {
  try {
    const paymentHealth = await checkPaymentGatewayHealth();
    res.json({
      status: paymentHealth.status,
      responseTime: paymentHealth.responseTime,
      uptime: paymentHealth.uptime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Payment health check failed' });
  }
});
```

### 2. Error Tracking

Configure Sentry for error tracking:

```javascript
// Sentry configuration
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
});
```

### 3. Webhook Logging

Implement comprehensive webhook logging:

```javascript
// Webhook event logging
function logWebhookEvent(event, data) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    event: event,
    data: {
      reference: data.reference,
      amount: data.amount,
      status: data.status,
      customer: data.customer?.email,
      ip: data.ip_address
    }
  }));
}
```

## 🧪 Testing Production Setup

### 1. Webhook Testing

Test webhook endpoints:

```bash
# Test Paystack webhook
curl -X POST https://api.propertyhub.app/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: your_test_signature" \
  -d '{"event":"charge.success","data":{"reference":"test_ref"}}'

# Test internal webhook
curl -X POST https://api.propertyhub.app/webhooks/payments \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=your_test_signature" \
  -H "X-Webhook-Timestamp: 1640995200" \
  -d '{"type":"payment.succeeded","data":{"reference":"test_ref"}}'
```

### 2. Payment Flow Testing

Test end-to-end payment flow:

```javascript
// Test payment creation
const testPayment = {
  amount: 100000, // ₦1,000
  currency: 'NGN',
  email: 'test@propertyhub.app',
  reference: 'test_' + Date.now()
};

// Initialize payment
const response = await fetch('/api/payments/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayment)
});
```

### 3. Analytics Testing

Verify analytics dashboard:

```bash
# Test analytics endpoint
curl -H "Authorization: Bearer admin_token" \
  "https://api.propertyhub.app/api/payments/analytics?startDate=2024-01-01&endDate=2024-12-31"
```

## 🔧 Maintenance Tasks

### 1. Regular Database Maintenance

```bash
# Weekly payment data cleanup
db.payments.deleteMany({
  status: 'failed',
  createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
});

# Monthly aggregation update
db.payment_aggregations.insertOne({
  period: 'monthly',
  month: '2024-01',
  totalRevenue: 5000000,
  transactionCount: 500,
  successRate: 98.5
});
```

### 2. Security Auditing

```bash
# Review webhook security logs
grep "webhook_security" /var/log/propertyhub/webhooks.log | tail -100

# Check failed payment attempts
db.payments.find({
  status: 'failed',
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).count();
```

### 3. Performance Monitoring

```bash
# Monitor payment processing times
db.payments.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
  { $group: { _id: null, avgProcessingTime: { $avg: "$processingTime" } } }
]);
```

## 📞 Support and Troubleshooting

### Common Issues

1. **Webhook Signature Verification Fails**
   - Check webhook secret configuration
   - Verify Paystack IP addresses
   - Confirm SSL certificate validity

2. **Payment Analytics Not Loading**
   - Check database indices
   - Verify admin user permissions
   - Review API endpoint logs

3. **High Payment Failure Rates**
   - Review Paystack dashboard for declined reasons
   - Check card validation settings
   - Verify currency and amount limits

### Support Contacts

- **Paystack Support**: support@paystack.com
- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@propertyhub.app

---

## Next Steps

After completing this setup:

1. Test all payment flows in staging environment
2. Configure monitoring alerts
3. Set up automated backups
4. Schedule regular security audits
5. Train admin staff on analytics dashboard

For additional help, refer to the [Paystack Documentation](https://paystack.com/docs) and [PropertyHub Development Guide](./DEVELOPMENT.md).