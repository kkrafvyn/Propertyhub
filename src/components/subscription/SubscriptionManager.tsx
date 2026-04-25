import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../types';
import type {
  BillingHistory,
  PaymentMethod,
  Subscription,
  SubscriptionPlan,
  SubscriptionUsage,
} from '../../types/subscription';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import { Button } from '../ui/button';
import PaystackSubscriptionPayment from './PaystackSubscriptionPayment';
import SubscriptionDashboard from './SubscriptionDashboard';
import SubscriptionPlans from './SubscriptionPlans';

interface SubscriptionManagerProps {
  currentUser: User;
  onClose: () => void;
  className?: string;
}

const isHostOrAdmin = (role: string): boolean => role === 'host' || role === 'admin';

const getDefaultPlan = (): SubscriptionPlan => {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === 'professional') ?? SUBSCRIPTION_PLANS[0];
};

const createSubscription = (userId: string, planId: string): Subscription => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    id: `sub_${Date.now()}`,
    userId,
    planId,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: endDate,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  };
};

const createUsage = (subscriptionId: string, plan: SubscriptionPlan): SubscriptionUsage => {
  const maxProperties = plan.maxProperties ?? 0;
  const maxPhotos = plan.maxPhotos ?? 0;

  return {
    subscriptionId,
    currentProperties: maxProperties === -1 ? 8 : Math.max(1, Math.floor(maxProperties * 0.5)),
    maxProperties,
    currentPhotos: maxPhotos === -1 ? 40 : Math.max(10, Math.floor(maxPhotos * 0.6)),
    maxPhotos,
    featuresUsed: ['analytics'],
    lastUpdated: new Date(),
  };
};

const createPaymentMethods = (userId: string): PaymentMethod[] => [
  {
    id: `pm_${userId}`,
    userId,
    type: 'card',
    cardBrand: 'Visa',
    last4: '4242',
    isDefault: true,
    paystackAuthCode: 'AUTH_seed',
    createdAt: new Date(),
  },
];

const createBillingHistory = (subscriptionId: string, plan: SubscriptionPlan): BillingHistory[] => [
  {
    id: `bill_${Date.now()}`,
    subscriptionId,
    amount: plan.price ?? 0,
    currency: plan.currency ?? 'NGN',
    status: 'paid',
    paidAt: new Date(),
    paystackReference: `ref_${Date.now()}`,
    invoiceUrl: '#',
    createdAt: new Date(),
  },
];

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  currentUser,
  onClose,
  className = '',
}) => {
  const defaultPlan = React.useMemo(() => getDefaultPlan(), []);
  const hasHostAccess = isHostOrAdmin(currentUser.role);
  const seededSubscription = React.useMemo(
    () => (hasHostAccess ? createSubscription(currentUser.id, defaultPlan.id) : null),
    [currentUser.id, defaultPlan.id, hasHostAccess]
  );

  const [subscription, setSubscription] = React.useState<Subscription | null>(seededSubscription);
  const [selectedPlan, setSelectedPlan] = React.useState<SubscriptionPlan | null>(null);
  const [showPayment, setShowPayment] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<'plans' | 'dashboard'>(
    seededSubscription ? 'dashboard' : 'plans'
  );
  const [usage, setUsage] = React.useState<SubscriptionUsage>(() =>
    createUsage(seededSubscription?.id ?? 'seed_usage', defaultPlan)
  );
  const [billingHistory, setBillingHistory] = React.useState<BillingHistory[]>(() =>
    createBillingHistory(seededSubscription?.id ?? 'seed_subscription', defaultPlan)
  );
  const [paymentMethods] = React.useState<PaymentMethod[]>(() =>
    createPaymentMethods(currentUser.id)
  );

  React.useEffect(() => {
    if (subscription) {
      setCurrentView('dashboard');
    }
  }, [subscription]);

  const handleSelectPlan = (planId: string) => {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
    if (!plan) {
      toast.error('Selected plan is unavailable.');
      return;
    }

    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentData: {
    planCode: string;
    customerCode: string;
    subscriptionCode?: string;
  }) => {
    if (!selectedPlan) {
      return;
    }

    const nextSubscription = createSubscription(currentUser.id, selectedPlan.id);
    nextSubscription.paystackCustomerCode = paymentData.customerCode;
    nextSubscription.paystackSubscriptionCode = paymentData.subscriptionCode;

    setSubscription(nextSubscription);
    setUsage(createUsage(nextSubscription.id, selectedPlan));
    setBillingHistory((previous) => [
      {
        id: `bill_${Date.now()}`,
        subscriptionId: nextSubscription.id,
        amount: selectedPlan.price ?? 0,
        currency: selectedPlan.currency ?? 'NGN',
        status: 'paid',
        paidAt: new Date(),
        paystackReference: `ref_${Date.now()}`,
        invoiceUrl: '#',
        createdAt: new Date(),
      },
      ...previous,
    ]);
    setShowPayment(false);
    setSelectedPlan(null);
    toast.success(`${selectedPlan.name} plan is now active.`);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error || 'Subscription payment failed.');
  };

  const handleUpgrade = () => {
    setCurrentView('plans');
  };

  const handleCancel = () => {
    if (!subscription) {
      return;
    }

    setSubscription({
      ...subscription,
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    });
    toast.success('Subscription cancellation has been scheduled.');
  };

  const handleUpdatePayment = () => {
    toast.info('Payment method updates will be available soon.');
  };

  const handleDownloadInvoice = (billingId: string) => {
    const invoice = billingHistory.find((item) => item.id === billingId);
    if (!invoice?.invoiceUrl || invoice.invoiceUrl === '#') {
      toast.info('Invoice is not ready yet.');
      return;
    }

    window.open(invoice.invoiceUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRetryPayment = async (billingId: string) => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 900));

    setBillingHistory((previous) =>
      previous.map((entry) =>
        entry.id === billingId
          ? {
              ...entry,
              status: 'paid',
              paidAt: new Date(),
            }
          : entry
      )
    );
    setLoading(false);
    toast.success('Payment retry completed successfully.');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Subscription</h2>
          <p className="text-sm text-muted-foreground">
            Manage your hosting plan, billing, and payment details.
          </p>
        </div>

        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {showPayment && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <PaystackSubscriptionPayment
            plan={selectedPlan}
            userEmail={currentUser.email}
            userName={currentUser.name}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onClose={() => setShowPayment(false)}
            existingPaymentMethod={paymentMethods.find((method) => method.isDefault)}
            isUpgrade={Boolean(subscription)}
          />
        </div>
      )}

      {currentView === 'dashboard' && subscription ? (
        <SubscriptionDashboard
          subscription={subscription}
          usage={usage}
          billingHistory={billingHistory}
          paymentMethods={paymentMethods}
          onUpgrade={handleUpgrade}
          onCancel={handleCancel}
          onUpdatePayment={handleUpdatePayment}
          onDownloadInvoice={handleDownloadInvoice}
          onRetryPayment={handleRetryPayment}
          loading={loading}
        />
      ) : (
        <div className="space-y-3">
          {!hasHostAccess && (
            <p className="text-sm text-muted-foreground">
              Pick a hosting plan to unlock listing and billing tools.
            </p>
          )}

          <SubscriptionPlans
            currentSubscription={subscription}
            onSelectPlan={handleSelectPlan}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
