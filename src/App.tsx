import React, { useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { AppWrapper } from './components/AppWrapper';
import { AppRouter } from './components/AppRouter';
import AppHeader from './components/AppHeader';
import SplashScreen from './components/SplashScreen';
import AuthLanding from './components/AuthLanding';
import Login from './components/Login';
import Signup from './components/Signup';
import { useAppContext } from './hooks/useAppContext';
import type { AppState, PropertyFilters, User } from './types';
import { getToastTheme } from './utils/theme';
import { normalizeProperties, normalizeProperty } from './utils/propertyNormalization';

import BottomNav from './components/BottomNav';

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

  const handleNavigate = (state: AppState) => {
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

  if (appState === 'splash') {
    return (
      <SplashScreen
        onComplete={() => setAppState(currentUser ? 'main' : 'auth-landing')}
      />
    );
  }

  if (appState === 'auth-landing') {
    return <AuthLanding onNavigate={(state) => handleNavigate(state as AppState)} />;
  }

  if (appState === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onBack={() => setAppState('auth-landing')}
        onSignup={() => setAppState('signup')}
      />
    );
  }

  if (appState === 'signup') {
    return (
      <Signup
        onSignup={handleLogin}
        onBack={() => setAppState('auth-landing')}
        onLogin={() => setAppState('login')}
      />
    );
  }

  return (
    <div className="mobile-viewport min-h-[100dvh] overflow-x-hidden bg-background theme-transition pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0">
      <AppHeader
        currentUser={currentUser}
        appState={appState}
        onNavigation={handleNavigate}
        onLogout={() => {
          void logout();
        }}
      />

      <Toaster position="top-right" richColors theme={getToastTheme(theme)} />

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
        onAddProperty={(property) => {
          void addProperty(property);
        }}
        onUpdateProperty={(propertyId, updates) => {
          void updateProperty(propertyId, updates);
        }}
        onDeleteProperty={(propertyId) => {
          void deleteProperty(propertyId);
        }}
      />

      {currentUser && (
        <BottomNav appState={appState} onNavigation={handleNavigate} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppWrapper>
      <PropertyHubApp />
    </AppWrapper>
  );
}
