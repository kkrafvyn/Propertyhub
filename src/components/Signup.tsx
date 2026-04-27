import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { User as AppUser, UserRole } from '../types';
import { authService } from '../services/supabaseApi';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { defaultAuthPreferences, mapSupabaseUserToAppUser } from '../utils/authUser';
import { BrandMark } from './BrandMark';
import { SocialAuthButtons } from './auth/SocialAuthButtons';

interface SignupProps {
  onSignup: (user: AppUser) => Promise<void> | void;
  onBack: () => void;
  onLogin: () => void;
}

const roleOptions: Array<{
  value: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'user',
    label: 'User',
    description: 'Search homes, rent, buy, lease, and track your property journey.',
    icon: UserCircle2,
  },
  {
    value: 'host',
    label: 'Landlord',
    description: 'List properties for rent, sale, or lease and manage offers cleanly.',
    icon: Home,
  },
];

export const Signup: React.FC<SignupProps> = ({ onSignup, onBack, onLogin }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
  });
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error('Supabase auth is not configured yet. Add your credentials to enable sign-up.');
      return;
    }

    try {
      setLoading(true);
      const { user, session, profile, error } = await authService.signup(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        status: 'active',
        rating: 0,
        verified: false,
        preferences: defaultAuthPreferences,
      });

      if (error) throw error;
      if (!user) throw new Error('We could not create your account. Please try again.');

      if (!session) {
        toast.success(
          'Account created. Verify your email, then come back and sign in with the same password.'
        );
        onLogin();
        return;
      }

      await onSignup(mapSupabaseUserToAppUser(user, profile, formData.role));
      toast.success('Welcome to PropertyHub.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Sign-up failed. Please try again.'
      );
    } finally {
      setLoading(false);
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
              <div className="wire-navbar-subtle text-xs">Create account</div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 py-8 lg:flex-1 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-2 space-y-6 lg:order-1"
          >
            <div className="space-y-4">
              <span className="theme-accent-badge inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles className="h-4 w-4" />
                Create your account
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Set up your account in a few clean steps.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  One account gives you saved properties, conversations, availability management,
                  and a consistent experience across light, dark, and accessibility-focused modes.
                </p>
              </div>
            </div>

            <div className="air-panel rounded-[32px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Why it helps</div>
                  <div className="mt-1 text-2xl font-semibold">Everything stays together</div>
                </div>
                <div className="theme-success-badge px-3 py-1 text-xs font-semibold">New account</div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Saved homes', value: 'Synced' },
                  { label: 'Messages', value: 'Unified' },
                  { label: 'Payments', value: 'Tracked' },
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
            className="order-1 lg:order-2 lg:justify-self-center lg:w-full lg:max-w-2xl"
          >
            <div className="air-panel rounded-[32px] p-6 sm:p-8">
              <div className="mb-8 space-y-3">
                <div className="theme-accent-badge inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em]">
                  <CheckCircle2 className="h-4 w-4" />
                  Join PropertyHub
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Sign up with Google, Apple, or email and choose the role that fits you best.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <SocialAuthButtons mode="signup" role={formData.role} />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Full name</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your full name"
                      className="focus-ring theme-input-surface w-full rounded-[20px] border border-border bg-background px-5 py-4 text-base text-foreground shadow-none placeholder:text-muted-foreground"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="focus-ring theme-input-surface w-full rounded-[20px] border border-border bg-background px-5 py-4 text-base text-foreground shadow-none placeholder:text-muted-foreground"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Password</span>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a strong password"
                      className="focus-ring theme-input-surface w-full rounded-[20px] border border-border bg-background px-5 py-4 text-base text-foreground shadow-none placeholder:text-muted-foreground"
                      required
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <span className="text-sm font-medium">Account type</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = formData.role === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              role: option.value,
                            }))
                          }
                          className={`rounded-[24px] border p-4 text-left transition-all ${
                            isActive
                              ? 'theme-accent-badge shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_12%,transparent)]'
                              : 'border-border bg-card/90 hover:bg-secondary'
                          }`}
                        >
                          <div className="theme-accent-icon flex h-10 w-10 items-center justify-center">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="mt-4 text-sm font-semibold">{option.label}</div>
                          <div className="mt-2 text-xs leading-5 text-muted-foreground">
                            {option.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary h-14 w-full rounded-full text-base font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={onLogin}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Sign in
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Signup;
