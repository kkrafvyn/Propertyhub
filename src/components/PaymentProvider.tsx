import React, { createContext, useContext, useState } from 'react';

interface PaymentProviderState {
  isProcessing: boolean;
  processPayment: (amount: number, method: string) => Promise<boolean>;
  paymentHistory: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
}

const PaymentContext = createContext<PaymentProviderState>({
  isProcessing: false,
  processPayment: async () => false,
  paymentHistory: [],
});

interface PaymentProviderProps {
  children: React.ReactNode;
}

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  const processPayment = async (amount: number, method: string): Promise<boolean> => {
    try {
      setIsProcessing(true);
      
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const paymentRecord: PaymentRecord = {
        id: Date.now().toString(),
        amount,
        method,
        status: 'completed',
        date: new Date().toISOString(),
      };
      
      setPaymentHistory(prev => [paymentRecord, ...prev]);
      return true;
    } catch (error) {
      console.error('Payment failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const value = {
    isProcessing,
    processPayment,
    paymentHistory,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};