/**
 * LandlordDashboard Component
 *
 * Main dashboard for landlords showing analytics, revenue tracking,
 * occupancy metrics, and tenant scores
 *
 * @author PropertyHub Team
 */

import React, { useEffect, useState } from 'react';
import { useLandlordDashboard } from '../hooks/useLandlordDashboard';
import {
  BarChart3,
  TrendingUp,
  Users,
  Home,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ChevronRight,
} from 'lucide-react';

export interface LandlordDashboardProps {
  userId: string;
  onPropertyClick?: (propertyId: string) => void;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({ userId, onPropertyClick }) => {
  const {
    analytics,
    paymentAnalytics,
    selectedProperty,
    selectedTenants,
    timeframe,
    loading,
    error,
    fetchLandlordAnalytics,
    fetchPaymentAnalytics,
    fetchPropertyMetrics,
    fetchTenantScores,
    selectProperty,
    setTimeframe,
    generateReport,
    clearError,
    refreshData,
  } = useLandlordDashboard();

  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      refreshData(userId);
    }
  }, [userId, refreshData]);

  // Handle property selection
  const handlePropertySelect = async (propertyId: string) => {
    selectProperty(propertyId);
    await Promise.all([
      fetchPropertyMetrics(propertyId),
      fetchTenantScores(propertyId),
    ]);
    setShowPropertyDetails(true);
    onPropertyClick?.(propertyId);
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      const report = await generateReport(userId);
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `landlord-report-${new Date().toISOString()}.json`;
      link.click();
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report');
    } finally {
      setReportGenerating(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Property Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {analytics?.totalProperties || 0} Properties • {analytics?.totalUnits || 0} Units
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Timeframe Selector */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                {(['monthly', 'quarterly', 'yearly'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      timeframe === tf
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => refreshData(userId)}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleGenerateReport}
                disabled={!analytics || reportGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                <Download className="w-4 h-4" />
                {reportGenerating ? 'Generating...' : 'Download Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{error.message}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                  <p className="text-sm text-green-600 font-medium mt-2">
                    ↑ {formatCurrency(analytics.monthlyRevenue)}/month
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Net Income</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(
                      analytics.totalRevenue - analytics.totalExpenses
                    )}
                  </p>
                  <p className="text-sm text-gray-600 font-medium mt-2">
                    Expenses: {formatCurrency(analytics.totalExpenses)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatPercent(analytics.portfolioOccupancyRate)}
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        analytics.portfolioOccupancyRate >= 80
                          ? 'bg-green-600'
                          : analytics.portfolioOccupancyRate >= 60
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                      }`}
                      style={{ width: `${analytics.portfolioOccupancyRate}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Home className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Active Tenants */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Tenants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {selectedTenants.length || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 font-medium mt-2">
                    Across {analytics.totalProperties} properties
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Alerts */}
        {analytics && analytics.riskAlerts.length > 0 && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Risk Alerts ({analytics.riskAlerts.length})
            </h3>
            <div className="space-y-2">
              {analytics.riskAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    alert.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : alert.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Properties List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Properties</h2>

            {!analytics || loading ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading analytics...</p>
              </div>
            ) : analytics.properties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No properties yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.properties.map((property) => (
                  <div
                    key={property.propertyId}
                    onClick={() => handlePropertySelect(property.propertyId)}
                    className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition ${
                      selectedProperty?.propertyId === property.propertyId
                        ? 'ring-2 ring-blue-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {property.propertyName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {property.occupancy.totalUnits} units
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Monthly Revenue</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(property.revenue.monthlyRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Occupancy</p>
                        <p className="font-semibold text-gray-900">
                          {formatPercent(property.occupancy.occupancyRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Collection Rate</p>
                        <p className="font-semibold text-gray-900">
                          {formatPercent(property.revenue.collectionRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">ROI</p>
                        <p className={`font-semibold ${property.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {property.roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property Details Sidebar */}
          {selectedProperty && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {selectedProperty.propertyName} Details
              </h3>

              <div className="space-y-4 mb-6">
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">Net Income</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedProperty.netIncome)}
                  </p>
                </div>

                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedProperty.expenses)}
                  </p>
                </div>

                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">Occupancy Duration</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedProperty.occupancy.averageOccupancyDuration} days avg
                  </p>
                </div>
              </div>

              {/* Top Tenants */}
              {selectedProperty.topTenants.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Top Tenants</h4>
                  <div className="space-y-2">
                    {selectedProperty.topTenants.slice(0, 3).map((tenant) => (
                      <div
                        key={tenant.tenantId}
                        className="p-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <p className="font-medium text-gray-900">{tenant.tenantName}</p>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                          <span>Score: {tenant.overallScore.toFixed(0)}</span>
                          <span className={tenant.riskLevel === 'low' ? 'text-green-600' : 'text-yellow-600'}>
                            {tenant.riskLevel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
