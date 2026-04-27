import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  CreditCard,
  LifeBuoy,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { AppState, User } from '../types';
import { getRoleWorkspace, normalizeUserRole } from '../utils/roleCapabilities';

interface HelpCenterProps {
  currentUser: User;
  onBack: () => void;
  onNavigate?: (state: AppState) => void;
}

interface QuickAction {
  label: string;
  description: string;
  state: AppState;
  icon: React.ComponentType<{ className?: string }>;
}

const HELP_TOPICS = [
  {
    title: 'Trouble signing in?',
    body: 'Open Settings to resend verification mail or trigger a password reset without leaving the app.',
  },
  {
    title: 'Payment or receipt question?',
    body: 'Use the billing workspace to review transaction history, saved methods, and checkout readiness before you escalate.',
  },
  {
    title: 'Need help with a listing or deal?',
    body: 'Use Messages to keep landlord, tenant, buyer, or support conversations attached to the property journey.',
  },
  {
    title: 'Want to manage privacy or export data?',
    body: 'Open the privacy center to control profile visibility, read receipts, and account export options.',
  },
] as const;

export function HelpCenter({ currentUser, onBack, onNavigate }: HelpCenterProps) {
  const workspace = React.useMemo(() => getRoleWorkspace(currentUser), [currentUser]);
  const normalizedRole = normalizeUserRole(currentUser.role);

  const quickActions = React.useMemo<QuickAction[]>(() => {
    const sharedActions: QuickAction[] = [
      {
        label: 'Messages',
        description: 'Reach active conversations and support hand-offs quickly.',
        state: 'chat',
        icon: MessageSquare,
      },
      {
        label: 'Billing',
        description: 'Review payment history and checkout readiness.',
        state: 'billing',
        icon: CreditCard,
      },
      {
        label: 'Privacy',
        description: 'Control visibility, exports, and sharing defaults.',
        state: 'privacy',
        icon: LockKeyhole,
      },
    ];

    if (normalizedRole === 'host') {
      return [
        {
          label: 'Portfolio',
          description: 'Jump back to listings, availability, and deal follow-up.',
          state: 'property-management',
          icon: BookOpen,
        },
        ...sharedActions,
      ];
    }

    if (normalizedRole === 'admin') {
      return [
        {
          label: 'Admin control',
          description: 'Return to listing, trust, and operational oversight.',
          state: 'admin',
          icon: ShieldCheck,
        },
        ...sharedActions,
      ];
    }

    return [
      {
        label: 'Explore homes',
        description: 'Go back to the marketplace and keep moving on listings.',
        state: 'marketplace',
        icon: Sparkles,
      },
      ...sharedActions,
    ];
  }, [normalizedRole]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <motion.header
        className="air-panel rounded-[34px] px-5 py-6 sm:px-8 sm:py-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Help center</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Get unstuck quickly without leaving the app. The fastest path is usually the
                workspace already tied to the issue.
              </p>
            </div>

            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              {workspace.label} support flow
            </Badge>
          </div>
        </div>
      </motion.header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Card key={action.label} className="rounded-[28px]">
              <CardContent className="space-y-4 px-6 py-5">
                <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-base font-semibold">{action.label}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
                </div>
                {onNavigate ? (
                  <Button type="button" variant="outline" onClick={() => onNavigate(action.state)} className="rounded-full">
                    Open
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Common help topics
            </CardTitle>
            <CardDescription>
              The main operational questions people hit while signing in, paying, booking, and
              managing listings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {HELP_TOPICS.map((topic) => (
              <div key={topic.title} className="air-surface rounded-[24px] px-5 py-4">
                <div className="text-sm font-semibold">{topic.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Account readiness</CardTitle>
            <CardDescription>
              A quick check before you escalate a blocked workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="air-surface rounded-[24px] px-5 py-4">
              <div className="text-sm font-semibold">Email verification</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {currentUser.emailVerified
                  ? 'Your email is already confirmed.'
                  : 'Your email still needs confirmation. Settings can resend the verification message.'}
              </p>
            </div>

            <div className="air-surface rounded-[24px] px-5 py-4">
              <div className="text-sm font-semibold">Best support lane</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {normalizedRole === 'host'
                  ? 'Landlords usually resolve the next issue fastest from Portfolio, Messages, or Billing.'
                  : normalizedRole === 'admin'
                    ? 'Admins usually resolve the next issue fastest from Admin control, Messages, or Billing.'
                    : 'Users usually resolve the next issue fastest from Marketplace, Messages, or Billing.'}
              </p>
            </div>

            {onNavigate ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onNavigate('profile-settings')} className="rounded-full">
                  Open settings
                </Button>
                <Button type="button" variant="outline" onClick={() => onNavigate('privacy')} className="rounded-full">
                  Privacy center
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default HelpCenter;
