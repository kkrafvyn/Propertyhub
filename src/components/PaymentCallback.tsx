/**
 * Payment Callback Handler Component
 * 
 * Handles post-payment verification and redirects from payment gateways
 * Manages transaction verification and provides user feedback
 */

import React, { useEffect, useState } from 'react';
import { usePayment } from '../hooks/usePayment';
import { AppState } from '../types';
import type { PaymentProvider, VerifyPaymentResponse } from '../types/payment';

interface PaymentCallbackProps {
  onNavigate?: (state: AppState) => void;
  onSuccess?: (response: VerifyPaymentResponse) => void;
  onError?: (error: Error) => void;
}

export const PaymentCallback: React.FC<PaymentCallbackProps> = ({ onNavigate, onSuccess, onError }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const { verifyPayment, loading } = usePayment();

  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying payment...');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const verifyAndProcess = async () => {
      try {
        // Get payment info from sessionStorage
        const paymentCallbackStr = sessionStorage.getItem('paymentCallback');
        if (!paymentCallbackStr) {
          throw new Error('Payment callback data not found');
        }

        const { transactionId, reference, provider } = JSON.parse(paymentCallbackStr);

        // Get reference from URL if not in session
        const urlReference = searchParams.get('reference');
        const finalReference = reference || urlReference;

        if (!finalReference || !transactionId) {
          throw new Error('Payment reference missing');
        }

        setMessage('Verifying payment...');

        // Verify payment
        const response = await verifyPayment(transactionId, finalReference, provider as PaymentProvider);

        if (response.success) {
          setVerificationStatus('success');
          setMessage('Payment verified successfully!');
          
          // Clear callback data
          sessionStorage.removeItem('paymentCallback');
          
          onSuccess?.(response);

          // Redirect after 3 seconds
          setTimeout(() => {
            onNavigate?.('dashboard');
          }, 3000);
        } else {
          throw new Error(response.message || 'Payment verification failed');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment verification failed');
        setVerificationStatus('error');
        setMessage('Payment verification failed');
        setError(error);
        onError?.(error);

        // Redirect after 5 seconds
        setTimeout(() => {
          onNavigate?.('dashboard');
        }, 5000);
      }
    };

    verifyAndProcess();
  }, [searchParams, verifyPayment, onSuccess, onError, onNavigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Status Icon */}
        {verificationStatus === 'verifying' && (
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <svg className="absolute inset-0 animate-spin text-blue-600" viewBox="0 0 24 24">
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
            </div>
          </div>
        )}

        {verificationStatus === 'success' && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}

        {verificationStatus === 'error' && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Title and Message */}
        <h1 className="text-center text-2xl font-bold text-gray-900 mb-2">
          {verificationStatus === 'verifying' && 'Verifying Payment'}
          {verificationStatus === 'success' && 'Payment Successful'}
          {verificationStatus === 'error' && 'Payment Failed'}
        </h1>

        <p className="text-center text-gray-600 mb-6">{message}</p>

        {/* Error Details */}
        {error && verificationStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error.message}
            </p>
          </div>
        )}

        {/* Success Details */}
        {verificationStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              Your payment has been confirmed and your account has been updated.
            </p>
          </div>
        )}

        {/* Status Text */}
        <div className="text-center text-sm text-gray-500 mb-6">
          {verificationStatus === 'verifying' && 'Please wait while we confirm your payment...'}
          {verificationStatus === 'success' && 'You will be redirected to your dashboard shortly...'}
          {verificationStatus === 'error' && 'You will be redirected to your dashboard in a moment...'}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {verificationStatus === 'error' && (
            <>
              <button
                onClick={() => onNavigate?.('payments')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => onNavigate?.('dashboard')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                Go to Dashboard
              </button>
            </>
          )}

          {verificationStatus === 'success' && (
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              View Dashboard
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            Need help?{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
