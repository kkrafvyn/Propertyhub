import { registerSW } from 'virtual:pwa-register';
import { isNativePlatform } from './services/nativeCapabilities';

const enablePwaInDev = String(import.meta.env.VITE_ENABLE_PWA_DEV).toLowerCase() === 'true';
const shouldRegisterPwa = !isNativePlatform() && (import.meta.env.PROD || enablePwaInDev);

async function cleanupDevServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Failed to clean up service workers in development:', error);
  }

  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheKeys = await caches.keys();
    const propertyHubCacheKeys = cacheKeys.filter((cacheKey) =>
      cacheKey.startsWith('propertyhub-') || cacheKey.includes('workbox')
    );

    await Promise.all(propertyHubCacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  } catch (error) {
    console.warn('Failed to clear PWA caches in development:', error);
  }
}

if (shouldRegisterPwa && 'serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      if (confirm('New content available. Reload?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
} else if (import.meta.env.DEV) {
  void cleanupDevServiceWorkers();
}
