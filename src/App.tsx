import React, { useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { AppWrapper } from './components/AppWrapper';
import { AppRouter } from './components/AppRouter';
import AppHeader from './components/AppHeader';
import { PushNotificationProvider } from './components/PushNotificationService';
import SplashScreen from './components/SplashScreen';
import AuthLanding from './components/AuthLanding';
import Login from './components/Login';
import Signup from './components/Signup';
import { useAppContext } from './hooks/useAppContext';
import { authenticateWithBiometrics } from './services/biometricAuth';
import { isNativePlatform } from './services/nativeCapabilities';
import type { AppState, PropertyFilters, User } from './types';
import {
  getPathForState,
  parseAppRoute,
  resolveRouteStateForUser,
} from './utils/appNavigation';
import { getToastTheme } from './utils/theme';
import { normalizeProperties, normalizeProperty } from './utils/propertyNormalization';
import { canAccessAppState, getRoleWorkspace } from './utils/roleCapabilities';

import BottomNav from './components/BottomNav';

const hasPendingPaymentCallback = (): boolean => {
  if (typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const callbackParams = ['reference', 'trxref', 'tx_ref', 'transaction_id', 'status'];

  return (
    Boolean(sessionStorage.getItem('paymentCallback')) &&
    callbackParams.some((key) => searchParams.has(key))
  );
};

const resolveSignedInState = (currentUser: User | null): AppState => {
  if (typeof window === 'undefined') return currentUser ? 'main' : 'auth-landing';

  const parsedRoute = parseAppRoute(window.location.pathname);

  if (!currentUser) {
    return resolveRouteStateForUser(parsedRoute, null);
  }

  if (hasPendingPaymentCallback()) {
    return 'payments';
  }

  return resolveRouteStateForUser(parsedRoute, currentUser);
};

const PropertyHubApp: React.FC = () => {
  const {
    appState,
    currentUser,
    setAppState,
    login,
    logout,
    updateUser,
    properties,
    selectedProperty,
    setSelectedProperty,
    addProperty,
    updateProperty,
    deleteProperty,
    theme,
  } = useAppContext();
  const [marketplaceFilters, setMarketplaceFilters] = useState<PropertyFilters>({
    type: [],
    priceRange: [0, 500000],
    location: [],
    bedrooms: [],
    bathrooms: [],
    areaRange: [0, 10000],
    amenities: [],
    availability: [],
  });

  const normalizedProperties = useMemo(() => normalizeProperties(properties), [properties]);
  const normalizedSelectedProperty = useMemo(
    () => (selectedProperty ? normalizeProperty(selectedProperty) : null),
    [selectedProperty]
  );
  const showBottomNav = Boolean(currentUser && appState !== 'chat');
  const appStateRef = useRef<AppState>(appState);
  const lastSyncedRouteRef = useRef<string>('');
  const selectedPropertyIdRef = useRef<string | null>(normalizedSelectedProperty?.id ?? null);

  React.useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  React.useEffect(() => {
    selectedPropertyIdRef.current = normalizedSelectedProperty?.id ?? null;
  }, [normalizedSelectedProperty]);

  const handleNavigate = (state: AppState) => {
    if (currentUser && !canAccessAppState(currentUser, state)) {
      setAppState(getRoleWorkspace(currentUser).homeState);
      return;
    }

    setAppState(state);
  };

  const handleLogin = async (user: User) => {
    await login(user);
  };

  const handleUserUpdate = async (user: User | null) => {
    if (!user) {
      await logout();
      return;
    }

    await updateUser(user);
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (appState === 'splash') return undefined;

    const handleChatNavigation = () => {
      handleNavigate('chat');
    };

    const handlePropertyNavigation = (event: Event) => {
      const propertyId = (event as CustomEvent<{ propertyId?: string }>).detail?.propertyId;
      if (!propertyId) return;

      const matchedProperty = normalizedProperties.find((property) => property.id === propertyId);
      if (matchedProperty) {
        setSelectedProperty(matchedProperty);
        handleNavigate('main');
      }
    };

    window.addEventListener('navigate-to-chat', handleChatNavigation);
    window.addEventListener('navigate-to-property', handlePropertyNavigation);

    return () => {
      window.removeEventListener('navigate-to-chat', handleChatNavigation);
      window.removeEventListener('navigate-to-property', handlePropertyNavigation);
    };
  }, [handleNavigate, normalizedProperties, setSelectedProperty]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (appState === 'splash') return undefined;

    const syncStateFromLocation = () => {
      const parsedRoute = parseAppRoute(window.location.pathname);
      const nextState = resolveRouteStateForUser(parsedRoute, currentUser);

      if (parsedRoute.propertyId) {
        const matchedProperty = normalizedProperties.find(
          (property) => property.id === parsedRoute.propertyId
        );

        if (matchedProperty && selectedPropertyIdRef.current !== matchedProperty.id) {
          setSelectedProperty(matchedProperty);
        }
      } else if (parsedRoute.appState === 'main' && selectedPropertyIdRef.current) {
        setSelectedProperty(null);
      }

      if (appStateRef.current !== nextState) {
        setAppState(nextState);
      }

      lastSyncedRouteRef.current = `${window.location.pathname}${window.location.search}`;
    };

    syncStateFromLocation();
    window.addEventListener('popstate', syncStateFromLocation);

    return () => {
      window.removeEventListener('popstate', syncStateFromLocation);
    };
  }, [
    currentUser,
    normalizedProperties,
    setAppState,
    setSelectedProperty,
  ]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || appState === 'splash') return;

    const basePath = getPathForState(
      normalizedSelectedProperty ? 'property-details' : appState,
      {
        selectedPropertyId: normalizedSelectedProperty?.id ?? null,
      }
    );
    const desiredPath =
      appState === 'payments' && window.location.search
        ? `${basePath}${window.location.search}`
        : basePath;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath === desiredPath || lastSyncedRouteRef.current === desiredPath) {
      lastSyncedRouteRef.current = desiredPath;
      return;
    }

    window.history.pushState(
      {
        appState,
        propertyId: normalizedSelectedProperty?.id ?? null,
      },
      '',
      desiredPath
    );
    lastSyncedRouteRef.current = desiredPath;
  }, [appState, normalizedSelectedProperty]);

  React.useEffect(() => {
    if (!currentUser || !isNativePlatform()) return;

    const biometricSettings = currentUser.preferences?.security?.biometrics;
    if (!biometricSettings?.enabled || !biometricSettings.promptOnLaunch) {
      return;
    }

    const sessionKey = `propertyhub.biometric.prompted.${currentUser.id}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey) === 'true') {
      return;
    }

    let isActive = true;

    const promptForUnlock = async () => {
      const result = await authenticateWithBiometrics({
        allowDeviceCredential: biometricSettings.allowDeviceCredentials,
        reason: 'Unlock PropertyHub to continue on this device.',
      });

      if (!isActive || !result.success) {
        return;
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    void promptForUnlock();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  let content: React.ReactNode;

  if (appState === 'splash') {
    content = <SplashScreen onComplete={() => setAppState(resolveSignedInState(currentUser))} />;
  } else if (appState === 'auth-landing') {
    content = <AuthLanding onNavigate={(state) => handleNavigate(state as AppState)} />;
  } else if (appState === 'login') {
    content = (
      <Login
        onLogin={handleLogin}
        onBack={() => setAppState('auth-landing')}
        onSignup={() => setAppState('signup')}
      />
    );
  } else if (appState === 'signup') {
    content = (
      <Signup
        onSignup={handleLogin}
        onBack={() => setAppState('auth-landing')}
        onLogin={() => setAppState('login')}
      />
    );
  } else {
    content = (
      <div
        className={`theme-page-shell mobile-viewport min-h-[100dvh] overflow-x-hidden bg-background theme-transition ${
          showBottomNav ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0' : 'pb-0'
        }`}
      >
        <AppHeader
          currentUser={currentUser}
          appState={appState}
          onNavigation={handleNavigate}
          onLogout={() => {
            void logout();
          }}
        />

        <Toaster position="top-right" richColors theme={getToastTheme(theme)} />

        <div className="relative z-10">
          <AppRouter
            appState={appState}
            currentUser={currentUser}
            properties={normalizedProperties}
            filters={marketplaceFilters}
            setFilters={setMarketplaceFilters}
            selectedProperty={normalizedSelectedProperty}
            onPropertySelect={setSelectedProperty}
            onNavigation={handleNavigate}
            setCurrentUser={(user) => {
              void handleUserUpdate(user);
            }}
            setSelectedProperty={setSelectedProperty}
            onAddProperty={addProperty}
            onUpdateProperty={updateProperty}
            onDeleteProperty={deleteProperty}
          />
        </div>

        {showBottomNav && currentUser ? (
          <BottomNav
            currentUser={currentUser}
            appState={appState}
            onNavigation={handleNavigate}
          />
        ) : null}
      </div>
    );
  }

  return <PushNotificationProvider currentUser={currentUser}>{content}</PushNotificationProvider>;
};

export default function App() {
  return (
    <AppWrapper>
      <PropertyHubApp />
    </AppWrapper>
  );
}
