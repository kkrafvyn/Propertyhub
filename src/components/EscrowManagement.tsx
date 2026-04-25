/**
 * Escrow Management Component
 * 
 * Display and manage escrow accounts for bookings
 * Allows landlords and tenants to view, release, and dispute escrow funds
 */

import React, { useState, useEffect } from 'react';
import { useEscrow } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';
import type { EscrowAccount } from '../types/payment';

interface EscrowManagementProps {
  bookingId?: string;
  userId?: string;
  onEscrowReleased?: (escrowId: string, amount: number) => void;
}

export const EscrowManagement: React.FC<EscrowManagementProps> = ({
  bookingId,
  userId: customUserId,
  onEscrowReleased,
}) => {
  const { user } = useAuth();
  const { escrows, loading, error, getUserEscrows, releaseEscrow, disputeEscrow, clearError } = useEscrow();
  
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowAccount | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState(0);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = customUserId || user?.id;

  useEffect(() => {
    if (userId) {
      getUserEscrows(userId);
    }
  }, [userId, getUserEscrows]);

  const filteredEscrows = bookingId
    ? escrows.filter((e) => e.booking_id === bookingId)
    : escrows;

  const handleReleaseClick = (escrow: EscrowAccount) => {
    setSelectedEscrow(escrow);
    setReleaseAmount(escrow.held_amount);
    setShowReleaseModal(true);
  };

  const handleDisputeClick = (escrow: EscrowAccount) => {
    setSelectedEscrow(escrow);
    setDisputeReason('');
    setShowDisputeModal(true);
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscrow) return;

    setSubmitting(true);
    try {
      await releaseEscrow(selectedEscrow.id, releaseAmount > 0 ? releaseAmount : undefined);
      onEscrowReleased?.(selectedEscrow.id, releaseAmount || selectedEscrow.held_amount);
      setShowReleaseModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscrow || !disputeReason.trim()) return;

    setSubmitting(true);
    try {
      await disputeEscrow(selectedEscrow.id, disputeReason);
      setShowDisputeModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Escrow Accounts</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          {filteredEscrows.length} Account{filteredEscrows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between">
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error.message}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Escrow List */}
      {filteredEscrows.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-600">No escrow accounts found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEscrows.map((escrow) => (
            <div key={escrow.id} className="bg-white rounded-lg shadow-md p-6">
              {/* Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Booking #{escrow.booking_id.substring(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Created {new Date(escrow.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    escrow.status === 'held'
                      ? 'bg-yellow-100 text-yellow-800'
                      : escrow.status === 'released'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                </span>
              </div>

              {/* Amount Details */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    {escrow.total_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Currently Held</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {escrow.held_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Released</p>
                  <p className="text-lg font-bold text-green-600">
                    {escrow.released_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  <span>Created: {new Date(escrow.created_at).toLocaleDateString()}</span>
                </div>
                {escrow.released_at && (
                  <div className="flex items-center text-green-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    <span>Released: {new Date(escrow.released_at).toLocaleDateString()}</span>
                  </div>
                )}
                {escrow.dispute_reason && (
                  <div className="flex items-start text-red-600">
                    <span className="w-2 h-2 bg-red-600 rounded-full mr-2 mt-1"></span>
                    <span>Dispute: {escrow.dispute_reason}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {escrow.status === 'held' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReleaseClick(escrow)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Release Funds
                  </button>
                  <button
                    onClick={() => handleDisputeClick(escrow)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Dispute
                  </button>
                </div>
              )}

              {escrow.status === 'disputed' && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">This escrow account is currently under dispute.</p>
                  <p className="text-xs mt-1">PropertyHub support team will review and assist with resolution.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Release Modal */}
      {showReleaseModal && selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Release Escrow Funds</h3>

            <form onSubmit={handleReleaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Release
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-600">GHS</span>
                  <input
                    type="number"
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(parseFloat(e.target.value) || 0)}
                    max={selectedEscrow.held_amount}
                    min={0}
                    step={0.01}
                    className="pl-12 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Available: GHS {selectedEscrow.held_amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Release Reason
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Booking completed successfully</option>
                  <option>Partial refund - agreement rupture</option>
                  <option>Emergency release - tenant request</option>
                  <option>Dispute resolution - approval</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm">
                Released funds will be transferred within 24 hours.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  {submitting ? 'Processing...' : 'Release Funds'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && selectedEscrow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report a Dispute</h3>

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispute Reason
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you're disputing this escrow..."
                  rows={4}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded text-sm">
                <p className="font-semibold mb-1">Important:</p>
                <p>Disputes will be reviewed by PropertyHub support. Please provide detailed information to help us resolve this fairly.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !disputeReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowManagement;
