# PropertyHub Backend - Quick Reference Guide

Fast-access guide for developers working with the PropertyHub backend API.

## Quick Start (5 Minutes)

```bash
# 1. Navigate to backend directory
cd src/backend/websocket-server/

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your settings
# (At minimum: DATABASE_URL, JWT_SECRET)

# 5. Run migrations (if using Supabase)
npm run migrate

# 6. Start development server
npm run dev

# 7. Verify it works
curl http://localhost:8080/health
```

---

## API Endpoints Quick Reference

### Health Check
- `GET /health` → Server status

### Authentication (Not yet implemented - use JWT directly)
- `POST /auth/login` → Login user
- `POST /auth/signup` → Create account
- `POST /auth/refresh` → Refresh token

### Payments (12 endpoints)
```
POST   /api/v1/payments/initialize              Initialize payment
GET    /api/v1/payments/{id}/verify             Verify payment status
GET    /api/v1/payments/history/{userId}        Get payment history (paginated)
POST   /api/v1/payments/{id}/refund             Process refund
```

### Messaging (25+ endpoints)
```
GET    /api/v1/messages/conversations/{userId}           List conversations
POST   /api/v1/messages/conversations/create             Create conversation
GET    /api/v1/messages/conversation/{id}/messages       Get messages
POST   /api/v1/messages/send                             Send message
PUT    /api/v1/messages/{id}/edit                        Edit message
DELETE /api/v1/messages/{id}                             Delete message
POST   /api/v1/messages/{id}/read                        Mark as read
```

### Verification (13 endpoints)
```
POST   /api/v1/verification/start                Start verification
POST   /api/v1/verification/upload-document     Upload document
GET    /api/v1/verification/status/{userId}     Get verification status
```

### Landlord Dashboard (8 endpoints)
```
GET    /api/v1/landlord/analytics/{userId}               Get portfolio analytics
GET    /api/v1/landlord/analytics/property/{id}          Get property analytics
```

### Utilities (6+ endpoints)
```
GET    /api/v1/utilities/services/{propertyId}          List services
POST   /api/v1/utilities/add-service                     Add service
POST   /api/v1/utilities/smart-meter/reading             Log meter reading
```

---

## Environment Variables

```bash
# Server
NODE_ENV=development          # development | staging | production
PORT=8080                    # Server port
HOST=0.0.0.0                 # Listen address

# Database
DATABASE_URL=postgresql://...  # PostgreSQL connection
SUPABASE_URL=https://...       # Supabase URL
SUPABASE_KEY=...               # Supabase key

# Auth
JWT_SECRET=<32-char-min>      # Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRATION=24h            # Token expiration

# Logging
LOG_LEVEL=debug               # error | warn | info | debug
LOG_DIR=./logs                # Log directory

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Features (dev)
ENABLE_PAYMENTS=true
ENABLE_MESSAGING=true
ENABLE_VERIFICATION=true
ENABLE_WHATSAPP_INTEGRATION=false
ENABLE_OCR=false
```

---

## Running Tests

```bash
# All tests (30s timeout)
npm test

# Specific test suites
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:load              # Load tests (60s)

# Watch mode (re-run on file changes)
npm run test:watch

# Run with verbose output
npm test -- --reporter spec
```

**Expected output:**
```
✓ Health Check Endpoints (200ms)
✓ Authentication & Authorization (500ms)
✓ Payment Endpoints (1.2s)
✓ Communication Endpoints (1.5s)
✓ Verification Endpoints (800ms)
... (42 passing in 5.2s)
```

---

## Common Tasks

### Make API Request from Frontend

```typescript
import apiService from '@/services/api';

// Set JWT token
apiService.setToken(jwtToken);

// Make request
const response = await apiService.get('/payments/history/user-123', {
  limit: 10,
  offset: 0
});

console.log(response);  // { success: true, data: [...], pagination: {...} }
```

### Connect WebSocket

```typescript
import messagingService from '@/services/messaging-service';

// Connect with callbacks
await messagingService.connect(token, {
  onMessageReceived: (message) => console.log('New message:', message),
  onTypingIndicator: (userId) => console.log('User typing:', userId),
});

// Join conversation
messagingService.joinConversation('conv-123');

// Send message via REST (also broadcasts via WebSocket)
const message = await messagingService.sendMessage(
  'conv-123',
  'Hello!',
  'text'
);
```

### Initialize Payment

```typescript
import paymentService from '@/services/payment-service';

const result = await paymentService.initializePayment({
  amount: 50000,
  description: 'Rent Payment',
  paymentMethod: 'paystack',
  email: 'user@example.com',
  phone: '+234701234567',
});

// Redirect to payment provider
window.location.href = result.authorization_url;
```

### Verify User is Authenticated

```typescript
// Check auth status
const user = authService.getCurrentUser();
if (!user) {
  // Redirect to login
  navigate('/login');
}

// Or use hook
const { isAuthenticated, user } = useAuth();
```

---

## Database Schemas

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  full_name VARCHAR,
  phone VARCHAR,
  role VARCHAR,  -- 'admin' | 'landlord' | 'tenant' | 'agent'
  is_verified BOOLEAN,
  ...
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type VARCHAR,  -- 'text' | 'image' | 'document' | ...
  status VARCHAR,        -- 'sent' | 'delivered' | 'read' | 'deleted'
  is_edited BOOLEAN,
  read_by UUID[],
  created_at TIMESTAMP,
  ...
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL,
  currency VARCHAR,
  status VARCHAR,        -- 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method VARCHAR, -- 'paystack' | 'flutterwave' | ...
  reference_id VARCHAR,
  created_at TIMESTAMP,
  ...
);
```

For full schema, see: `database-migrations.sql`

---

## Webhook Setup

### Paystack Webhook
1. Get Ngrok URL: `ngrok http 8080` → `https://xxxx.ngrok.io`
2. Dashboard → Settings → Webhooks
3. Add: `https://xxxx.ngrok.io/webhooks/paystack`
4. Events: `charge.success`, `charge.failed`

### Flutterwave Webhook
1. Dashboard → Settings → Webhooks
2. Add: `https://xxxx.ngrok.io/webhooks/flutterwave`
3. Test webhook

---

## Debugging

### View Logs
```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# With grep filter
tail -f logs/combined.log | grep "error"
```

### Enable Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

### Test Database Connection
```bash
# Via psql
psql $DATABASE_URL -c "SELECT 1"

# Via Node
node -e "require('pg').Client; console.log('OK')"
```

### Kill Process on Port
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>
```

---

## Performance Tips

### Database
```typescript
// Use pagination to avoid loading all records
apiService.get('/messages/conversations/user-1', { 
  limit: 20,     // ← limit results
  offset: 0      // ← use offset for pagination
});
```

### Caching
```bash
# Enable Redis caching in .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CACHE_ENABLED=true
```

### Compression
- Automatically enabled via `compression()` middleware
- Reduces response size ~70%

### Monitoring
```bash
# Monitor resource usage
npm install -g pm2
pm2 start api-server.js --watch
pm2 monit
```

---

## File Reference

| File | Purpose | Lines |
|------|---------|-------|
| `api-server.js` | Main Express API | 1,000+ |
| `auth-utils.js` | Authentication utilities | 500+ |
| `backend-tests.js` | Test suite | 700+ |
| `database-migrations.sql` | Database schema | 500+ |
| `.env.example` | Config template | 200+ |
| `Dockerfile` | Container config | 40 |
| `package.json` | Dependencies | 100 |
| `BACKEND_STARTUP_GUIDE.md` | Setup guide | 500+ |
| `BACKEND_DEPLOYMENT_GUIDE.md` | Deployment guide | 500+ |

---

## Deployment

### Docker
```bash
npm run docker:build
npm run docker:run
```

### Docker Compose
```bash
docker-compose up -d
npm run migrate
```

### Kubernetes
```bash
kubectl apply -f k8s-deployment.yaml
kubectl get pods
```

### Environment Secrets (Production)
```bash
kubectl create secret generic propertyhub-env --from-file=.env
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE :::8080` | Port in use | `PORT=8081 npm run dev` |
| `ECONNREFUSED 127.0.0.1:5432` | DB not running | Start PostgreSQL service |
| `Invalid token` | Expired JWT | Generate new token |
| `No auth token` | Missing Authorization header | Set Bearer token |
| `Too many requests` | Rate limited | Wait or increase limit |
| `Cannot find module` | Missing dependency | `npm install` |

---

## Links & Resources

- **API Code**: `src/backend/websocket-server/api-server.js`
- **Tests**: `src/backend/websocket-server/backend-tests.js`
- **Setup**: `BACKEND_STARTUP_GUIDE.md`
- **Integration**: `FRONTEND_BACKEND_INTEGRATION_GUIDE.md`
- **Deployment**: `BACKEND_DEPLOYMENT_GUIDE.md`
- **Database**: `database-migrations.sql`

---

## Support

- Documentation: See guides above
- Tests: `npm test` for validation
- Logs: `logs/combined.log` for debugging
- GitHub Issues: Report bugs
- Slack: #backend-support

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainer**: PropertyHub Backend Team
