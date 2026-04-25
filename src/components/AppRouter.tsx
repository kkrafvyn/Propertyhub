import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { PropertyDetailsView } from './PropertyDetailsView';
import { Marketplace } from './Marketplace';
import { Property, PropertyFilters, User as UserType, ExtendedAppState } from '../types';
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
  onAddProperty: (property: Property) => void;
  onUpdateProperty: (propertyId: string, updates: Partial<Property>) => void;
  onDeleteProperty: (propertyId: string) => void;
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
                    />
                  </Suspense>
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
                      booking={{
                        id: 'demo-booking',
                        propertyId: selectedProperty?.id || '',
                        propertyTitle: selectedProperty?.title || '',
                        propertyImage: selectedProperty?.images[0] || '',
                        type: 'rent',
                        amount: selectedProperty?.price || 0,
                        startDate: new Date().toISOString(),
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        status: 'active',
                        paymentReference: 'PAY-' + Math.random().toString(36).substr(2, 9),
                        hostId: selectedProperty?.ownerId || '',
                        userId: currentUser!.id,
                        createdAt: new Date().toISOString()
                      }}
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
                        toast.success('Tour scheduled successfully!');
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
                      userBookings={[]}
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
