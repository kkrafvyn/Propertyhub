# PropertyHub Backend Startup Guide

Complete step-by-step guide to get the backend API server running locally and in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Server](#running-the-server)
6. [API Testing](#api-testing)
7. [Webhook Configuration](#webhook-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## Prerequisites

### System Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v8.0.0 or higher
- **PostgreSQL**: v12.0 or higher (or Supabase account)
- **Git**: For version control
- **Docker**: (Optional) For containerized deployment

### Verify Installation

```bash
node --version      # v16.0.0+
npm --version       # v8.0.0+
git --version       # Any recent version
```

### Install Tools

**Windows (using Chocolatey):**
```powershell
choco install nodejs git postgresql
```

**macOS (using Homebrew):**
```bash
brew install node git postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nodejs npm git postgresql
```

---

## Local Development Setup

### Step 1: Install Backend Dependencies

Navigate to the backend directory and install npm packages:

```bash
cd src/backend/websocket-server/
npm install
```

This will install all dependencies listed in `package.json` including:
- Express.js (web framework)
- Socket.io (real-time communication)
- @supabase/supabase-js (database client)
- JWT libraries (authentication)
- Winston (logging)
- And 20+ more production packages

**Expected output:**
```
added 200+ packages in 45s
```

### Step 2: Copy Environment Template

Copy the environment configuration template:

```bash
cp .env.example .env
```

### Step 3: Configure `.env` File

Edit `.env` file with your local configuration:

```bash
# Development Configuration
NODE_ENV=development
PORT=8080
HOST=0.0.0.0

# Supabase Local (Development)
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/propertyhub_dev

# JWT Configuration
JWT_SECRET=your-super-secret-key-at-least-32-characters-minimum
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=another-super-secret-key-32-chars-minimum

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Features (Development)
ENABLE_PAYMENTS=true
ENABLE_MESSAGING=true
ENABLE_VERIFICATION=true
ENABLE_WHATSAPP_INTEGRATION=false
ENABLE_OCR=false
```

---

## Environment Configuration

### Required Variables Explained

#### Server Configuration
```
NODE_ENV=development          # development | staging | production
PORT=8080                     # Server port
HOST=0.0.0.0                  # Listen on all interfaces
```

#### Database Configuration
```
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your_anon_key
DATABASE_URL=postgresql://user:password@host:port/dbname
```

#### Authentication
```
JWT_SECRET=minimum-32-character-secret-key-here
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=another-32-char-minimum-secret-key
```

#### Payment Providers (Optional for Development)
```
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
```

#### Logging
```
LOG_LEVEL=debug               # error | warn | info | debug | verbose
LOG_DIR=./logs               # Directory for log files
```

### Generate Strong JWT Secrets

Use Node.js to generate secure random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command twice and use the output for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.

---

## Database Setup

### Option 1: Supabase (Recommended for Development)

**Benefits:**
- Zero infrastructure management
- Built-in authentication
- Automatic backups
- Free tier available

**Setup Steps:**

1. **Create Supabase Project:**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create new project with:
     - Organization: Create new or select existing
     - Project name: `propertyhub-dev`
     - Database password: Save securely
     - Region: Closest to your location
     - Pricing plan: Free tier is fine for development

2. **Get Credentials:**
   - After project creation, go to Settings → API
   - Copy `Project URL` → `SUPABASE_URL` in `.env`
   - Copy `anon public` key → `SUPABASE_KEY` in `.env`
   - Copy `service_role` key → `SUPABASE_SERVICE_KEY` in `.env`

3. **Get Database Connection:**
   - Settings → Database
   - Copy connection string
   - Format: `postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres`
   - Use for `DATABASE_URL` in `.env`

4. **Run Migrations:**
   ```bash
   npm run migrate
   # This creates all 19 tables in database
   ```

5. **Verify Connection:**
   ```bash
   npm run test:unit
   # Should connect without errors
   ```

### Option 2: Local PostgreSQL

**Setup Steps:**

1. **Start PostgreSQL Service:**

   **Windows:**
   ```
   Or the PostgreSQL service should auto-start
   ```

   **macOS:**
   ```bash
   brew services start postgresql
   ```

   **Linux:**
   ```bash
   sudo systemctl start postgresql
   ```

2. **Create Database:**
   ```bash
   psql -U postgres
   postgres=# CREATE DATABASE propertyhub_dev;
   postgres=# \q
   ```

3. **Set Connection String in `.env`:**
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/propertyhub_dev
   ```

4. **Run Migrations:**
   ```bash
   npm run migrate
   ```

5. **Verify Connection:**
   ```bash
   npm run test:unit
   ```

### Option 3: Docker Compose (Advanced)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: propertyhub_dev
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Start services:
```bash
docker-compose up -d
npm run migrate
```

---

## Running the Server

### Development Mode (With Hot Reload)

The server automatically restarts when you save file changes:

```bash
npm run dev
```

**Expected output:**
```
[2024-01-15T10:30:00.123Z] info: Server running on http://0.0.0.0:8080
[2024-01-15T10:30:00.125Z] info: WebSocket server listening on port 8080
[2024-01-15T10:30:00.126Z] info: Database connected
```

### Production Mode

Run the server without hot reload:

```bash
npm start
```

### Access the Server

- **Health Check**: `http://localhost:8080/health`
- **API Base URL**: `http://localhost:8080/api/v1`
- **WebSocket**: `ws://localhost:8080` (auto via Socket.io)

### Test Connection

```bash
# In another terminal
curl -X GET http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:05.123Z",
  "uptime": 5.123
}
```

---

## API Testing

### Using cURL

**Get Conversations (Requires Authentication):**

```bash
# First, get a JWT token (mock for development)
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Fetch conversations
curl -X GET \
  http://localhost:8080/api/v1/messages/conversations/user-id \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Send Message:**

```bash
curl -X POST http://localhost:8080/api/v1/messages/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "content": "Hello!",
    "messageType": "text"
  }'
```

### Using Postman

1. **Import Collection:**
   - Download `propertyhub-api.postman_collection.json`
   - Open Postman → Collections → Import

2. **Set Variables:**
   - Collection → Edit → Variables
   - Set `base_url` = `http://localhost:8080`
   - Set `jwt_token` = Your test token

3. **Run Requests:**
   - All requests use `{{base_url}}` and `{{jwt_token}}`
   - Pre-configured for testing all 64+ endpoints

### Using npm Scripts

**Run Test Suite:**

```bash
# All tests with 30s timeout
npm test

# Only unit tests
npm run test:unit

# Only integration tests
npm run test:integration

# Load tests (100+ concurrent requests)
npm run test:load

# Watch mode (re-run on file changes)
npm run test:watch
```

**Example Test Output:**
```
Health Check Endpoints
  ✓ should return healthy status (125ms)
  ✓ should include uptime in health check (98ms)

Authentication & Authorization
  ✓ should reject requests without authentication token (256ms)
  ✓ should accept valid JWT token (234ms)
  ✓ should enforce role-based access control (189ms)

Communication Endpoints
  ✓ should create new conversation (567ms)
  ✓ should retrieve conversations for user (345ms)
  ✓ should send message (456ms)
  ✓ should reject message with empty content (123ms)

...
42 passing (5.2s)
```

---

## Webhook Configuration

### Paystack Webhooks

**Setup Steps:**

1. **Get Webhook URL:**
   - Local: Use [Ngrok](https://ngrok.com) to expose local server
     ```bash
     ngrok http 8080
     # Get URL: https://xxxx-xx-xxx-xxx-xx.ngrok.io
     ```

2. **Configure in Paystack Dashboard:**
   - Go to [dashboard.paystack.com](https://dashboard.paystack.com)
   - Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/webhooks/paystack`
   - Select events: `charge.success`, `charge.failed`
   - Save

3. **Get Webhook Secret:**
   - Settings → API Keys & Webhooks
   - Copy webhook secret
   - Add to `.env`: `PAYSTACK_WEBHOOK_SECRET=xxx`

### Flutterwave Webhooks

**Setup Steps:**

1. **Get Webhook URL:**
   - Use Ngrok URL from above: `https://xxxx-xx-xxx-xxx-xx.ngrok.io`

2. **Configure in Flutterwave Dashboard:**
   - Go to [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
   - Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/webhooks/flutterwave`
   - Test webhook

3. **Get Webhook Secret:**
   - Copy webhook secret from dashboard
   - Add to `.env`: `FLUTTERWAVE_WEBHOOK_SECRET=xxx`

### WhatsApp Integration (Optional)

**Using Twilio:**

1. **Create Twilio Account:**
   - Go to [twilio.com](https://twilio.com)
   - Create account and project

2. **Get Credentials:**
   - Account SID: `AC...`
   - Auth Token: `xxxxx`
   - WhatsApp Phone: `+1...`

3. **Add to `.env`:**
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_NUMBER=+1...
   WHATSAPP_PROVIDER=twilio
   ```

### Testing Webhooks Locally

Use `ngrok` to tunnel local requests:

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 8080

# Terminal 3: Send local webhook test
curl -X POST \
  http://localhost:8080/webhooks/paystack \
  -H "x-paystack-signature: test-signature" \
  -H "Content-Type: application/json" \
  -d '{"event": "charge.success", "data": {"reference": "ref123"}}'
```

---

## Troubleshooting

### Common Issues & Solutions

#### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::8080`

**Solution:**

```bash
# Find process using port 8080
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Or use different port
PORT=8081 npm run dev
```

#### Database Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Check if PostgreSQL is running
# Windows: Check Services app

# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### JWT Token Invalid

**Error:** `Error: Invalid or expired token`

**Solution:**

```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env with new secret
JWT_SECRET=new-secret-here

# Test with new token (generated by auth endpoint)
npm run test
```

#### Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**

```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### WebSocket Connection Failed

**Error:** `WebSocket connection error`

**Solution:**

```bash
# Check CORS configuration in .env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Verify Socket.io is initialized in api-server.js
# Restart server
npm run dev
```

#### Slow Performance

**Solutions:**

1. **Check Database Connection:**
   ```bash
   npm run test:unit
   ```

2. **Enable Caching:**
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_CACHE_ENABLED=true
   ```

3. **Monitor Resource Usage:**
   ```bash
   # In separate terminal
   npm install -g pm2
   pm2 start api-server.js --watch
   pm2 monit
   ```

### Debug Mode

Enable detailed logging:

```bash
# Set maximum verbosity
LOG_LEVEL=debug npm run dev

# Watch logs in real-time
tail -f logs/combined.log
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations executed
- [ ] SSL certificate installed
- [ ] Payment provider accounts verified
- [ ] WhatsApp webhooks configured
- [ ] All tests passing: `npm test`
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting setup

### Docker Deployment

**Build Image:**

```bash
npm run docker:build
```

**Run Container:**

```bash
npm run docker:run
```

**Or manually:**

```bash
docker run -d \
  -p 8080:8080 \
  --env-file .env \
  --name propertyhub-api \
  propertyhub-api:latest
```

### Kubernetes Deployment

**Deploy to Kubernetes:**

```bash
kubectl apply -f k8s-deployment.yaml
kubectl get pods
kubectl logs -f deployment/propertyhub-api
```

### Environment Secrets

**For Production, use secrets management:**

```bash
# Create Kubernetes secret
kubectl create secret generic propertyhub-env \
  --from-file=.env.production

# Reference in deployment
valueFrom:
  secretKeyRef:
    name: propertyhub-env
    key: JWT_SECRET
```

### Monitoring & Logs

**Setup Logging:**

```bash
# Install log aggregation
npm install --save winston winston-loki

# Logs automatically sent to Loki/Grafana
```

**View Logs:**

```bash
# Local logs
tail -f logs/combined.log

# Container logs
docker logs propertyhub-api -f

# Kubernetes logs
kubectl logs -f pod/propertyhub-api-xxxxx
```

---

## Getting Help

### Resources

- **Documentation**: [BACKEND_DEPLOYMENT_GUIDE.md](./BACKEND_DEPLOYMENT_GUIDE.md)
- **API Reference**: [api-server.js](./api-server.js) - Inline code comments
- **Database Schema**: [database-migrations.sql](./database-migrations.sql)
- **Test Suite**: [backend-tests.js](./backend-tests.js)

### Support Channels

- GitHub Issues: Report bugs
- Slack Channel: #backend-support
- Email: backend@propertyhub.com

### Next Steps

1. **Verify everything works:**
   ```bash
   npm run dev
   npm test
   ```

2. **Integrate with frontend:**
   - Update frontend API endpoints in `src/services/api.ts`
   - Replace mock data with real API calls

3. **Setup external services:**
   - Configure Paystack/Flutterwave
   - Configure WhatsApp provider
   - Configure email service

4. **Deploy to staging:**
   - Test all features end-to-end
   - Performance testing
   - Security testing

5. **Deploy to production:**
   - Follow production checklist
   - Setup monitoring
   - Setup backups

---

**Last Updated:** January 2024
**Maintained By:** PropertyHub Backend Team
