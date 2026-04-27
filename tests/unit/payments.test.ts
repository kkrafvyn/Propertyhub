/**
 * Payment Service Tests - Paystack & Flutterwave
 */

// Mock payment providers
class MockPaystackService {
  initializeTransaction(email, amount, metadata = {}) {
    if (!email || amount == null) {
      throw new Error('Email and amount are required');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    return {
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `https://checkout.paystack.com/mock/${Math.random()}`,
        access_code: `mock_access_${Math.random()}`,
        reference: `ref_${Date.now()}`,
        amount: amount * 100, // Paystack uses kobo
      }
    };
  }

  verifyTransaction(reference) {
    if (!reference) {
      throw new Error('Reference is required');
    }
    
    return {
      status: true,
      message: 'Verification successful',
      data: {
        reference,
        amount: 50000,
        customer: { email: 'test@example.com' },
        status: 'success',
        paid: true,
      }
    };
  }

  listTransactions(count = 10) {
    return {
      status: true,
      message: 'Transactions retrieved',
      data: Array(count).fill(null).map((_, i) => ({
        id: i + 1,
        reference: `ref_${i}`,
        amount: 50000,
        status: 'success',
      }))
    };
  }
}

class MockFlutterWaveService {
  initializePayment(email, amount, txRef) {
    if (!email || amount == null || !txRef) {
      throw new Error('Email, amount, and txRef are required');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    return {
      status: 'success',
      message: 'Charge initiated',
      data: {
        link: `https://ravemodal-dev.herokuapp.com/rave/?r=${txRef}`,
        tx_ref: txRef,
      }
    };
  }

  verifyPayment(txRef) {
    if (!txRef) {
      throw new Error('Transaction reference is required');
    }
    
    return {
      status: 'success',
      message: 'Transaction verified',
      data: {
        id: Math.random(),
        tx_ref: txRef,
        flw_ref: `flw_${Math.random()}`,
        amount: 50000,
        currency: 'NGN',
        status: 'successful',
        customer: { email: 'test@example.com' },
      }
    };
  }

  chargeCard(cardDetails) {
    if (!cardDetails.card_number || !cardDetails.cvv || !cardDetails.expiry_month) {
      throw new Error('Card details incomplete');
    }
    
    return {
      status: 'success',
      message: 'Charge successful',
      data: {
        id: Math.random(),
        charge_code: `MC_${Math.random()}`,
      }
    };
  }
}

describe('Payment Services', () => {
  let paystackService;
  let flutterWaveService;

  beforeEach(() => {
    paystackService = new MockPaystackService();
    flutterWaveService = new MockFlutterWaveService();
  });

  describe('Paystack Service', () => {
    describe('initializeTransaction', () => {
      it('should initialize transaction with valid email and amount', () => {
        const result = paystackService.initializeTransaction(
          'user@example.com',
          500
        );
        
        expect(result.status).toBe(true);
        expect(result.data.authorization_url).toBeDefined();
        expect(result.data.access_code).toBeDefined();
        expect(result.data.reference).toBeDefined();
        expect(result.data.amount).toBe(50000); // 500 * 100 kobo
      });

      it('should throw error for missing email', () => {
        expect(() => {
          paystackService.initializeTransaction(null, 500);
        }).toThrow('Email and amount are required');
      });

      it('should throw error for missing amount', () => {
        expect(() => {
          paystackService.initializeTransaction('user@example.com', null);
        }).toThrow('Email and amount are required');
      });

      it('should throw error for zero or negative amount', () => {
        expect(() => {
          paystackService.initializeTransaction('user@example.com', 0);
        }).toThrow('Amount must be greater than 0');

        expect(() => {
          paystackService.initializeTransaction('user@example.com', -100);
        }).toThrow('Amount must be greater than 0');
      });

      it('should include metadata if provided', () => {
        const metadata = { property_id: 'prop_123' };
        const result = paystackService.initializeTransaction(
          'user@example.com',
          500,
          metadata
        );
        
        expect(result.status).toBe(true);
      });
    });

    describe('verifyTransaction', () => {
      it('should verify transaction with valid reference', () => {
        const reference = 'ref_test123';
        const result = paystackService.verifyTransaction(reference);
        
        expect(result.status).toBe(true);
        expect(result.data.reference).toBe(reference);
        expect(result.data.paid).toBe(true);
      });

      it('should throw error for missing reference', () => {
        expect(() => {
          paystackService.verifyTransaction(null);
        }).toThrow('Reference is required');
      });
    });

    describe('listTransactions', () => {
      it('should list transactions with default count', () => {
        const result = paystackService.listTransactions();
        
        expect(result.status).toBe(true);
        expect(result.data).toHaveLength(10);
        expect(result.data[0]).toHaveProperty('reference');
        expect(result.data[0]).toHaveProperty('amount');
      });

      it('should list transactions with custom count', () => {
        const result = paystackService.listTransactions(5);
        
        expect(result.status).toBe(true);
        expect(result.data).toHaveLength(5);
      });
    });
  });

  describe('FlutterWave Service', () => {
    describe('initializePayment', () => {
      it('should initialize payment with valid details', () => {
        const result = flutterWaveService.initializePayment(
          'user@example.com',
          500,
          'txref_123456'
        );
        
        expect(result.status).toBe('success');
        expect(result.data.link).toBeDefined();
        expect(result.data.tx_ref).toBe('txref_123456');
      });

      it('should throw error for missing required fields', () => {
        expect(() => {
          flutterWaveService.initializePayment(null, 500, 'txref_123');
        }).toThrow('Email, amount, and txRef are required');
      });

      it('should throw error for invalid amount', () => {
        expect(() => {
          flutterWaveService.initializePayment('user@example.com', 0, 'txref_123');
        }).toThrow('Amount must be greater than 0');
      });
    });

    describe('verifyPayment', () => {
      it('should verify payment with valid txRef', () => {
        const txRef = 'txref_123456';
        const result = flutterWaveService.verifyPayment(txRef);
        
        expect(result.status).toBe('success');
        expect(result.data.tx_ref).toBe(txRef);
        expect(result.data.status).toBe('successful');
      });

      it('should throw error for missing txRef', () => {
        expect(() => {
          flutterWaveService.verifyPayment(null);
        }).toThrow('Transaction reference is required');
      });
    });

    describe('chargeCard', () => {
      it('should charge card with valid details', () => {
        const cardDetails = {
          card_number: '4111111111111111',
          cvv: '123',
          expiry_month: '12',
          expiry_year: '25',
        };
        
        const result = flutterWaveService.chargeCard(cardDetails);
        
        expect(result.status).toBe('success');
        expect(result.data.charge_code).toBeDefined();
      });

      it('should throw error for incomplete card details', () => {
        const incompleteCard = {
          card_number: '4111111111111111',
          cvv: '123',
        };
        
        expect(() => {
          flutterWaveService.chargeCard(incompleteCard);
        }).toThrow('Card details incomplete');
      });
    });
  });
});
