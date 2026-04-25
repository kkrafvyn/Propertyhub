/**
 * Utility Management Dashboard Component
 * 
 * Complete interface for managing property utilities
 * Shows services, payments, analytics, and auto-renewal controls
 */

import React, { useState, useEffect } from 'react';
import { useUtility } from '../hooks/useUtility';
import { useAuth } from '../hooks/useAuth';
import type { PropertyService } from '../types/utilities';

interface UtilityDashboardProps {
  propertyId: string;
  onServiceAdded?: (service: PropertyService) => void;
  onServicePaid?: (serviceId: string) => void;
}

export const UtilityDashboard: React.FC<UtilityDashboardProps> = ({
  propertyId,
  onServiceAdded,
  onServicePaid,
}) => {
  const { user } = useAuth();
  const {
    services,
    dashboard,
    analytics,
    loading,
    error,
    getDashboard,
    getAnalytics,
    payForService,
    enableAutoRenewal,
    disableAutoRenewal,
    deleteService,
    clearError,
  } = useUtility();

  const [activeTab, setActiveTab] = useState<'services' | 'payments' | 'analytics'>('services');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedService, setSelectedService] = useState<PropertyService | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    service_type: 'dstv' as const,
    provider: 'dstv' as const,
    account_number: '',
    amount: 0,
    payment_frequency: 'monthly' as const,
    auto_renew: false,
  });

  useEffect(() => {
    getDashboard(propertyId);
    getAnalytics(propertyId);
  }, [propertyId, getDashboard, getAnalytics]);

  const handlePayService = async (service: PropertyService) => {
    if (!user?.id) return;

    setPaymentLoading(true);
    try {
      await payForService(service.id, user.id, 'paystack');
      onServicePaid?.(service.id);
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleToggleAutoRenewal = async (serviceId: string, currentValue: boolean) => {
    try {
      if (currentValue) {
        await disableAutoRenewal(serviceId);
      } else {
        await enableAutoRenewal(serviceId);
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    const icons: { [key: string]: string } = {
      dstv: '📺',
      gotv: '📺',
      water: '💧',
      electricity: '⚡',
      wifi: '📶',
      internet: '🌐',
      gas: '🔥',
    };
    return icons[serviceType] || '🔧';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Utilities Management</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
        >
          {showAddForm ? 'Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between">
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error.message}</p>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xl font-bold">
            ×
          </button>
        </div>
      )}

      {/* Key Metrics */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase">Active Services</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {dashboard.services.filter((s: any) => s.status === 'active').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase">Monthly Spend</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              GHS {dashboard.totalMonthlySpend.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase">Expiring Soon</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{dashboard.expiringServices.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase">Expired</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{dashboard.expiredServices.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {(['services', 'payments', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {dashboard?.services && dashboard.services.length > 0 ? (
            <div className="grid gap-4">
              {dashboard.services.map((service: PropertyService) => (
                <div key={service.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{getServiceIcon(service.service_type)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {service.service_type}
                        </h3>
                        <p className="text-sm text-gray-600">{service.account_number}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Amount</p>
                      <p className="text-lg font-bold text-gray-900">
                        GHS {service.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Frequency</p>
                      <p className="text-lg font-bold text-gray-900 capitalize">
                        {service.payment_frequency.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Last Payment</p>
                      <p className="text-sm text-gray-900">
                        {service.last_payment_date
                          ? new Date(service.last_payment_date).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Due Date</p>
                      <p className={`text-sm font-semibold ${
                        new Date(service.next_renewal_date) < new Date()
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {new Date(service.next_renewal_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={service.auto_renew}
                        onChange={() => handleToggleAutoRenewal(service.id, service.auto_renew)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Auto-renew</span>
                    </label>

                    <div className="flex gap-3">
                      {service.status === 'active' && new Date(service.next_renewal_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <button
                          onClick={() => handlePayService(service)}
                          disabled={paymentLoading}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm"
                        >
                          {paymentLoading ? 'Processing...' : 'Pay Now'}
                        </button>
                      )}

                      <button
                        onClick={() => deleteService(service.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No services added yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Add your first service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Service</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentPayments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 capitalize">{payment.service_type}</td>
                      <td className="px-6 py-4 text-right font-semibold">
                        GHS {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No payments recorded yet</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Overview</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Spent (All Time)</p>
                <p className="text-2xl font-bold text-gray-900">
                  GHS {analytics.totalSpent.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Monthly</p>
                <p className="text-2xl font-bold text-blue-600">
                  GHS {analytics.averageMonthly.toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-600">Highest</p>
                  <p className="text-xl font-bold text-gray-900">
                    GHS {analytics.highestExpense.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Lowest</p>
                  <p className="text-xl font-bold text-gray-900">
                    GHS {analytics.lowestExpense.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trend</h3>
            <div className="space-y-2">
              {analytics.paymentTrend.slice(-6).map((trend: any) => (
                <div key={trend.month} className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{trend.month}</p>
                  <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(trend.amount / (analytics.averageMonthly * 1.5)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 w-24 text-right">
                    GHS {trend.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityDashboard;
