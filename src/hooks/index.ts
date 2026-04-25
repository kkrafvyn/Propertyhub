/**
 * Hooks Index
 * 
 * Central export point for all custom hooks
 */

export { useAuth, type AuthState, type UseAuthReturn } from './useAuth';
export { useSupabaseSubscription, useSupabaseQuery, type UseSupabaseSubscriptionReturn } from './useSupabase';
export { useProperties, type PropertyFilters, type UsePropertiesReturn } from './useProperties';

// Payment Hooks
export {
  usePayment,
  useRentPayment,
  useEscrow,
  type UsePaymentState,
  type UsePaymentReturn,
  type UseRentPaymentReturn,
  type UseEscrowReturn,
} from './usePayment';

// Utility Hooks
export { useUtility, type UseUtilityState, type UseUtilityReturn } from './useUtility';

// Verification Hooks
export {
  useVerification,
  type UseVerificationState,
  type UseVerificationReturn,
} from './useVerification';

// Landlord Dashboard Hooks
export {
  useLandlordDashboard,
  type UseLandlordDashboardState,
  type UseLandlordDashboardReturn,
} from './useLandlordDashboard';

// Messaging Hooks
export {
  useMessaging,
  type UseMessagingState,
  type UseMessagingReturn,
} from './useMessaging';

// Existing hooks
export { useAppState } from './useAppState';
export { useMobile } from './useMobile';
export { useAppCore } from './useAppCore';
export { useAppContext } from './useAppContext';
