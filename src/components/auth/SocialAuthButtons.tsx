import React from 'react';
import { motion } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '../../types';
import { authService, type OAuthProvider } from '../../services/supabaseApi';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { storePendingOAuthRole } from '../../utils/auth';

interface SocialAuthButtonsProps {
  mode: 'login' | 'signup';
  role?: UserRole;
}

const providerLabels: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

const GoogleLogo: React.FC = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
    <path
      d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.7h5.39a4.61 4.61 0 0 1-2 3.02v2.5h3.23c1.89-1.73 2.98-4.28 2.98-7.26Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.23-2.5c-.89.6-2.03.95-3.38.95-2.6 0-4.81-1.75-5.6-4.1H3.06v2.58A9.99 9.99 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.4 13.94a5.98 5.98 0 0 1 0-3.88V7.48H3.06a9.99 9.99 0 0 0 0 9.04l3.34-2.58Z"
      fill="#FBBC04"
    />
    <path
      d="M12 5.96c1.47 0 2.78.51 3.82 1.5l2.87-2.87C16.95 2.97 14.69 2 12 2a9.99 9.99 0 0 0-8.94 5.48L6.4 10.06c.79-2.35 3-4.1 5.6-4.1Z"
      fill="#EA4335"
    />
  </svg>
);

const AppleLogo: React.FC = () => (
  <svg aria-hidden="true" className="h-5 w-5 text-foreground" viewBox="0 0 24 24">
    <path
      d="M16.7 12.9c0-2.2 1.8-3.3 1.9-3.4-1-1.4-2.6-1.6-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.7-1.5 0-2.9.9-3.6 2.2-1.5 2.5-.4 6.2 1.1 8.3.7 1 1.6 2.2 2.8 2.1 1.2 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.3 0 2.1-1.1 2.8-2.1.8-1.1 1.1-2.3 1.1-2.4 0 0-2.1-.8-2.1-3.1Zm-2.1-6.5c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.6 1 .1 2.1-.5 2.7-1.2Z"
      fill="currentColor"
    />
  </svg>
);

const providerIcons: Record<OAuthProvider, React.FC> = {
  google: GoogleLogo,
  apple: AppleLogo,
};

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ mode, role }) => {
  const [activeProvider, setActiveProvider] = React.useState<OAuthProvider | null>(null);

  const handleOAuth = async (provider: OAuthProvider) => {
    if (!isSupabaseConfigured()) {
      toast.error('Social sign-in is not configured yet. Add Supabase OAuth providers first.');
      return;
    }

    try {
      setActiveProvider(provider);
      storePendingOAuthRole(mode === 'signup' ? role : undefined);

      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;

      const { error } = await authService.signInWithOAuth(provider, redirectTo);
      if (error) throw error;
    } catch (error) {
      storePendingOAuthRole();
      setActiveProvider(null);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to start ${providerLabels[provider]} authentication right now.`
      );
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['google', 'apple'] as OAuthProvider[]).map((provider) => {
        const ProviderIcon = providerIcons[provider];
        const isLoading = activeProvider === provider;
        const actionLabel = mode === 'signup' ? 'Sign up with' : 'Continue with';

        return (
          <motion.button
            key={provider}
            type="button"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
            disabled={activeProvider !== null}
            onClick={() => void handleOAuth(provider)}
            className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 text-base font-medium text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all hover:border-primary/20 hover:bg-secondary hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ProviderIcon />
            )}
            <span>{`${actionLabel} ${providerLabels[provider]}`}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default SocialAuthButtons;
