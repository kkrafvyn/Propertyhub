import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import type { AppState } from '../types';
import { BrandMark } from './BrandMark';

interface AuthLandingProps {
  onNavigate: (state: AppState) => void;
}

const browseMetrics = [
  { label: 'Response time', value: '< 5 min' },
  { label: 'Verified homes', value: '10,000+' },
  { label: 'Saved lists', value: 'Synced' },
];

export const AuthLanding: React.FC<AuthLandingProps> = ({ onNavigate }) => {
  return (
    <div className="theme-page-shell min-h-[100dvh] overflow-x-hidden">
      <div className="theme-page-glow absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
        <header className="wire-navbar flex items-center justify-between gap-4 rounded-[30px] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => onNavigate('main')}
            className="flex items-center gap-3 text-left"
          >
            <BrandMark className="h-11 w-11 rounded-[18px]" />
            <div>
              <div className="text-base font-semibold tracking-tight sm:text-lg">PropertyHub</div>
            </div>
          </button>

          <nav className="wire-nav-shell hidden items-center gap-1 p-1 md:flex">
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="wire-nav-link rounded-full px-4 py-2 text-sm font-medium"
            >
              Browse
            </button>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="wire-nav-link rounded-full px-4 py-2 text-sm font-medium"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="wire-nav-link wire-nav-link-active rounded-full px-4 py-2 text-sm font-medium"
            >
              Create Account
            </button>
          </nav>
        </header>

        <main className="grid gap-10 py-8 lg:flex-1 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:py-12">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-5">
              <span className="theme-accent-badge inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
                <Sparkles className="h-4 w-4" />
                Designed for clarity
              </span>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] sm:text-5xl lg:text-[4.2rem] xl:text-[4.8rem]">
                  Find your next place with clarity.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-[1.05rem]">
                  Browse properties, save what matters, and move from search to contact in one consistent flow.
                </p>
              </div>
            </div>

            <div className="air-search-shell flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Start with a neighborhood or city
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Search className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium sm:text-base">
                    Airport Residential, East Legon, waterfront, furnished
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('marketplace')}
                className="btn-primary inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold"
              >
                Browse properties
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="btn-primary inline-flex h-14 items-center justify-center gap-3 rounded-full px-8 text-base font-semibold"
              >
                Create account
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="inline-flex h-14 items-center justify-center rounded-full border border-border bg-card/90 px-8 text-base font-semibold shadow-sm transition-colors hover:bg-secondary"
              >
                Log in
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="air-panel rounded-[36px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Browse snapshot</div>
                  <div className="mt-1 text-2xl font-semibold">PropertyHub browse view</div>
                </div>
                <div className="air-pill px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Updated now
                </div>
              </div>

              <div className="air-search-shell mt-5 flex items-center gap-3 px-4 py-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Search area
                  </div>
                  <div className="mt-1 font-medium">Cantonments, Accra</div>
                </div>
                <div className="theme-accent-badge px-3 py-1 text-xs font-semibold">2 bed+</div>
              </div>

              <div className="air-surface mt-5 rounded-[30px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="theme-success-badge inline-flex px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                      Verified
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold leading-tight">
                      Cantonments Garden Suite
                    </h2>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Accra, Ghana
                    </div>
                  </div>
                  <div className="air-surface-muted rounded-[20px] p-2">
                    <BrandMark className="h-12 w-12 rounded-[16px]" />
                  </div>
                </div>

                <div className="mt-6 text-3xl font-semibold">
                  GHS 8,400
                  <span className="text-sm font-medium text-muted-foreground"> / month</span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {browseMetrics.map((item) => (
                    <div key={item.label} className="air-surface-muted rounded-[22px] px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-2 text-base font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
};

export default AuthLanding;
