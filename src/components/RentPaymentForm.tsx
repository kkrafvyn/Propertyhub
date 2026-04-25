/**
 * RentPaymentForm Component
 * 
 * Complete rent payment flow with Paystack and Flutterwave integration
 * Handles payment initiation, verification, and confirmation
 */

import React, { useState, useEffect } from 'react';
import { useRentPayment, usePayment } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';
import type { PaymentProvider, RentSchedule } from '../types/payment';

interface RentPaymentFormProps {
  rentScheduleId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  showEscrow?: boolean;
}

export const RentPaymentForm: React.FC<RentPaymentFormProps> = ({
  rentScheduleId,
  onSuccess,
  onError,
  showEscrow = false,
}) => {
  const { user } = useAuth();
  const { rentSchedules, loading: rentLoading, payRent } = useRentPayment();
  const { initiatePayment, loading: paymentLoading, error: paymentError } = usePayment();
  
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('paystack');
  const [useEscrow, setUseEscrow] = useState(showEscrow);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const currentSchedule = rentSchedules.find((s) => s.id === rentScheduleId);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user?.id || !currentSchedule) {
        throw new Error('Missing user or rent schedule information');
      }

      // Initiate payment
      const result = await payRent(rentScheduleId, currentSchedule.amount, selectedProvider);

      setTransactionId(result.transaction_id);
      setAuthUrl(result.authorization_url);

      // For Paystack, redirect to authorization URL
      if (result.authorization_url && selectedProvider === 'paystack') {
        // Store transaction info in sessionStorage for verification after callback
        sessionStorage.setItem(
          'paymentCallback',
          JSON.stringify({
            transactionId: result.transaction_id,
            reference: result.reference,
            provider: selectedProvider,
          })
        );
        
        // Redirect to payment gateway
        window.location.href = result.authorization_url;
      } else if (result.authorization_url && selectedProvider === 'flutterwave') {
        // For Flutterwave, open payment modal or redirect
        window.location.href = result.authorization_url;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSchedule) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Rent schedule not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pay Rent</h2>
        <p className="text-gray-600 mb-6">Complete your rent payment securely</p>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Amount Due:</span>
            <span className="text-2xl font-bold text-gray-900">
              {currentSchedule.currency} {currentSchedule.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Due Date:</span>
            <span>{new Date(currentSchedule.next_due_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Error Message */}
        {(error || paymentError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {(error || paymentError)?.message}
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Provider
          </label>
          <div className="space-y-3">
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="provider"
                value="paystack"
                checked={selectedProvider === 'paystack'}
                onChange={(e) => setSelectedProvider(e.target.value as PaymentProvider)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Paystack</span>
            </label>
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="provider"
                value="flutterwave"
                checked={selectedProvider === 'flutterwave'}
                onChange={(e) => setSelectedProvider(e.target.value as PaymentProvider)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Flutterwave</span>
            </label>
          </div>
        </div>

        {/* Escrow Option */}
        {showEscrow && (
          <div className="mb-6 flex items-center">
            <input
              type="checkbox"
              id="useEscrow"
              checked={useEscrow}
              onChange={(e) => setUseEscrow(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="useEscrow" className="ml-3 text-sm text-gray-700">
              Use Escrow for secure payment
              <p className="text-xs text-gray-500 mt-1">
                Funds will be held for {currentSchedule.next_due_date ? '7 days' : 'verification'}
              </p>
            </label>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handlePayment}
          disabled={loading || rentLoading || paymentLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          {loading || rentLoading || paymentLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ${currentSchedule.currency} ${currentSchedule.amount.toLocaleString()}`
          )}
        </button>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-start">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Your payment information is secured with industry-standard encryption</span>
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-6 text-xs text-gray-600">
          <p className="font-semibold text-gray-700 mb-2">Need Help?</p>
          <p>Payment processing typically takes 5-10 minutes. You'll receive a confirmation email once completed.</p>
        </div>
      </div>
    </div>
  );
};

export default RentPaymentForm;
