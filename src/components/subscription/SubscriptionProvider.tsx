/**
 * Subscription Provider Context
 * 
 * Optional context provider for subscription state management.
 * This is designed to work with the minimal app architecture.
 */

import React from 'react';
import type { 
  Subscription, 
  SubscriptionPlan, 
  BillingHistory, 
  PaymentMethod, 
  SubscriptionUsage,
  SubscriptionState,
  SubscriptionActions
} from '../../types/subscription';
import { SUBSCRIPTION_PLANS, isSubscriptionActive } from '../../types/subscription';
import SubscriptionService, { MockSubscriptionData } from '../../utils/subscriptionService';

interface SimpleUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SubscriptionContextType extends SubscriptionState, SubscriptionActions {
  isLoading: boolean;
  initialize: (user: SimpleUser) => Promise<void>;
}

const SubscriptionContext = React.createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: React.ReactNode;
  user?: SimpleUser | null;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ 
  children, 
  user 
}) => {
  const [state, setState] = React.useState<SubscriptionState>({
    currentSubscription: null,
    availablePlans: SUBSCRIPTION_PLANS,
    billingHistory: [],
    paymentMethods: [],
    usage: null,
    loading: false,
    error: null
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const serviceRef = React.useRef<SubscriptionService | null>(null);

  // Initialize subscription service when user changes
  React.useEffect(() => {
    if (user) {
      serviceRef.current = new SubscriptionService({
        userId: user.id,
        userEmail: user.email,
        userName: user.name
      });
    } else {
      serviceRef.current = null;
    }
  }, [user]);

  // Initialize subscription data
  const initialize = React.useCallback(async (currentUser: SimpleUser) => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setState(prev => ({ ...prev, loading: true, error: null }));

      // In production, fetch real data from your backend
      // For now, use mock data for demonstration
      const mockSubscription = MockSubscriptionData.generateMockSubscription(
        currentUser.id, 
        'professional'
      );

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === mockSubscription.planId);
      const mockUsage = MockSubscriptionData.generateMockUsage(
        mockSubscription.id,
        { 
          maxProperties: plan?.maxProperties || 15, 
          maxPhotos: plan?.maxPhotos || 25 
        }
      );

      const mockBilling = MockSubscriptionData.generateMockBillingHistory(
        mockSubscription.id, 
        5
      );

      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm_1',
          userId: currentUser.id,
          type: 'card',
          cardBrand: 'Visa',
          last4: '4242',
          isDefault: true,
          paystackAuthCode: 'AUTH_mock123',
          createdAt: new Date()
        }
      ];

      setState({
        currentSubscription: mockSubscription,
        availablePlans: SUBSCRIPTION_PLANS,
        billingHistory: mockBilling,
        paymentMethods: mockPaymentMethods,
        usage: mockUsage,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error initializing subscription data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load subscription data'
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscription actions
  const upgradePlan = React.useCallback(async (planId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // In production, this would integrate with your payment system
      console.log('Upgrading to plan:', planId);
      
      // Mock successful upgrade
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update subscription
      setState(prev => ({
        ...prev,
        currentSubscription: prev.currentSubscription ? {
          ...prev.currentSubscription,
          planId: planId,
          updatedAt: new Date()
        } : null,
        loading: false
      }));

    } catch (error) {
      console.error('Error upgrading plan:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to upgrade plan'
      }));
    }
  }, []);

  const downgradePlan = React.useCallback(async (planId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // In production, handle downgrade logic
      console.log('Downgrading to plan:', planId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setState(prev => ({
        ...prev,
        currentSubscription: prev.currentSubscription ? {
          ...prev.currentSubscription,
          planId: planId,
          updatedAt: new Date()
        } : null,
        loading: false
      }));

    } catch (error) {
      console.error('Error downgrading plan:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to downgrade plan'
      }));
    }
  }, []);

  const cancelSubscription = React.useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (!state.currentSubscription?.paystackSubscriptionCode) {
        throw new Error('No active subscription found');
      }

      // In production, cancel with Paystack
      if (serviceRef.current) {
        await serviceRef.current.cancelSubscription(state.currentSubscription.paystackSubscriptionCode);
      }

      setState(prev => ({
        ...prev,
        currentSubscription: prev.currentSubscription ? {
          ...prev.currentSubscription,
          cancelAtPeriodEnd: true,
          updatedAt: new Date()
        } : null,
        loading: false
      }));

    } catch (error) {
      console.error('Error canceling subscription:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      }));
    }
  }, [state.currentSubscription]);

  const reactivateSubscription = React.useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      setState(prev => ({
        ...prev,
        currentSubscription: prev.currentSubscription ? {
          ...prev.currentSubscription,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        } : null,
        loading: false
      }));

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription'
      }));
    }
  }, []);

  const updatePaymentMethod = React.useCallback(async (paymentMethod: Partial<PaymentMethod>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Mock payment method update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newPaymentMethod: PaymentMethod = {
        id: `pm_${Date.now()}`,
        userId: user?.id || '',
        type: paymentMethod.type || 'card',
        cardBrand: paymentMethod.cardBrand,
        last4: paymentMethod.last4,
        isDefault: paymentMethod.isDefault || false,
        paystackAuthCode: paymentMethod.paystackAuthCode,
        createdAt: new Date()
      };

      setState(prev => ({
        ...prev,
        paymentMethods: [newPaymentMethod, ...prev.paymentMethods],
        loading: false
      }));

    } catch (error) {
      console.error('Error updating payment method:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update payment method'
      }));
    }
  }, [user]);

  const retryPayment = React.useCallback(async (billingId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Mock retry payment
      await new Promise(resolve => setTimeout(resolve, 1000));

      setState(prev => ({
        ...prev,
        billingHistory: prev.billingHistory.map(bill =>
          bill.id === billingId
            ? { ...bill, status: 'paid' as const, paidAt: new Date() }
            : bill
        ),
        loading: false
      }));

    } catch (error) {
      console.error('Error retrying payment:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to retry payment'
      }));
    }
  }, []);

  const downloadInvoice = React.useCallback(async (billingId: string) => {
    try {
      const bill = state.billingHistory.find(b => b.id === billingId);
      if (bill?.invoiceUrl) {
        window.open(bill.invoiceUrl, '_blank');
      } else {
        throw new Error('Invoice not available');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to download invoice'
      }));
    }
  }, [state.billingHistory]);

  const contextValue: SubscriptionContextType = {
    ...state,
    isLoading,
    initialize,
    upgradePlan,
    downgradePlan,
    cancelSubscription,
    reactivateSubscription,
    updatePaymentMethod,
    retryPayment,
    downloadInvoice
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Hook to use subscription context
export const useSubscription = (): SubscriptionContextType => {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Hook to safely use subscription context (returns null if not available)
export const useSubscriptionOptional = (): SubscriptionContextType | null => {
  return React.useContext(SubscriptionContext);
};

export default SubscriptionProvider;