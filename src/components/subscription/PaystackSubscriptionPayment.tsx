/**
 * Paystack Subscription Payment Component
 * 
 * Handles subscription payments through Paystack including
 * recurring billing setup, payment method management, and subscription updates.
 */

import React from 'react';
import type { SubscriptionPlan, PaymentMethod } from '../../types/subscription';
import { envConfig } from '../../utils/envConfig';

interface PaystackConfig {
  publicKey: string;
  baseUrl: string;
}

interface SubscriptionPaymentData {
  planCode: string;
  customerCode: string;
  authorizationCode?: string;
  subscriptionCode?: string;
}

interface PaystackSubscriptionPaymentProps {
  plan: SubscriptionPlan;
  userEmail: string;
  userName: string;
  onSuccess: (data: SubscriptionPaymentData) => void;
  onError: (error: string) => void;
  onClose: () => void;
  existingPaymentMethod?: PaymentMethod;
  isUpgrade?: boolean;
  className?: string;
}

const getSubscriptionAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window === 'undefined') return headers;

  const token =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('propertyhub_auth_token') ||
    localStorage.getItem('supabase.auth.token');

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const PAYSTACK_CONFIG: PaystackConfig = {
  publicKey: envConfig.PAYSTACK_PUBLIC_KEY || 'pk_test_demo',
  baseUrl: `${(envConfig.API_URL || 'http://localhost:8080').replace(/\/$/, '')}/api/v1/subscriptions`,
};

const PaystackSubscriptionPayment: React.FC<PaystackSubscriptionPaymentProps> = ({
  plan,
  userEmail,
  userName,
  onSuccess,
  onError,
  onClose,
  existingPaymentMethod,
  isUpgrade = false,
  className = ''
}) => {
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<'payment' | 'processing' | 'success' | 'error'>('payment');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [useExistingPayment, setUseExistingPayment] = React.useState(!!existingPaymentMethod);

  // Create subscription plan on Paystack (this would typically be done on backend)
  const createPaystackPlan = async (): Promise<string> => {
    try {
      const planData = {
        name: `PropertyHub ${plan.name} Plan`,
        amount: plan.price * 100, // Paystack expects amount in kobo/cents
        interval: plan.interval,
        currency: plan.currency,
        description: plan.description,
        invoice_limit: 0, // Unlimited invoices
        send_invoices: true,
        send_sms: false
      };

      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/plans`, {
        method: 'POST',
        headers: getSubscriptionAuthHeaders(),
        body: JSON.stringify(planData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create payment plan');
      }

      return (
        result?.data?.plan_code ||
        result?.data?.planCode ||
        result?.plan_code ||
        result?.planCode
      );
    } catch (error) {
      console.error('Error creating Paystack plan:', error);
      throw error;
    }
  };

  // Create or get customer on Paystack
  const createPaystackCustomer = async (): Promise<string> => {
    try {
      const customerData = {
        email: userEmail,
        first_name: userName.split(' ')[0],
        last_name: userName.split(' ').slice(1).join(' ') || 'User',
        metadata: {
          property_host: true,
          plan_id: plan.id
        }
      };

      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/customers`, {
        method: 'POST',
        headers: getSubscriptionAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        // If customer already exists, fetch existing customer
        if (result.message?.includes('already exists')) {
          const getResponse = await fetch(
            `${PAYSTACK_CONFIG.baseUrl}/customers/${encodeURIComponent(userEmail)}`,
            {
              headers: getSubscriptionAuthHeaders(),
            }
          );
          
          const getResult = await getResponse.json();
          return (
            getResult?.data?.customer_code ||
            getResult?.data?.customerCode ||
            getResult?.customer_code ||
            getResult?.customerCode
          );
        }
        
        throw new Error(result.message || 'Failed to create customer');
      }

      return (
        result?.data?.customer_code ||
        result?.data?.customerCode ||
        result?.customer_code ||
        result?.customerCode
      );
    } catch (error) {
      console.error('Error creating Paystack customer:', error);
      throw error;
    }
  };

  // Initialize Paystack popup for payment
  const initializePaystackPayment = async () => {
    try {
      setLoading(true);
      setStep('processing');

      // Create plan and customer
      const [planCode, customerCode] = await Promise.all([
        createPaystackPlan(),
        createPaystackCustomer()
      ]);

      // If using existing payment method, create subscription directly
      if (useExistingPayment && existingPaymentMethod?.paystackAuthCode) {
        const subscriptionData = {
          customer: customerCode,
          plan: planCode,
          authorization: existingPaymentMethod.paystackAuthCode,
          start_date: new Date().toISOString()
        };

        const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/subscriptions`, {
          method: 'POST',
          headers: getSubscriptionAuthHeaders(),
          body: JSON.stringify(subscriptionData)
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to create subscription');
        }

        onSuccess({
          planCode,
          customerCode,
          authorizationCode: existingPaymentMethod.paystackAuthCode,
          subscriptionCode:
            result?.data?.subscription_code ||
            result?.data?.subscriptionCode ||
            result?.subscription_code ||
            result?.subscriptionCode
        });

        setStep('success');
        return;
      }

      // Initialize new payment with Paystack Popup
      const handler = window.PaystackPop?.setup({
        key: PAYSTACK_CONFIG.publicKey,
        email: userEmail,
        amount: plan.price * 100, // Amount in kobo
        currency: plan.currency,
        plan: planCode,
        customer: customerCode,
        ref: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          plan_id: plan.id,
          plan_name: plan.name,
          is_upgrade: isUpgrade,
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: plan.name
            }
          ]
        },
        callback: function(response: any) {
          // Payment successful
          onSuccess({
            planCode,
            customerCode,
            authorizationCode: response.authorization?.authorization_code,
            subscriptionCode: response.subscription?.subscription_code
          });
          setStep('success');
        },
        onClose: function() {
          setLoading(false);
          setStep('payment');
          onClose();
        }
      });

      handler?.openIframe();

    } catch (error) {
      console.error('Payment initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
      setStep('error');
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  // Load Paystack script
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const renderContent = () => {
    switch (step) {
      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
            <p className="text-muted-foreground">Please wait while we set up your subscription...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-green-800">Subscription Activated!</h3>
            <p className="text-muted-foreground">
              Your {plan.name} subscription has been successfully {isUpgrade ? 'upgraded' : 'activated'}.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-red-600">✗</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-800">Payment Failed</h3>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => {
                setStep('payment');
                setErrorMessage('');
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Plan Summary */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-2">{plan.name} Plan</h3>
              <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {plan.interval === 'yearly' ? 'Annual' : 'Monthly'} Billing
                </span>
                <span className="text-xl font-bold">
                  ₦{plan.price.toLocaleString()}/{plan.interval}
                </span>
              </div>

              {plan.discountPercentage && (
                <div className="mt-2 text-green-600 text-sm font-medium">
                  Save {plan.discountPercentage}% with {plan.interval} billing
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            {existingPaymentMethod && (
              <div className="space-y-3">
                <h4 className="font-medium">Payment Method</h4>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      checked={useExistingPayment}
                      onChange={() => setUseExistingPayment(true)}
                      className="text-primary"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {existingPaymentMethod.cardBrand?.toUpperCase() || 'CARD'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {existingPaymentMethod.cardBrand} ending in {existingPaymentMethod.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">Saved payment method</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      checked={!useExistingPayment}
                      onChange={() => setUseExistingPayment(false)}
                      className="text-primary"
                    />
                    <div>
                      <p className="font-medium">Use a different payment method</p>
                      <p className="text-sm text-muted-foreground">Add new card or bank account</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={initializePaystackPayment}
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `${isUpgrade ? 'Upgrade to' : 'Start'} ${plan.name} Plan`}
            </button>

            {/* Security Notice */}
            <div className="text-center text-xs text-muted-foreground">
              <p>🔒 Secured by Paystack • Your payment information is encrypted and secure</p>
              <p className="mt-1">You can cancel your subscription anytime</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-card rounded-lg border p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {isUpgrade ? 'Upgrade Subscription' : 'Subscribe to PropertyHub'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default PaystackSubscriptionPayment;
