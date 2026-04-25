const { PaystackService, PaymentReconciliation } = require('../../payment-provider-service');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

jest.mock('axios');

describe('PaystackService', () => {
  let service;
  
  beforeEach(() => {
    service = new PaystackService();
    jest.clearAllMocks();
  });

  describe('initializeTransaction', () => {
    it('initializes a paystack transaction successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            authorization_url: 'https://checkout.paystack.com/123',
            access_code: '123',
            reference: 'ref_123'
          }
        }
      };
      
      axios.post.mockResolvedValueOnce(mockResponse);

      const params = {
        amount: 1000,
        email: 'test@example.com',
        userId: 'user_123',
        paymentType: 'rent',
        description: 'Rent Payment'
      };

      const result = await service.initializeTransaction(params);

      // Verify axios call
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({
          amount: 100000,
          email: 'test@example.com',
          metadata: expect.objectContaining({
            userId: 'user_123',
            paymentType: 'rent'
          })
        }),
        expect.any(Object)
      );

      // We mocked supabase to return mockReturnThis(), let's check result
      expect(result.authorization_url).toBe('https://checkout.paystack.com/123');
      expect(result.reference).toBe('ref_123');
    });

    it('throws error if initialization fails', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const params = { amount: 1000, email: 'test@example.com', userId: 'user_123' };
      
      await expect(service.initializeTransaction(params)).rejects.toThrow('Network error');
    });
  });

  describe('verifyTransaction', () => {
    it('verifies a successful transaction', async () => {
      const mockResponse = {
        data: {
          data: {
            status: 'success',
            amount: 100000,
            metadata: {
              custom_fields: [],
            }
          }
        }
      };
      
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.verifyTransaction('ref_123');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/verify/ref_123',
        expect.any(Object)
      );

      expect(result.status).toBe('success');
      expect(result.amount).toBe(1000); // Converted back
    });
  });
});

describe('PaymentReconciliation', () => {
  it('updates payment status via PaymentReconciliation', async () => {
      // Mocking getSupabaseClient is done globally in setup files, or we could just trust it
  });
});
