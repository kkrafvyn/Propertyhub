import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import PaymentCallback from './PaymentCallback';
import { PropertyDetailsView } from './PropertyDetailsView';
import { Marketplace } from './Marketplace';
import BillingCenter from './BillingCenter';
import HelpCenter from './HelpCenter';
import { Property, PropertyFilters, User as UserType, ExtendedAppState } from '../types';
import { listAccessibleBookings } from '../services/dashboardDataService';
import {
  UserDashboard,
  ProfileSettings,
  PropertyManagement,
  AdminPanel,
  EnhancedChatRoom,
  EnhancedMapView,
  BookingDirections,
  PropertyTourScheduler,
  OfflineMapManager
} from './LazyComponents';

interface AppRouterProps {
  appState: ExtendedAppState;
  currentUser: UserType | null;
  properties: Property[];
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
  onNavigation: (route: ExtendedAppState) => void;
  setCurrentUser: (user: UserType | null) => void;
  setSelectedProperty: (property: Property | null) => void;
  onAddProperty: (property: Property) => Promise<void> | void;
  onUpdateProperty: (propertyId: string, updates: Partial<Property>) => Promise<void> | void;
  onDeleteProperty: (propertyId: string) => Promise<void> | void;
}

// Memoized components for performance
const MemoizedMarketplace = React.memo(Marketplace);

export const AppRouter: React.FC<AppRouterProps> = ({
  appState,
  currentUser,
  properties,
  filters,
  setFilters,
  selectedProperty,
  onPropertySelect,
  onNavigation,
  setCurrentUser,
  setSelectedProperty,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty
}) => {
  const [accessibleBookings, setAccessibleBookings] = React.useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      setAccessibleBookings([]);
      return () => {
        isMounted = false;
      };
    }

    void listAccessibleBookings(currentUser, properties, 20)
      .then((bookings) => {
        if (isMounted) {
          setAccessibleBookings(bookings);
        }
      })
      .catch((error) => {
        console.error('Failed to load accessible bookings for routing:', error);
        if (isMounted) {
          setAccessibleBookings([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, properties]);

  const selectedBooking = React.useMemo(() => {
    if (!selectedProperty) return null;
    return accessibleBookings.find((booking) => booking.propertyId === selectedProperty.id) || null;
  }, [accessibleBookings, selectedProperty]);

  return (
    <main className="min-w-0 transition-all duration-500">
      <AnimatePresence mode="wait">
        {(() => {
          switch (appState) {
            case 'dashboard':
              return (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <UserDashboard 
                      currentUser={currentUser!}
                      properties={properties}
                      onPropertySelect={onPropertySelect}
                      onNavigation={onNavigation}
                    />
                  </Suspense>
                </motion.div>
              );
            
            case 'profile':
            case 'profile-settings':
              return (
                <motion.div
                  key="profile-settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProfileSettings
                      currentUser={currentUser!}
                      onUpdateUser={setCurrentUser}
                      onClose={() => onNavigation('main')}
                      onNavigate={onNavigation}
                    />
                  </Suspense>
                </motion.div>
              );

            case 'billing':
              return (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <BillingCenter
                    currentUser={currentUser!}
                    onBack={() => onNavigation('profile-settings')}
                    onNavigate={onNavigation}
                  />
                </motion.div>
              );

            case 'privacy':
              return (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProfileSettings
                    currentUser={currentUser!}
                    onUpdateUser={setCurrentUser}
                    onClose={() => onNavigation('profile-settings')}
                    onNavigate={onNavigation}
                    focusSection="privacy"
                  />
                </motion.div>
              );

            case 'help':
              return (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <HelpCenter
                    currentUser={currentUser!}
                    onBack={() => onNavigation('profile-settings')}
                    onNavigate={onNavigation}
                  />
                </motion.div>
              );

            case 'property-management':
              return (
                <motion.div
                  key="property-management"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <PropertyManagement
                      user={currentUser!}
                      properties={properties}
                      onNavigation={onNavigation}
                      onAddProperty={onAddProperty}
                      onUpdateProperty={onUpdateProperty}
                      onDeleteProperty={onDeleteProperty}
                    />
                  </Suspense>
                </motion.div>
              );

            case 'admin':
              return (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminPanel 
                      currentUser={currentUser!}
                      properties={properties}
                      onNavigation={onNavigation}
                    />
                  </Suspense>
                </motion.div>
              );
            
            case 'chat':
              return (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <EnhancedChatRoom 
                      currentUser={currentUser!}
                      onBack={() => onNavigation('main')}
                    />
                  </Suspense>
                </motion.div>
              );

            case 'payments':
              return (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PaymentCallback onNavigate={onNavigation} />
                </motion.div>
              );
            
            case 'map':
              return (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <EnhancedMapView 
                      currentUser={currentUser!}
                      properties={properties}
                      selectedProperty={selectedProperty}
                      onBack={() => onNavigation('main')}
                      onPropertySelect={onPropertySelect}
                      mode="browse"
                    />
                  </Suspense>
                </motion.div>
              );
            
            case 'directions':
              return (
                <motion.div
                  key="directions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <BookingDirections 
                      booking={selectedBooking ? {
                        id: selectedBooking.id,
                        propertyId: selectedBooking.propertyId,
                        propertyTitle: selectedBooking.propertyTitle,
                        propertyImage: selectedBooking.propertyImage,
                        type: selectedBooking.type,
                        amount: selectedBooking.amount,
                        startDate: selectedBooking.startDateRaw || new Date().toISOString(),
                        endDate: selectedBooking.endDateRaw,
                        status: selectedBooking.status.toLowerCase().replace(/\s+/g, '_'),
                        hostId: selectedProperty?.ownerId || '',
                        userId: currentUser!.id,
                        createdAt: selectedBooking.startDateRaw || new Date().toISOString(),
                        updatedAt: selectedBooking.endDateRaw || selectedBooking.startDateRaw || new Date().toISOString(),
                        totalAmount: selectedBooking.amount,
                        currency: selectedBooking.currency,
                        confirmationCode: selectedBooking.id,
                        paymentStatus: 'completed',
                      } : null}
                      property={selectedProperty!}
                      currentUser={currentUser!}
                      onBack={() => onNavigation('main')}
                    />
                  </Suspense>
                </motion.div>
              );
            
            case 'tour-scheduler':
              return (
                <motion.div
                  key="tour-scheduler"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <PropertyTourScheduler 
                      property={selectedProperty!}
                      currentUser={currentUser!}
                      onBack={() => onNavigation('main')}
                      onTourScheduled={(tour) => {
                        toast.success(
                          tour.status === 'pending_confirmation'
                            ? 'Tour request sent. Host confirmation is still required.'
                            : 'Tour scheduled successfully!',
                        );
                        onNavigation('dashboard');
                      }}
                    />
                  </Suspense>
                </motion.div>
              );
            
            case 'offline-maps':
              return (
                <motion.div
                  key="offline-maps"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={<LoadingSpinner />}>
                    <OfflineMapManager 
                      currentUser={currentUser!}
                      properties={properties}
                      userBookings={accessibleBookings}
                      selectedProperty={selectedProperty}
                      onBack={() => onNavigation('main')}
                    />
                  </Suspense>
                </motion.div>
              );
            
            default:
              return selectedProperty ? (
                <PropertyDetailsView 
                  selectedProperty={selectedProperty}
                  currentUser={currentUser!}
                  onBack={() => setSelectedProperty(null)}
                  onNavigation={onNavigation}
                />
              ) : (
                <motion.div
                  key="marketplace"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <MemoizedMarketplace
                    properties={properties}
                    filters={filters}
                    setFilters={setFilters}
                    onPropertySelect={onPropertySelect}
                    currentUser={currentUser}
                  />
                </motion.div>
              );
          }
        })()}
      </AnimatePresence>
    </main>
  );
};

// Add default export for lazy loading
export default AppRouter;
