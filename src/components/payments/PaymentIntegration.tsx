/**
 * PropertyHub - Payment Integration Component
 * 
 * Main payment integration wrapper that provides payment functionality
 * throughout the application. This component integrates with the existing
 * PropertyHub interface and provides seamless payment experiences for
 * property transactions and bookings.
 */

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Payment Components
import { PaymentDashboard } from './PaymentDashboard';
import { PropertyPaymentFlow } from './PropertyPaymentFlow';

// Services and Utils
import { paymentService, PaymentTransaction, PaymentType } from '../../utils/paymentService';

// Types
import type { User as UserType, Property } from '../../types';

interface PaymentIntegrationProps {
  user: UserType;
  className?: string;
}

export function PaymentIntegration({ 
  user, 
  className = '' 
}: PaymentIntegrationProps) {
  
  // State for payment flow
  const [showPaymentFlow, setShowPaymentFlow] = useState<boolean>(false);
  const [paymentFlowData, setPaymentFlowData] = useState<{
    property: Property;
    paymentType: PaymentType;
    amount?: number;
    metadata?: Record<string, any>;
  } | null>(null);

  // Handle payment flow initiation
  const initiatePayment = useCallback((
    property: Property,
    paymentType: PaymentType,
    amount?: number,
    metadata?: Record<string, any>
  ) => {
    setPaymentFlowData({
      property,
      paymentType,
      amount,
      metadata
    });
    setShowPaymentFlow(true);
  }, []);

  // Handle payment completion
  const handlePaymentSuccess = useCallback((transaction: PaymentTransaction) => {
    toast.success('Payment completed successfully!', {
      description: `Transaction ${transaction.reference} has been processed.`,
      action: {
        label: 'View Receipt',
        onClick: () => {
          // Navigate to payment details or download receipt
          console.log('View receipt for transaction:', transaction.id);
        }
      }
    });
    
    setShowPaymentFlow(false);
    setPaymentFlowData(null);

    // Trigger any necessary app state updates
    // This could include updating property status, user balance, etc.
    
    console.log('💳 Payment completed:', transaction);
  }, []);

  // Close payment flow
  const handleClosePaymentFlow = useCallback(() => {
    setShowPaymentFlow(false);
    setPaymentFlowData(null);
  }, []);

  return (
    <div className={className}>
      {/* Payment Dashboard */}
      <PaymentDashboard 
        userId={user.id}
        className="w-full"
      />

      {/* Property Payment Flow */}
      {paymentFlowData && (
        <PropertyPaymentFlow
          property={paymentFlowData.property as any}
          paymentType={paymentFlowData.paymentType}
          amount={paymentFlowData.amount}
          isOpen={showPaymentFlow}
          onClose={handleClosePaymentFlow}
          onSuccess={handlePaymentSuccess}
          customerId={user.id}
          customerEmail={user.email}
          metadata={paymentFlowData.metadata}
        />
      )}
    </div>
  );
}

// Hook for using payment integration throughout the app
export function usePaymentIntegration() {
  const [paymentService] = useState(() => paymentService);

  const calculateFees = useCallback((amount: number, currency: string = 'NGN') => {
    return paymentService.calculateFees(amount, currency);
  }, [paymentService]);

  const formatCurrency = useCallback((amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  return {
    paymentService,
    calculateFees,
    formatCurrency,
  };
}

// Property payment button component for easy integration
export function PropertyPaymentButton({ 
  property, 
  paymentType, 
  amount, 
  user,
  onPaymentInitiate,
  children,
  className = '',
  variant = 'default'
}: {
  property: Property;
  paymentType: PaymentType;
  amount?: number;
  user: UserType;
  onPaymentInitiate: (property: Property, paymentType: PaymentType, amount?: number) => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
}) {
  
  const { calculateFees, formatCurrency } = usePaymentIntegration();
  
  const handleClick = () => {
    try {
      const paymentAmount = amount || property.price;
      const fees = calculateFees(paymentAmount, property.currency);
      
      toast.info('Initiating payment flow...', {
        description: `Total: ${formatCurrency(paymentAmount + fees.totalFees, property.currency)}`,
      });
      
      onPaymentInitiate(property, paymentType, paymentAmount);
    } catch (error) {
      console.error('❌ Error initiating payment:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-md font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
        ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}
        ${variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' : ''}
        px-4 py-2 text-sm
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Payment status indicator component
export function PaymentStatusIndicator({ 
  status, 
  amount, 
  currency = 'NGN',
  className = '' 
}: {
  status: string;
  amount?: number;
  currency?: string;
  className?: string;
}) {
  const { formatCurrency } = usePaymentIntegration();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      case 'pending': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
      ${getStatusColor(status)} ${className}
    `}>
      <span>{getStatusIcon(status)}</span>
      <span className="capitalize">{status.replace('_', ' ')}</span>
      {amount && (
        <span className="font-semibold">
          {formatCurrency(amount, currency)}
        </span>
      )}
    </div>
  );
}

export default PaymentIntegration;