import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, LockKeyhole, MessageCircleMore, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { User as AppUser } from '../types';
import { authService } from '../services/supabaseApi';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { mapSupabaseUserToAppUser } from '../utils/authUser';
import { BrandMark } from './BrandMark';
import { SocialAuthButtons } from './auth/SocialAuthButtons';

interface LoginProps {
  onLogin: (user: AppUser) => Promise<void> | void;
  onBack: () => void;
  onSignup: () => void;
}

const signInBenefits = [
  {
    icon: ShieldCheck,
    title: 'Trusted listings',
    description: 'Return to a cleaner browse view with consistent pricing and status details.',
  },
  {
    icon: MessageCircleMore,
    title: 'Conversations stay synced',
    description: 'Jump back into saved chats and viewing requests without reorienting yourself.',
  },
];

export const Login: React.FC<LoginProps> = ({ onLogin, onBack, onSignup }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Supabase auth is not configured yet. Add your credentials to enable sign-in.');
      return;
    }

    try {
      setLoading(true);
      setNeedsEmailConfirmation(false);
      const { user, profile, error } = await authService.signin(email, password);

      if (error) throw error;
      if (!user) throw new Error('We could not find your account. Please try again.');

      await onLogin(mapSupabaseUserToAppUser(user, profile));
      toast.success('Welcome back to PropertyHub.');
    } catch (error) {
      const authCode =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : undefined;

      if (authCode === 'email_not_confirmed') {
        setNeedsEmailConfirmation(true);
        toast.error('Verify your email before signing in.');
      } else {
        toast.error(
          error instanceof Error ? error.message : 'Sign-in failed. Please check your details.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error('Enter the email address you used to sign up first.');
      return;
    }

    try {
      setResendLoading(true);
      const { error } = await authService.resendSignupVerification(email.trim());
      if (error) throw error;
      toast.success('Verification email sent. Check your inbox and spam folder.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'We could not resend the verification email right now.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="theme-page-shell relative min-h-[100dvh] overflow-x-hidden">
      <div className="theme-page-glow absolute inset-0" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
        <header className="wire-navbar flex items-center justify-between gap-4 rounded-[30px] px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="wire-navbar-subtle flex items-center gap-3 text-left text-sm font-medium transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-[16px]" />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold tracking-tight">PropertyHub</div>
              <div className="wire-navbar-subtle text-xs">Secure sign in</div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 py-8 lg:flex-1 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:gap-12 lg:py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-2 space-y-6 lg:order-1"
          >
            <div className="space-y-4">
              <span className="theme-accent-badge inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                <LockKeyhole className="h-4 w-4" />
                Welcome back
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Pick up your search without losing your place.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Favorites, messages, and viewing plans stay together so the next step feels
                  obvious as soon as you sign in.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {signInBenefits.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.06 }}
                  className="air-surface rounded-[28px] p-5"
                >
                  <div className="theme-accent-icon flex h-11 w-11 items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-base font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="air-panel rounded-[32px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Saved home</div>
                  <div className="mt-1 text-2xl font-semibold">East Legon Loft</div>
                </div>
                <div className="theme-success-badge px-3 py-1 text-xs font-semibold">Verified</div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Price', value: 'GHS 680' },
                  { label: 'Replies', value: '< 5 min' },
                  { label: 'Rating', value: '4.9/5' },
                ].map((item) => (
                  <div key={item.label} className="air-surface-muted rounded-[22px] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-2 text-base font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-1 lg:order-2 lg:justify-self-center lg:w-full lg:max-w-xl"
          >
            <div className="air-panel rounded-[32px] p-6 sm:p-8">
              <div className="mb-8 space-y-3">
                <div className="theme-accent-badge inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em]">
                  <CheckCircle2 className="h-4 w-4" />
                  Sign in
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Continue to your account</h2>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Use email or continue with Google or Apple.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <SocialAuthButtons mode="login" />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Or use email
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (needsEmailConfirmation) {
                          setNeedsEmailConfirmation(false);
                        }
                      }}
                      placeholder="you@example.com"
                      className="focus-ring theme-input-surface w-full rounded-[20px] border border-border bg-background px-5 py-4 text-base text-foreground shadow-none placeholder:text-muted-foreground"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="focus-ring theme-input-surface w-full rounded-[20px] border border-border bg-background px-5 py-4 text-base text-foreground shadow-none placeholder:text-muted-foreground"
                      required
                    />
                  </label>
                </div>

                {needsEmailConfirmation ? (
                  <div className="air-surface-muted rounded-[24px] border border-border/80 px-4 py-4 text-sm text-muted-foreground">
                    <p className="leading-6">
                      This account still needs email verification before the first sign-in.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleResendVerification()}
                      disabled={resendLoading}
                      className="mt-3 font-semibold text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resendLoading ? 'Sending verification email...' : 'Resend verification email'}
                    </button>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary h-14 w-full rounded-full text-base font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Signing you in...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>New to PropertyHub?</span>
                <button
                  type="button"
                  onClick={onSignup}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Create account
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Login;
