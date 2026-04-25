/**
 * Subscription Dashboard Component
 * 
 * Comprehensive dashboard for hosts to manage their subscription,
 * billing history, usage, and payment methods.
 */

import React from 'react';
import type { 
  Subscription, 
  SubscriptionPlan, 
  BillingHistory, 
  PaymentMethod, 
  SubscriptionUsage 
} from '../../types/subscription';
import { 
  SUBSCRIPTION_PLANS, 
  formatPrice, 
  getSubscriptionStatusColor, 
  getSubscriptionStatusText,
  calculateDaysUntilRenewal,
  isSubscriptionActive 
} from '../../types/subscription';

interface SubscriptionDashboardProps {
  subscription: Subscription;
  usage: SubscriptionUsage;
  billingHistory: BillingHistory[];
  paymentMethods: PaymentMethod[];
  onUpgrade: () => void;
  onCancel: () => void;
  onUpdatePayment: () => void;
  onDownloadInvoice: (billingId: string) => void;
  onRetryPayment: (billingId: string) => void;
  loading?: boolean;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  subscription,
  usage,
  billingHistory,
  paymentMethods,
  onUpgrade,
  onCancel,
  onUpdatePayment,
  onDownloadInvoice,
  onRetryPayment,
  loading = false
}) => {
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
  const daysUntilRenewal = calculateDaysUntilRenewal(subscription.currentPeriodEnd);
  const isActive = isSubscriptionActive(subscription);
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);

  const getUsagePercentage = (current: number, max: number): number => {
    if (max === -1) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subscription Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your PropertyHub hosting subscription
          </p>
        </div>
        
        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={onUpdatePayment}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Update Payment
            </button>
          </div>
        )}
      </div>

      {/* Current Subscription Card */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-semibold">
                {currentPlan?.name || 'Unknown Plan'}
              </h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubscriptionStatusColor(subscription.status)}`}>
                {getSubscriptionStatusText(subscription.status)}
              </span>
            </div>
            
            <p className="text-muted-foreground mb-4">
              {currentPlan?.description}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Price:</span>
                <p className="font-semibold">
                  {formatPrice(currentPlan?.price || 0, currentPlan?.currency || 'NGN')}
                  <span className="text-muted-foreground">
                    /{currentPlan?.interval}
                  </span>
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Next Billing:</span>
                <p className="font-semibold">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Days Remaining:</span>
                <p className="font-semibold">{daysUntilRenewal} days</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Auto-Renew:</span>
                <p className="font-semibold">
                  {subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
                </p>
              </div>
            </div>
          </div>

          {subscription.status === 'past_due' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Payment Required</h3>
              <p className="text-red-700 text-sm mb-3">
                Your payment failed. Update your payment method or retry the payment.
              </p>
              <button
                onClick={() => onRetryPayment(billingHistory[0]?.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Usage & Limits</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Properties Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Properties</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentProperties} / {currentPlan?.maxProperties === -1 ? '∞' : currentPlan?.maxProperties}
              </span>
            </div>
            
            {currentPlan?.maxProperties !== -1 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getUsageColor(getUsagePercentage(usage.currentProperties, currentPlan?.maxProperties || 0))
                  }`}
                  style={{
                    width: `${getUsagePercentage(usage.currentProperties, currentPlan?.maxProperties || 0)}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Photos Usage */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Photos</span>
              <span className="text-sm text-muted-foreground">
                {usage.currentPhotos} / {currentPlan?.maxPhotos === -1 ? '∞' : currentPlan?.maxPhotos}
              </span>
            </div>
            
            {currentPlan?.maxPhotos !== -1 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getUsageColor(getUsagePercentage(usage.currentPhotos, currentPlan?.maxPhotos || 0))
                  }`}
                  style={{
                    width: `${getUsagePercentage(usage.currentPhotos, currentPlan?.maxPhotos || 0)}%`
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Features Access */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Available Features</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={`flex items-center text-sm ${currentPlan?.prioritySupport ? 'text-green-600' : 'text-muted-foreground'}`}>
              <span className="mr-2">{currentPlan?.prioritySupport ? '✓' : '✗'}</span>
              Priority Support
            </div>
            <div className={`flex items-center text-sm ${currentPlan?.analyticsAccess ? 'text-green-600' : 'text-muted-foreground'}`}>
              <span className="mr-2">{currentPlan?.analyticsAccess ? '✓' : '✗'}</span>
              Analytics Access
            </div>
            <div className={`flex items-center text-sm ${currentPlan?.marketingTools ? 'text-green-600' : 'text-muted-foreground'}`}>
              <span className="mr-2">{currentPlan?.marketingTools ? '✓' : '✗'}</span>
              Marketing Tools
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Payment Method</h3>
          <button
            onClick={onUpdatePayment}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Update
          </button>
        </div>

        {defaultPaymentMethod ? (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold">
              {defaultPaymentMethod.cardBrand?.toUpperCase() || 'CARD'}
            </div>
            <div>
              <p className="font-medium">
                {defaultPaymentMethod.cardBrand} ending in {defaultPaymentMethod.last4}
              </p>
              <p className="text-sm text-muted-foreground">Default payment method</p>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-dashed border-muted-foreground rounded-lg text-center">
            <p className="text-muted-foreground mb-2">No payment method on file</p>
            <button
              onClick={onUpdatePayment}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Billing History</h3>
        
        {billingHistory.length > 0 ? (
          <div className="space-y-3">
            {billingHistory.slice(0, 5).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    bill.status === 'paid' ? 'bg-green-500' :
                    bill.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  
                  <div>
                    <p className="font-medium">
                      {formatPrice(bill.amount, bill.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(bill.createdAt).toLocaleDateString()} •{' '}
                      <span className="capitalize">{bill.status}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {bill.status === 'failed' && (
                    <button
                      onClick={() => onRetryPayment(bill.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  
                  {bill.status === 'paid' && bill.invoiceUrl && (
                    <button
                      onClick={() => onDownloadInvoice(bill.id)}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
                    >
                      Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {billingHistory.length > 5 && (
              <button className="w-full py-2 text-center text-primary hover:text-primary/80 text-sm font-medium">
                View All History
              </button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No billing history available
          </p>
        )}
      </div>

      {/* Subscription Actions */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Subscription Actions</h3>
        
        <div className="space-y-3">
          {subscription.cancelAtPeriodEnd ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">
                Subscription Cancellation Scheduled
              </h4>
              <p className="text-yellow-700 text-sm mb-3">
                Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                You can reactivate it before this date.
              </p>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                Reactivate Subscription
              </button>
            </div>
          ) : (
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Subscription
            </button>
          )}
          
          <p className="text-xs text-muted-foreground">
            Canceling will not affect your current billing period. You'll continue to have access
            to all features until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;