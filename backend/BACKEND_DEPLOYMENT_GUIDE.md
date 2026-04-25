# PropertyHub Backend Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (optional, for caching)
- npm or yarn

### Local Development Setup

1. **Clone and install dependencies:**
```bash
cd src/backend/websocket-server
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database:**
```bash
# Using Supabase (recommended)
# 1. Create a new Supabase project
# 2. Copy your SUPABASE_URL and SUPABASE_KEY to .env
# 3. Run migrations:

psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f database-migrations.sql
```

4. **Start development server:**
```bash
npm run dev
```

Server will be available at `http://localhost:8080`

---

## Environment Configuration

### Required Variables

#### Supabase
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
```

#### Payment Providers (choose one or both)
```env
# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Flutterwave 
FLUTTERWAVE_SECRET_KEY=sk_live_xxxxx
```

#### WhatsApp Integration (choose one)
```env
# Twilio (recommended)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+1234567890

# Meta Business (WhatsApp Cloud API)
META_BUSINESS_TOKEN=xxxxx
META_WHATSAPP_PHONE_ID=xxxxx
```

### Optional Variables
- AWS S3 credentials for file uploads
- Redis connection for caching
- Email/SMS service credentials
- Analytics platform tokens

---

## Deployment

### Docker Deployment

1. **Build image:**
```bash
docker build -t propertyhub-api:latest .
```

2. **Run container:**
```bash
docker run -p 8080:8080 \
  --env-file .env \
  -v logs:/app/logs \
  propertyhub-api:latest
```

3. **Using Docker Compose:**
```bash
docker-compose up -d
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: propertyhub-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: propertyhub-api
  template:
    metadata:
      labels:
        app: propertyhub-api
    spec:
      containers:
      - name: api
        image: propertyhub-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 10
```

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secret
- [ ] Configure all payment provider credentials
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure CORS origins
- [ ] Set up database backups
- [ ] Configure logging aggregation
- [ ] Set up monitoring/alerting
- [ ] Configure rate limiting
- [ ] Test webhook endpoints
- [ ] Set up CDN for static files
- [ ] Configure Redis caching
- [ ] Enable database indexes
- [ ] Set up database connection pooling

---

## Database Setup

### Supabase Setup

1. Create new project at https://supabase.com
2. Get `SUPABASE_URL` and `SUPABASE_KEY`
3. Run migrations:
   ```bash
   psql -h host -U postgres -d database -c "
   CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
   " -f database-migrations.sql
   ```
4. Enable RLS on all tables
5. Set up proper backups

### Local PostgreSQL Setup

```bash
# Create database
createdb propertyhub

# Run migrations
psql -d propertyhub -f database-migrations.sql

# Verify tables
psql -d propertyhub -c "\dt"
```

---

## Payment Provider Setup

### Paystack Integration

1. Create account at https://paystack.com
2. Get API keys from dashboard
3. Add to environment:
   ```env
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   ```
4. Configure webhook:
   - URL: `https://your-api.com/webhooks/paystack`
   - Events: charge.success, charge.failed, refund.processed
5. Test with Paystack test keys first

### Flutterwave Integration

1. Create account at https://flutterwave.com
2. Get API keys
3. Add to environment:
   ```env
   FLUTTERWAVE_SECRET_KEY=sk_live_xxxxx
   ```
4. Configure webhook URL
5. Test integration

---

## WhatsApp Integration Setup

### Option 1: Twilio (Recommended for small-medium apps)

1. Create Twilio account: https://www.twilio.com
2. Get WhatsApp sandbox number
3. Save credentials:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_NUMBER=+1xxxxxxxxxx
   ```
4. Test sending messages
5. Upgrade to production when ready

### Option 2: Meta Business (WhatsApp Cloud API)

1. Set up Meta Business Account
2. Create WhatsApp Business Account
3. Request phone number verification
4. Get Business Token
5. Configure webhook for receiving messages
6. Save credentials:
   ```env
   META_BUSINESS_TOKEN=xxxxx
   META_WHATSAPP_PHONE_ID=xxxxx
   ```

---

## Monitoring & Logging

### Application Logging

Logs are written to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- Console output - Real-time logs

### Log Aggregation (Optional)

```bash
# Example with ELK Stack
# Forward logs to Elasticsearch/Logstash/Kibana

# Example with Datadog
npm install dd-trace
# Configure in api-server.js
```

### Monitoring Metrics

Track these metrics:
- Request count and latency
- Database connection pool usage
- Payment processing success rate
- Message delivery latency
- Error rates by endpoint
- Active WebSocket connections

---

## API Endpoints Summary

### Health Check
- `GET /health`

### Payment System (12 endpoints)
- `POST /api/v1/payments/initialize`
- `GET /api/v1/payments/:paymentId/verify`
- `GET /api/v1/payments/history/:userId`
- `POST /api/v1/payments/:paymentId/refund`
- ... (8 more)

### Utility Management (6+ endpoints)
- `GET /api/v1/utilities/services/:propertyId`
- `POST /api/v1/utilities/add-service`
- `POST /api/v1/utilities/smart-meter/reading`
- ... (3+ more)

### Verification System (13 endpoints)
- `POST /api/v1/verification/start`
- `POST /api/v1/verification/upload-document`
- `GET /api/v1/verification/status/:userId`
- ... (10 more)

### Landlord Dashboard (8 endpoints)
- `GET /api/v1/landlord/analytics/:userId`
- `GET /api/v1/landlord/analytics/property/:propertyId`
- ... (6 more)

### Communication System (25+ endpoints)
- `GET /api/v1/messages/conversations/:userId`
- `POST /api/v1/messages/conversations/create`
- `GET /api/v1/messages/conversation/:conversationId/messages`
- `POST /api/v1/messages/send`
- `PUT /api/v1/messages/:messageId/edit`
- `DELETE /api/v1/messages/:messageId`
- `POST /api/v1/messages/:messageId/read`
- ... (18+ more)

---

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run load-test
```

---

## Troubleshooting

### Common Issues

1. **Connection refused to Supabase**
   - Verify SUPABASE_URL and SUPABASE_KEY
   - Check firewall rules
   - Verify database is running

2. **Payment webhook not receiving events**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Verify event types are enabled

3. **WhatsApp messages not sending**
   - Verify credentials are correct
   - Check phone number format
   - Verify rate limits not exceeded

4. **High memory usage**
   - Check Redis persistence settings
   - Verify database connection pooling
   - Monitor active WebSocket connections

### Debug Mode
```bash
DEBUG=propertyhub:* npm start
```

---

## Performance Optimization

### Database
- Enable connection pooling (max 20-50 connections)
- Index frequently queried columns
- Archive old messages/logs regularly
- Set up automatic backups

### Caching
- Cache conversation lists (5 min TTL)
- Cache analytics data (1 hour TTL)
- Cache user profiles (30 min TTL)

### Load Balancing
- Use Round-Robin load balancer
- Scale horizontally with multiple instances
- Use Redis for session sharing

---

## Security Checklist

- [ ] HTTPS/SSL enabled
- [ ] JWT secret rotated
- [ ] Database credentials in .env
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Webhook signatures verified
- [ ] Payment data encrypted
- [ ] User passwords hashed
- [ ] SQL injection prevention
- [ ] CSRF token validation
- [ ] Input validation on all endpoints
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Support & Resources

- API Documentation: `/docs`
- WebSocket Events: `wss://api.propertyhub.com`
- Status Page: `https://status.propertyhub.com`
- Community: `https://community.propertyhub.com`
- Support Email: `support@propertyhub.com`

---

## Version History

- **v1.0.0** (Current) - Initial production release
  - 5 major features
  - 64+ API endpoints
  - Real-time WebSocket support
  - Payment integration
  - Verification system
  - Communication system

---

*Last Updated: April 2026*
