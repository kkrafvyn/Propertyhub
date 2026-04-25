const request = require('supertest');
const app = require('../../api-server');
const { createClient } = require('@supabase/supabase-js');

// Mock services to avoid external API calls during integration tests
jest.mock('../../payment-provider-service');
jest.mock('../../verification-service');
jest.mock('../../whatsapp-service');
jest.mock('../../notification-service');

describe('PropertyHub API Integration Flows', () => {
  let authToken;
  const mockUserId = '8f5e1c2d-3b4a-5e6f-7g8h-9i0j1k2l3m4n';

  beforeAll(() => {
    // Generate a mock JWT token for testing
    const { generateToken } = require('../../auth-utils');
    authToken = generateToken(mockUserId, 'user');
  });

  describe('Payment Integration Flow', () => {
    it('should initialize a payment and handle webhook completion', async () => {
      // 1. Initialize Payment
      const initResponse = await request(app)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1500.50,
          email: 'tenant@example.com',
          paymentMethod: 'paystack',
          description: 'January Rent'
        });

      expect(initResponse.status).toBe(200);
      expect(initResponse.body.success).toBe(true);
      expect(initResponse.body.data).toHaveProperty('authorization_url');

      // 2. Simulate Webhook Success
      const webhookResponse = await request(app)
        .post('/webhooks/paystack')
        .send({
          event: 'charge.success',
          data: {
            reference: initResponse.body.data.reference,
            status: 'success',
            amount: 150050,
            customer: { email: 'tenant@example.com' },
            metadata: { userId: mockUserId }
          }
        })
        .set('x-paystack-signature', 'valid_mock_signature');

      expect(webhookResponse.status).toBe(200);
    });
  });

  describe('Verification Integration Flow', () => {
    it('should handle document upload and initiate OCR', async () => {
      const uploadResponse = await request(app)
        .post('/api/v1/verification/upload-document')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verificationId: 'v_123',
          documentType: 'national_id',
          documentUrl: 'https://storage.example.com/id.jpg'
        });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.ocr_status).toBe('processing');
    });
  });

  describe('Landlord Analytics Flow', () => {
    it('should return portfolio statistics for landord', async () => {
      const response = await request(app)
        .get(`/api/v1/landlord/analytics/${mockUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
    });
  });
});
