import type { Page } from '@playwright/test';

const demoUser = {
  id: 'e2e-user-1',
  email: 'e2e.user@propertyhub.test',
  name: 'E2E User',
  role: 'user',
  verified: true,
  emailVerified: true,
  preferences: {
    theme: 'light',
    language: 'en',
    notifications: {
      push: true,
      email: true,
      sms: false,
      marketing: false,
    },
    privacy: {
      showProfile: true,
      showActivity: false,
    },
    display: {
      currency: 'GHS',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
  },
};

export const bootstrapAuthenticatedSession = async (page: Page) => {
  await page.addInitScript((user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('propertyHubUser', JSON.stringify(user));
    localStorage.setItem('favoriteProperties', JSON.stringify([]));
    localStorage.setItem('comparedProperties', JSON.stringify([]));
    localStorage.setItem('recentlyViewedProperties', JSON.stringify([]));

    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      // Keep splash short but non-zero so cached user hydration can complete first.
      const effectiveTimeout = timeout === 3000 ? 100 : timeout;
      return nativeSetTimeout(handler, effectiveTimeout, ...args);
    }) as typeof window.setTimeout;
  }, demoUser);
};
