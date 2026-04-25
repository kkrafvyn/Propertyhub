/**
 * Subscription Plans Component
 * 
 * Displays available subscription plans for property hosts with pricing,
 * features, and upgrade/downgrade options.
 */

import React from 'react';
import type { SubscriptionPlan, Subscription } from '../../types/subscription';
import { SUBSCRIPTION_PLANS, formatPrice } from '../../types/subscription';

interface SubscriptionPlansProps {
  currentSubscription?: Subscription | null;
  onSelectPlan: (planId: string) => void;
  loading?: boolean;
  className?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  currentSubscription,
  onSelectPlan,
  loading = false,
  className = ''
}) => {
  const [selectedInterval, setSelectedInterval] = React.useState<'monthly' | 'yearly'>('monthly');

  const filteredPlans = SUBSCRIPTION_PLANS.filter(plan => 
    plan.interval === selectedInterval
  );

  const isCurrentPlan = (planId: string): boolean => {
    return currentSubscription?.planId === planId;
  };

  const getPlanButtonText = (plan: SubscriptionPlan): string => {
    if (isCurrentPlan(plan.id)) {
      return 'Current Plan';
    }
    
    if (!currentSubscription) {
      return 'Start Free Trial';
    }
    
    const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === currentSubscription.planId);
    if (!currentPlan) return 'Select Plan';
    
    // Compare plan prices to determine if it's an upgrade or downgrade
    if (plan.price > currentPlan.price) {
      return 'Upgrade';
    } else if (plan.price < currentPlan.price) {
      return 'Downgrade';
    }
    
    return 'Switch Plan';
  };

  const isPlanDisabled = (plan: SubscriptionPlan): boolean => {
    return loading || isCurrentPlan(plan.id);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Choose Your Host Plan</h2>
        <p className="text-muted-foreground mb-6">
          Select the perfect plan to grow your property business
        </p>
        
        {/* Billing Toggle */}
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setSelectedInterval('monthly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedInterval === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedInterval('yearly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedInterval === 'yearly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              Save up to 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-card rounded-lg border p-6 ${
              plan.popularBadge
                ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                : 'border-border hover:border-primary/50'
            } transition-all duration-200`}
          >
            {/* Popular Badge */}
            {plan.popularBadge && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Current Plan Badge */}
            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              
              <div className="mb-4">
                <span className="text-4xl font-bold">
                  {formatPrice(plan.price, plan.currency)}
                </span>
                <span className="text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>

              {/* Discount Badge */}
              {plan.discountPercentage && (
                <div className="text-green-600 font-medium mb-2">
                  Save {plan.discountPercentage}% with annual billing
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-0.5">✓</span>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              onClick={() => onSelectPlan(plan.id)}
              disabled={isPlanDisabled(plan)}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                plan.popularBadge && !isCurrentPlan(plan.id)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : isCurrentPlan(plan.id)
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : getPlanButtonText(plan)}
            </button>

            {/* Plan Limits */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Properties:</span>
                  <span>{plan.maxProperties === -1 ? 'Unlimited' : plan.maxProperties}</span>
                </div>
                <div className="flex justify-between">
                  <span>Photos per property:</span>
                  <span>{plan.maxPhotos === -1 ? 'Unlimited' : plan.maxPhotos}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority Support:</span>
                  <span>{plan.prioritySupport ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Free Trial Info */}
      {!currentSubscription && (
        <div className="text-center mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">
            🎉 Start with a 14-day free trial
          </h4>
          <p className="text-blue-700 text-sm">
            Try any plan risk-free. No credit card required to start your trial.
            Cancel anytime during the trial period.
          </p>
        </div>
      )}

      {/* Enterprise Contact */}
      <div className="text-center mt-8 p-6 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">Need a custom solution?</h4>
        <p className="text-muted-foreground mb-4">
          For property management companies with 50+ properties, we offer custom enterprise solutions.
        </p>
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Contact Sales
        </button>
      </div>

      {/* FAQ Section */}
      <div className="mt-12 max-w-3xl mx-auto">
        <h3 className="text-xl font-bold text-center mb-6">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold mb-2">Can I change my plan anytime?</h4>
            <p className="text-muted-foreground text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately,
              and billing is prorated.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold mb-2">What happens if I exceed my plan limits?</h4>
            <p className="text-muted-foreground text-sm">
              We'll notify you when you're approaching your limits. You can upgrade your plan
              or remove some properties to stay within your current plan's limits.
            </p>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
            <p className="text-muted-foreground text-sm">
              We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied,
              contact our support team for a full refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;