/**
 * usePayment Hook
 * 
 * Custom React hook for payment processing
 * Handles transactions, rent payments, and escrow
 * 
 * @author PropertyHub Team
 */

import { useCallback, useEffect, useState } from 'react';
import {
  transactionService,
  paystackService,
  flutterwaveService,
  rentPaymentService,
  escrowService,
} from '../services/paymentService';
import type {
  Transaction,
  RentSchedule,
  EscrowAccount,
  PaymentProvider,
  TransactionType,
  InitiatePaymentResponse,
  VerifyPaymentResponse,
} from '../types/payment';

export interface UsePaymentState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  loading: boolean;
  error: Error | null;
  authorizationUrl?: string;
}

export interface UsePaymentReturn extends UsePaymentState {
  initiatePayment: (
    email: string,
    amount: number,
    transactionType: TransactionType,
    provider: PaymentProvider,
    metadata?: Record<string, any>
  ) => Promise<InitiatePaymentResponse>;
  verifyPayment: (
    transactionId: string,
    reference: string,
    provider: PaymentProvider
  ) => Promise<VerifyPaymentResponse>;
  getUserTransactions: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const usePayment = (): UsePaymentReturn => {
  const [state, setState] = useState<UsePaymentState>({
    transactions: [],
    currentTransaction: null,
    loading: false,
    error: null,
  });

  const initiatePayment = useCallback(
    async (
      email: string,
      amount: number,
      transactionType: TransactionType,
      provider: PaymentProvider,
      metadata?: Record<string, any>
    ): Promise<InitiatePaymentResponse> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Create transaction record
        const { data: transaction, error: txError } = await transactionService.createTransaction({
          user_id: metadata?.user_id || '',
          amount,
          currency: 'GHS',
          type: transactionType,
          status: 'pending',
          provider,
          property_id: metadata?.property_id,
          booking_id: metadata?.booking_id,
          metadata,
        });

        if (txError || !transaction) throw txError || new Error('Failed to create transaction');

        let authUrl: string;
        let reference: string;
        let accessCode: string | undefined;

        if (provider === 'paystack') {
          const result = await paystackService.initializePayment(email, amount, {
            ...metadata,
            transaction_id: transaction.id,
          });

          authUrl = result.authorization_url;
          reference = result.reference;
          accessCode = result.access_code;
        } else {
          const txRef = `propertyhub_${transaction.id}_${Date.now()}`;
          const result = await flutterwaveService.initializePayment(
            email,
            amount,
            txRef,
            'GHS',
            {
              ...metadata,
              transaction_id: transaction.id,
            }
          );

          authUrl = result.link;
          reference = txRef;
        }

        setState((prev) => ({
          ...prev,
          currentTransaction: transaction,
          authorizationUrl: authUrl,
          loading: false,
          error: null,
        }));

        return {
          success: true,
          transaction_id: transaction.id,
          authorization_url: authUrl,
          reference,
          access_code: accessCode,
          provider,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Payment initiation failed');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }));
        throw err;
      }
    },
    []
  );

  const verifyPayment = useCallback(
    async (transactionId: string, reference: string, provider: PaymentProvider): Promise<VerifyPaymentResponse> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        let paymentData: any;

        if (provider === 'paystack') {
          paymentData = await paystackService.verifyPayment(reference);
        } else {
          paymentData = await flutterwaveService.verifyPayment(reference);
        }

        const rawStatus = String(paymentData?.status || '').toLowerCase();
        const isCompleted = ['success', 'successful', 'completed', 'paid'].includes(rawStatus);
        const status = isCompleted ? 'completed' : 'failed';
        const normalizedAmount =
          typeof paymentData?.amount === 'number'
            ? provider === 'paystack'
              ? paymentData.amount / 100
              : paymentData.amount
            : 0;

        // Update transaction status
        const { data: updatedTransaction, error: updateError } = await transactionService.updateTransactionStatus(
          transactionId,
          status,
          reference
        );

        if (updateError) throw updateError;

        setState((prev) => ({
          ...prev,
          currentTransaction: updatedTransaction,
          loading: false,
          error: null,
        }));

        return {
          success: status === 'completed',
          transaction_id: transactionId,
          reference,
          status: status as any,
          amount: normalizedAmount,
          currency: paymentData.currency || 'GHS',
          completed_at: paymentData.paid_at || new Date().toISOString(),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Payment verification failed');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }));
        throw err;
      }
    },
    []
  );

  const getUserTransactions = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await transactionService.getUserTransactions(userId, 50, 0);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        transactions: data || [],
        loading: false,
        error: null,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch transactions');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    initiatePayment,
    verifyPayment,
    getUserTransactions,
    clearError,
  };
};

/**
 * useRentPayment Hook
 *
 * Specialized hook for rent payment scheduling and management
 */

export interface UseRentPaymentReturn {
  rentSchedules: RentSchedule[];
  loading: boolean;
  error: Error | null;
  createRentSchedule: (scheduleData: Partial<RentSchedule>) => Promise<void>;
  getTenantSchedules: (tenantId: string) => Promise<void>;
  getOwnerSchedules: (ownerId: string) => Promise<void>;
  payRent: (
    rentScheduleId: string,
    amount: number,
    provider: PaymentProvider
  ) => Promise<any>;
  clearError: () => void;
}

export const useRentPayment = (): UseRentPaymentReturn => {
  const [rentSchedules, setRentSchedules] = useState<RentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { initiatePayment, verifyPayment } = usePayment();

  const createRentSchedule = useCallback(async (scheduleData: Partial<RentSchedule>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: scheduleError } = await rentPaymentService.createRentSchedule(scheduleData);

      if (scheduleError || !data) throw scheduleError || new Error('Failed to create rent schedule');

      setRentSchedules((prev) => [data, ...prev]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create rent schedule');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTenantSchedules = useCallback(async (tenantId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: scheduleError } = await rentPaymentService.getTenantRentSchedules(tenantId);

      if (scheduleError) throw scheduleError;

      setRentSchedules(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch rent schedules');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getOwnerSchedules = useCallback(async (ownerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: scheduleError } = await rentPaymentService.getOwnerRentSchedules(ownerId);

      if (scheduleError) throw scheduleError;

      setRentSchedules(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch rent schedules');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const payRent = useCallback(
    async (rentScheduleId: string, amount: number, provider: PaymentProvider) => {
      setLoading(true);
      setError(null);

      try {
        const schedule = rentSchedules.find((s) => s.id === rentScheduleId);
        if (!schedule) throw new Error('Rent schedule not found');

        // Initiate payment
        const paymentResult = await initiatePayment(
          'user@example.com', // Should come from user context
          amount,
          'rent_payment',
          provider,
          {
            rent_schedule_id: rentScheduleId,
            booking_id: schedule.booking_id,
          }
        );

        // Payment verification happens on callback
        return paymentResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to pay rent');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [rentSchedules, initiatePayment]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    rentSchedules,
    loading,
    error,
    createRentSchedule,
    getTenantSchedules,
    getOwnerSchedules,
    payRent,
    clearError,
  };
};

/**
 * useEscrow Hook
 *
 * Manage escrow accounts and funds
 */

export interface UseEscrowReturn {
  escrows: EscrowAccount[];
  loading: boolean;
  error: Error | null;
  createEscrow: (bookingId: string, amount: number) => Promise<void>;
  getUserEscrows: (userId: string) => Promise<void>;
  releaseEscrow: (escrowId: string, amount?: number) => Promise<void>;
  disputeEscrow: (escrowId: string, reason: string) => Promise<void>;
  clearError: () => void;
}

export const useEscrow = (): UseEscrowReturn => {
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEscrow = useCallback(async (bookingId: string, amount: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: escrowError } = await escrowService.createEscrow({
        booking_id: bookingId,
        total_amount: amount,
        held_amount: amount,
        released_amount: 0,
        status: 'held',
      });

      if (escrowError || !data) throw escrowError || new Error('Failed to create escrow');

      setEscrows((prev) => [data, ...prev]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create escrow');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserEscrows = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: escrowError } = await escrowService.getUserEscrows(userId);

      if (escrowError) throw escrowError;

      setEscrows(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch escrows');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseEscrow = useCallback(async (escrowId: string, amount?: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: escrowError } = await escrowService.releaseEscrow(escrowId, amount);

      if (escrowError || !data) throw escrowError || new Error('Failed to release escrow');

      setEscrows((prev) => prev.map((e) => (e.id === escrowId ? data : e)));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to release escrow');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const disputeEscrow = useCallback(async (escrowId: string, reason: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: escrowError } = await escrowService.disputeEscrow(escrowId, reason);

      if (escrowError || !data) throw escrowError || new Error('Failed to dispute escrow');

      setEscrows((prev) => prev.map((e) => (e.id === escrowId ? data : e)));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to dispute escrow');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    escrows,
    loading,
    error,
    createEscrow,
    getUserEscrows,
    releaseEscrow,
    disputeEscrow,
    clearError,
  };
};

export default { usePayment, useRentPayment, useEscrow };
