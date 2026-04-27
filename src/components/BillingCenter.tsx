import React from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { AppState, User } from '../types';
import type { PaymentMethod, Transaction } from '../types/payment';
import { envConfig } from '../utils/envConfig';
import { paymentMethodService, transactionService } from '../services/paymentService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface BillingCenterProps {
  currentUser: User;
  onBack: () => void;
  onNavigate?: (state: AppState) => void;
}

const formatCurrency = (amount: number, currency = 'GHS') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`;
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Pending';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatStatus = (value?: string) =>
  (value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const methodLabel = (method: PaymentMethod) => {
  if (method.card_brand && method.card_last_four) {
    return `${method.card_brand} ending in ${method.card_last_four}`;
  }

  if (method.account_reference) {
    return method.account_reference;
  }

  return `${method.provider} method`;
};

export function BillingCenter({ currentUser, onBack, onNavigate }: BillingCenterProps) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadBillingData = async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setTransactions([]);
          setPaymentMethods([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [{ data: transactionRows, error: transactionError }, { data: methodRows, error: methodError }] =
          await Promise.all([
            transactionService.getUserTransactions(currentUser.id, 8, 0),
            paymentMethodService.getUserPaymentMethods(currentUser.id),
          ]);

        if (transactionError) throw transactionError;
        if (methodError) throw methodError;

        if (!cancelled) {
          setTransactions(transactionRows || []);
          setPaymentMethods(methodRows || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load billing details right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBillingData();

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  const totalVolume = transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const completedTransactions = transactions.filter((transaction) => transaction.status === 'completed');
  const pendingTransactions = transactions.filter((transaction) => transaction.status === 'pending');
  const failedTransactions = transactions.filter((transaction) =>
    transaction.status === 'failed' || transaction.status === 'refunded',
  );
  const livePaymentsReady = Boolean(envConfig.API_URL && envConfig.PAYSTACK_PUBLIC_KEY);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <motion.header
        className="air-panel rounded-[34px] px-5 py-6 sm:px-8 sm:py-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button type="button" variant="outline" size="sm" onClick={onBack} className="w-fit">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Billing & payments</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Review transaction history, saved payment methods, and checkout readiness for this
                account.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {onNavigate ? (
              <>
                <Button type="button" variant="outline" onClick={() => onNavigate('dashboard')} className="rounded-full">
                  Dashboard
                </Button>
                <Button type="button" variant="outline" onClick={() => onNavigate('help')} className="rounded-full">
                  Help
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </motion.header>

      {!livePaymentsReady ? (
        <Card className="rounded-[28px] border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <div className="text-sm font-semibold">Live checkout is not fully wired yet</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  The billing workspace is live, but production payment initialization still needs a
                  real backend origin and public gateway key in the environment.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Action needed
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px]">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">Total volume</div>
                <div className="text-2xl font-semibold">{formatCurrency(totalVolume)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="theme-success-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">Completed</div>
                <div className="text-2xl font-semibold">{completedTransactions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="theme-warning-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                <Clock3 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">Pending / needs review</div>
                <div className="text-2xl font-semibold">{pendingTransactions.length + failedTransactions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="theme-info-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">Saved payment methods</div>
                <div className="text-2xl font-semibold">{paymentMethods.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent transactions
            </CardTitle>
            <CardDescription>
              The latest charge, refund, escrow, and service payment records tied to this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-[24px] border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
                Loading billing activity...
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="air-surface flex flex-col gap-3 rounded-[24px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{formatStatus(transaction.type)}</div>
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                        {formatStatus(transaction.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {transaction.description || 'Transaction recorded in your payment ledger.'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(transaction.completed_at || transaction.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-semibold">
                      {formatCurrency(Number(transaction.amount || 0), transaction.currency || 'GHS')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.provider ? formatStatus(transaction.provider) : 'Direct record'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
                No billing activity has been recorded for this account yet.
              </div>
            )}

            {error ? (
              <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Saved payment methods</CardTitle>
            <CardDescription>
              Keep track of the providers and cards currently tied to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <div key={method.id} className="air-surface rounded-[24px] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{methodLabel(method)}</div>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {method.provider}
                      </p>
                    </div>
                    {method.is_default ? (
                      <Badge className="rounded-full px-2.5 py-0.5">Default</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
                No saved payment methods yet. Your first completed checkout can add one once the
                production gateway is configured.
              </div>
            )}

            <div className="air-surface-muted rounded-[24px] px-5 py-4 text-sm text-muted-foreground">
              PropertyHub keeps the workspace ready for Paystack-backed billing, but secret gateway
              credentials stay server-side.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default BillingCenter;
