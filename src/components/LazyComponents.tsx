import { lazy } from 'react';

// Simple fallback component for missing features
export const FallbackComponent = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-muted-foreground mb-6">This workspace is temporarily unavailable.</p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Back
        </button>
      )}
    </div>
  </div>
);

// Enhanced lazy loading with better error handling and simpler fallbacks
const createLazyComponent = (importFunc: () => Promise<any>, componentName: string) => {
  return lazy(() =>
    importFunc().catch((error) => {
      console.warn(`Failed to load ${componentName}:`, error);
      return {
        default: ({ onBack }: any) =>
          <FallbackComponent title={`${componentName} Unavailable`} onBack={onBack} />
      };
    })
  );
};

export const UserDashboard = lazy(() => import('./UserDashboard'));

export const ProfileSettings = createLazyComponent(
  () =>
    import('./ProfileSettings').then((module) => ({
      default: module.ProfileSettings,
    })),
  'Profile Settings'
);

export const PropertyManagement = createLazyComponent(
  () =>
    import('./PropertyManagement').then((module) => ({
      default: module.PropertyManagement,
    })),
  'Property Management'
);

export const AdminPanel = createLazyComponent(
  () =>
    import('./AdminPanel').then((module) => ({
      default: module.AdminPanel,
    })),
  'Admin Panel'
);

export const EnhancedChatRoom = createLazyComponent(
  () =>
    import('./EnhancedChatRoom').then((module) => ({
      default: module.EnhancedChatRoom,
    })),
  'Messages'
);

export const NotificationCenter = lazy(() =>
  import('./NotificationCenter')
    .then((module) => ({ default: module.NotificationCenter }))
    .catch(() => ({
      default: () => (
        <div className="relative">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            Bell
          </button>
        </div>
      )
    }))
);

export const EnhancedMapView = createLazyComponent(
  () =>
    import('./EnhancedMapView').then((module) => ({
      default: module.EnhancedMapView,
    })),
  'Map View'
);

export const BookingDirections = createLazyComponent(
  () =>
    import('./BookingDirections').then((module) => ({
      default: module.BookingDirections,
    })),
  'Directions'
);

export const PropertyTourScheduler = createLazyComponent(
  () =>
    import('./PropertyTourScheduler').then((module) => ({
      default: module.PropertyTourScheduler,
    })),
  'Tour Scheduler'
);

export const OfflineMapManager = createLazyComponent(
  () =>
    import('./OfflineMapManager').then((module) => ({
      default: module.OfflineMapManager,
    })),
  'Offline Maps'
);
