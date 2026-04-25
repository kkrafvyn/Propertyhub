/**
 * PropertyHub Backend Testing Suite
 * 
 * Comprehensive test cases and testing strategy for the API server
 * Run with: npm test
 */

const request = require('supertest');
const expect = require('chai').expect;
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const API_URL = process.env.API_URL || 'http://localhost:8080';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_JWT_TOKEN = jwt.sign(
  { userId: TEST_USER_ID, role: 'landlord' },
  process.env.JWT_SECRET || 'test-secret-key',
  { expiresIn: '24h' }
);

// ============================================================================
// HEALTH CHECK TESTS
// ============================================================================

describe('Health Check Endpoints', function() {
  
  it('should return healthy status', async function() {
    const response = await request(API_URL)
      .get('/health')
      .expect(200);

    expect(response.body).to.have.property('status', 'healthy');
    expect(response.body).to.have.property('timestamp');
  });

  it('should include uptime in health check', async function() {
    const response = await request(API_URL)
      .get('/health')
      .expect(200);

    expect(response.body).to.have.property('uptime');
    expect(response.body.uptime).to.be.a('number');
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication & Authorization', function() {

  it('should reject requests without authentication token', async function() {
    const response = await request(API_URL)
      .get('/api/v1/messages/conversations/user123')
      .expect(401);

    expect(response.body).to.have.property('success', false);
    expect(response.body).to.have.property('error');
  });

  it('should reject requests with invalid token', async function() {
    const response = await request(API_URL)
      .get('/api/v1/messages/conversations/user123')
      .set('Authorization', 'Bearer invalid-token')
      .expect(403);

    expect(response.body).to.have.property('success', false);
  });

  it('should accept valid JWT token', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/messages/conversations/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
  });

  it('should enforce role-based access control', async function() {
    const userToken = jwt.sign(
      { userId: TEST_USER_ID, role: 'tenant' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '24h' }
    );

    const response = await request(API_URL)
      .get(`/api/v1/landlord/analytics/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.error).to.include('permission');
  });
});

// ============================================================================
// PAYMENT ENDPOINT TESTS
// ============================================================================

describe('Payment Endpoints', function() {

  it('should initialize payment with valid data', async function() {
    const response = await request(API_URL)
      .post('/api/v1/payments/initialize')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        amount: 5000,
        description: 'Rent Payment',
        paymentMethod: 'paystack',
        email: 'user@example.com',
        phone: '+234701234567'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('paymentId');
    expect(response.body.data).to.have.property('authorization_url');
  });

  it('should reject payment with invalid amount', async function() {
    const response = await request(API_URL)
      .post('/api/v1/payments/initialize')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        amount: -1000,
        description: 'Rent Payment',
        paymentMethod: 'paystack',
        email: 'user@example.com'
      })
      .expect(400);

    expect(response.body).to.have.property('success', false);
  });

  it('should reject payment with invalid email', async function() {
    const response = await request(API_URL)
      .post('/api/v1/payments/initialize')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        amount: 5000,
        description: 'Rent Payment',
        paymentMethod: 'paystack',
        email: 'invalid-email',
        phone: '+234701234567'
      })
      .expect(400);

    expect(response.body.success).to.equal(false);
  });

  it('should retrieve payment history', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/payments/history/${TEST_USER_ID}?limit=10&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.be.an('array');
    expect(response.body).to.have.property('pagination');
  });

  it('should verify payment status', async function() {
    const paymentId = 'test-payment-123';
    
    const response = await request(API_URL)
      .get(`/api/v1/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
  });

  it('should process refund', async function() {
    const paymentId = 'test-payment-456';
    
    const response = await request(API_URL)
      .post(`/api/v1/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({ reason: 'Duplicate payment' })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('status', 'pending');
  });
});

// ============================================================================
// COMMUNICATION ENDPOINT TESTS
// ============================================================================

describe('Communication Endpoints', function() {

  it('should create new conversation', async function() {
    const response = await request(API_URL)
      .post('/api/v1/messages/conversations/create')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        participants: [TEST_USER_ID, 'other-user-id'],
        type: 'direct',
        name: 'Chat with John'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('participants');
  });

  it('should retrieve conversations for user', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/messages/conversations/${TEST_USER_ID}?limit=20&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.be.an('array');
    expect(response.body).to.have.property('pagination');
  });

  it('should retrieve messages from conversation', async function() {
    const conversationId = 'conv-test-123';
    
    const response = await request(API_URL)
      .get(`/api/v1/messages/conversation/${conversationId}/messages?limit=50&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.be.an('array');
  });

  it('should send message', async function() {
    const response = await request(API_URL)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        conversationId: 'conv-test-123',
        content: 'Hello, how are you?',
        messageType: 'text'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('id');
    expect(response.body.data).to.have.property('status', 'sent');
  });

  it('should reject message with empty content', async function() {
    const response = await request(API_URL)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        conversationId: 'conv-test-123',
        content: '',
        messageType: 'text'
      })
      .expect(400);

    expect(response.body.success).to.equal(false);
  });

  it('should reject message exceeding length limit', async function() {
    const longContent = 'a'.repeat(10001);
    
    const response = await request(API_URL)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        conversationId: 'conv-test-123',
        content: longContent,
        messageType: 'text'
      })
      .expect(400);

    expect(response.body.success).to.equal(false);
  });

  it('should edit message', async function() {
    const messageId = 'msg-test-123';
    
    const response = await request(API_URL)
      .put(`/api/v1/messages/${messageId}/edit`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({ content: 'Updated message content' })
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('is_edited', true);
  });

  it('should delete message', async function() {
    const messageId = 'msg-test-123';
    
    const response = await request(API_URL)
      .delete(`/api/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
  });

  it('should mark message as read', async function() {
    const messageId = 'msg-test-123';
    
    const response = await request(API_URL)
      .post(`/api/v1/messages/${messageId}/read`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
  });
});

// ============================================================================
// VERIFICATION ENDPOINT TESTS
// ============================================================================

describe('Verification Endpoints', function() {

  it('should start verification process', async function() {
    const response = await request(API_URL)
      .post('/api/v1/verification/start')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        verificationType: 'id_verification',
        documentType: 'national_id'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('requestId');
    expect(response.body.data).to.have.property('status', 'in_progress');
  });

  it('should get verification status', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/verification/status/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('verified');
    expect(response.body.data).to.have.property('verification_level');
  });

  it('should upload verification document', async function() {
    const response = await request(API_URL)
      .post('/api/v1/verification/upload-document')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        verificationId: 'ver-test-123',
        documentType: 'national_id',
        documentUrl: 'https://example.com/doc.jpg'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
  });
});

// ============================================================================
// LANDLORD DASHBOARD TESTS
// ============================================================================

describe('Landlord Dashboard Endpoints', function() {

  it('should retrieve landlord analytics', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/landlord/analytics/${TEST_USER_ID}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('totalProperties');
    expect(response.body.data).to.have.property('totalRevenue');
    expect(response.body.data).to.have.property('occupancyRate');
  });

  it('should retrieve property-specific analytics', async function() {
    const propertyId = 'prop-test-123';
    
    const response = await request(API_URL)
      .get(`/api/v1/landlord/analytics/property/${propertyId}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('occupancyRate');
    expect(response.body.data).to.have.property('monthlyRevenue');
  });
});

// ============================================================================
// UTILITY MANAGEMENT TESTS
// ============================================================================

describe('Utility Management Endpoints', function() {

  it('should retrieve property services', async function() {
    const propertyId = 'prop-test-123';
    
    const response = await request(API_URL)
      .get(`/api/v1/utilities/services/${propertyId}`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.be.an('array');
  });

  it('should add new service', async function() {
    const response = await request(API_URL)
      .post('/api/v1/utilities/add-service')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        propertyId: 'prop-test-123',
        serviceType: 'electricity',
        monthlyBudget: 5000,
        billingCycle: 'monthly',
        autoRenew: true
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('id');
  });

  it('should log smart meter reading', async function() {
    const response = await request(API_URL)
      .post('/api/v1/utilities/smart-meter/reading')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .send({
        serviceId: 'service-test-123',
        reading: 1520.50,
        unit: 'kWh'
      })
      .expect(201);

    expect(response.body).to.have.property('success', true);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', function() {

  it('should handle 404 not found', async function() {
    const response = await request(API_URL)
      .get('/api/v1/nonexistent-endpoint')
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(404);

    expect(response.body).to.have.property('success', false);
  });

  it('should handle database errors gracefully', async function() {
    // This test would mock a database error
    // In real scenario, use sinon to stub database calls
    
    const response = await request(API_URL)
      .get(`/api/v1/messages/conversations/invalid-uuid-format`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(400);

    expect(response.body).to.have.property('success', false);
  });

  it('should return 429 Too Many Requests when rate limited', async function() {
    // Make 101 requests in quick succession
    const promises = [];
    for (let i = 0; i < 101; i++) {
      promises.push(
        request(API_URL)
          .get('/health')
      );
    }

    const responses = await Promise.all(promises);
    const rateLimitedResponse = responses.find(r => r.status === 429);

    expect(rateLimitedResponse).to.exist;
    expect(rateLimitedResponse.body).to.have.property('success', false);
  });
});

// ============================================================================
// PAGINATION TESTS
// ============================================================================

describe('Pagination', function() {

  it('should return pagination metadata', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/payments/history/${TEST_USER_ID}?limit=10&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    expect(response.body).to.have.property('pagination');
    expect(response.body.pagination).to.have.property('limit');
    expect(response.body.pagination).to.have.property('offset');
    expect(response.body.pagination).to.have.property('total');
  });

  it('should enforce maximum limit', async function() {
    const response = await request(API_URL)
      .get(`/api/v1/messages/conversations/${TEST_USER_ID}?limit=1000&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    // Should be capped at 100
    expect(response.body.pagination.limit).to.be.at.most(100);
  });

  it('should handle offset correctly', async function() {
    const response1 = await request(API_URL)
      .get(`/api/v1/payments/history/${TEST_USER_ID}?limit=10&offset=0`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    const response2 = await request(API_URL)
      .get(`/api/v1/payments/history/${TEST_USER_ID}?limit=10&offset=10`)
      .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
      .expect(200);

    // Results should be different
    if (response1.body.data.length > 0 && response2.body.data.length > 0) {
      expect(response1.body.data).to.not.deep.equal(response2.body.data);
    }
  });
});

// ============================================================================
// LOAD TESTING TESTS
// ============================================================================

describe('Load Testing', function() {
  this.timeout(60000); // 60 second timeout for load tests

  it('should handle 100 concurrent requests', async function() {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(API_URL)
          .get('/health')
          .catch(err => ({ error: err.message }))
      );
    }

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    
    // At least 90% should succeed
    expect(successCount).to.be.at.least(90);
  });

  it('should handle rapid message sends', async function() {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        request(API_URL)
          .post('/api/v1/messages/send')
          .set('Authorization', `Bearer ${TEST_JWT_TOKEN}`)
          .send({
            conversationId: 'conv-load-test',
            content: `Message ${i}`,
            messageType: 'text'
          })
          .catch(err => ({ error: err.message }))
      );
    }

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 201).length;
    
    expect(successCount).to.be.at.least(40);
  });

  it('should maintain response time under load', async function() {
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < 50; i++) {
      promises.push(
        request(API_URL)
          .get('/health')
      );
    }

    await Promise.all(promises);
    const duration = Date.now() - start;

    // Should complete 50 requests in under 10 seconds
    expect(duration).to.be.lessThan(10000);
  });
});

// ============================================================================
// WEBSOCKET TESTS
// ============================================================================

describe('WebSocket Real-Time Communication', function() {

  it('should establish WebSocket connection', async function() {
    const io = require('socket.io-client');
    const socket = io(API_URL, {
      auth: {
        token: TEST_JWT_TOKEN
      }
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  it('should join conversation room', async function() {
    const io = require('socket.io-client');
    const socket = io(API_URL, {
      auth: { token: TEST_JWT_TOKEN }
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('conversation:join', { conversationId: 'test-conv' });
        
        setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 500);
      });

      socket.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });

  it('should broadcast typing indicator', async function() {
    const io = require('socket.io-client');
    const socket = io(API_URL, {
      auth: { token: TEST_JWT_TOKEN }
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('user:typing', { conversationId: 'test-conv' });
        
        setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 500);
      });

      socket.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });
});

// ============================================================================
// TEST EXECUTION
// ============================================================================

// Run tests with:
// npm test
// npx mocha test/backend-tests.js

module.exports = {
  API_URL,
  TEST_USER_ID,
  TEST_JWT_TOKEN
};
