import type { ComponentType } from 'react';
import type { AppState, User } from '../types';
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Compass,
  CreditCard,
  Home,
  LayoutDashboard,
  MessageSquare,
  Search,
  Shield,
  Users,
} from 'lucide-react';

export type CanonicalRole = 'user' | 'host' | 'manager' | 'admin';

export interface RoleNavigationItem {
  id: AppState;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface RoleFunction {
  id: string;
  title: string;
  description: string;
  state: AppState;
  cta: string;
  icon: ComponentType<{ className?: string }>;
}

export interface RoleAccess {
  canBrowseProperties: boolean;
  canApplyForProperty: boolean;
  canBuyProperty: boolean;
  canLeaseProperty: boolean;
  canMakeOffers: boolean;
  canManagePayments: boolean;
  canManageProperties: boolean;
  canAddProperty: boolean;
  canEditProperty: boolean;
  canDeleteProperty: boolean;
  canApproveApplications: boolean;
  canManageContracts: boolean;
  canViewAnalytics: boolean;
  canManageBookings: boolean;
  canHandleSupport: boolean;
  canModerateChat: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canViewAllTransactions: boolean;
  canFreezeAccounts: boolean;
  canFreezeProperties: boolean;
  canPauseTransactions: boolean;
  canConfigurePlatform: boolean;
  canAccessSensitivePaymentData: boolean;
  canReviewListings: boolean;
  canVerifyListings: boolean;
  canResolveDisputes: boolean;
  canViewAuditLogs: boolean;
  canUseEmergencyControls: boolean;
  canTakePropertyOwnership: boolean;
}

export interface RoleWorkspace {
  role: CanonicalRole;
  label: string;
  description: string;
  dashboardTitle: string;
  dashboardDescription: string;
  workspaceTitle: string;
  workspaceDescription: string;
  highlights: string[];
  summaryLines: string[];
  navigation: RoleNavigationItem[];
  functions: RoleFunction[];
  homeState: AppState;
  access: RoleAccess;
}

const ALL_FALSE_ACCESS: RoleAccess = {
  canBrowseProperties: false,
  canApplyForProperty: false,
  canBuyProperty: false,
  canLeaseProperty: false,
  canMakeOffers: false,
  canManagePayments: false,
  canManageProperties: false,
  canAddProperty: false,
  canEditProperty: false,
  canDeleteProperty: false,
  canApproveApplications: false,
  canManageContracts: false,
  canViewAnalytics: false,
  canManageBookings: false,
  canHandleSupport: false,
  canModerateChat: false,
  canManageUsers: false,
  canAccessAdmin: false,
  canViewAllTransactions: false,
  canFreezeAccounts: false,
  canFreezeProperties: false,
  canPauseTransactions: false,
  canConfigurePlatform: false,
  canAccessSensitivePaymentData: false,
  canReviewListings: false,
  canVerifyListings: false,
  canResolveDisputes: false,
  canViewAuditLogs: false,
  canUseEmergencyControls: false,
  canTakePropertyOwnership: false,
};

const withAccess = (overrides: Partial<RoleAccess>): RoleAccess => ({
  ...ALL_FALSE_ACCESS,
  ...overrides,
});

const COMMON_STATES: AppState[] = [
  'main',
  'marketplace',
  'dashboard',
  'chat',
  'profile',
  'profile-settings',
  'billing',
  'privacy',
  'help',
  'property-details',
  'map',
  'payments',
  'directions',
  'tour-scheduler',
  'offline-maps',
];

const HOST_STATES: AppState[] = [...COMMON_STATES, 'property-management'];
const MANAGER_STATES: AppState[] = [...COMMON_STATES, 'property-management'];
const ADMIN_STATES: AppState[] = [...HOST_STATES, 'admin'];

const ROLE_ALLOWED_STATES: Record<CanonicalRole, ReadonlySet<AppState>> = {
  user: new Set(COMMON_STATES),
  host: new Set(HOST_STATES),
  manager: new Set(MANAGER_STATES),
  admin: new Set(ADMIN_STATES),
};

export const SYSTEM_AUTOMATION_BLUEPRINT = {
  role: 'system',
  responsibilities: [
    'Generate pricing and listing recommendations',
    'Surface fraud and trust alerts for admin review',
    'Trigger reminders for rent, lease, and sale milestones',
    'Keep audit logging mandatory for high-authority admin actions',
  ],
} as const;

const ROLE_WORKSPACES: Record<CanonicalRole, RoleWorkspace> = {
  user: {
    role: 'user',
    label: 'User',
    description: 'Find homes, make offers, pay, and manage your property journey.',
    dashboardTitle: 'User workspace',
    dashboardDescription:
      'Stay close to the homes you want, the deals you started, and the payments or lease milestones that matter next.',
    workspaceTitle: 'Move From Search To Signed Deal',
    workspaceDescription:
      'Browse rent, sale, and lease inventory, keep negotiations organized, and follow your property lifecycle without bouncing between tools.',
    highlights: ['Rent', 'Buy', 'Lease'],
    summaryLines: [
      'Search and compare properties across rent, sale, and lease listings',
      'Track payments, offers, applications, and signed agreements',
      'Message landlords or support when a deal needs a nudge',
    ],
    navigation: [
      { id: 'marketplace', label: 'Explore', icon: Compass },
      { id: 'dashboard', label: 'My Hub', icon: LayoutDashboard },
      { id: 'chat', label: 'Messages', icon: MessageSquare },
    ],
    functions: [
      {
        id: 'discover-properties',
        title: 'Discover properties',
        description: 'Search homes to rent, buy, or lease and keep your shortlist tidy.',
        state: 'marketplace',
        cta: 'Explore homes',
        icon: Search,
      },
      {
        id: 'manage-deals',
        title: 'Track deals and payments',
        description: 'Follow applications, offers, rent status, and lease milestones from one place.',
        state: 'dashboard',
        cta: 'Open dashboard',
        icon: CreditCard,
      },
      {
        id: 'message-support',
        title: 'Stay in touch',
        description: 'Reach landlords and support quickly when you need clarity or help.',
        state: 'chat',
        cta: 'Open messages',
        icon: MessageSquare,
      },
    ],
    homeState: 'marketplace',
    access: withAccess({
      canBrowseProperties: true,
      canApplyForProperty: true,
      canBuyProperty: true,
      canLeaseProperty: true,
      canMakeOffers: true,
      canManagePayments: true,
      canManageBookings: true,
      canHandleSupport: true,
    }),
  },
  host: {
    role: 'host',
    label: 'Landlord',
    description: 'List, approve, and monetize properties across rent, sale, and lease.',
    dashboardTitle: 'Landlord workspace',
    dashboardDescription:
      'Manage listings, offers, leases, and occupancy with a calmer operational view that keeps revenue and tenant flow close at hand.',
    workspaceTitle: 'Run Your Portfolio Cleanly',
    workspaceDescription:
      'Publish inventory, choose transaction type, review applicants or buyers, and stay on top of revenue, occupancy, and contracts.',
    highlights: ['Listings', 'Offers', 'Contracts'],
    summaryLines: [
      'List and manage properties for rent, sale, or lease',
      'Approve applications, offers, and agreement terms',
      'Track revenue, occupancy, contract health, and guest conversations',
    ],
    navigation: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'property-management', label: 'Portfolio', icon: Building2 },
      { id: 'chat', label: 'Messages', icon: MessageSquare },
    ],
    functions: [
      {
        id: 'manage-listings',
        title: 'Manage listings',
        description: 'Create properties, update availability, and keep your portfolio market-ready.',
        state: 'property-management',
        cta: 'Open portfolio',
        icon: Home,
      },
      {
        id: 'review-applications',
        title: 'Review applicants and offers',
        description: 'Approve tenants, buyers, or lessees and keep each transaction moving.',
        state: 'dashboard',
        cta: 'Review pipeline',
        icon: CheckCircle2,
      },
      {
        id: 'track-income',
        title: 'Track income and contracts',
        description: 'Monitor rent collection, sales flow, and lease performance in one workspace.',
        state: 'dashboard',
        cta: 'View performance',
        icon: BarChart3,
      },
    ],
    homeState: 'dashboard',
    access: withAccess({
      canBrowseProperties: true,
      canManagePayments: true,
      canManageProperties: true,
      canAddProperty: true,
      canEditProperty: true,
      canApproveApplications: true,
      canManageContracts: true,
      canViewAnalytics: true,
      canManageBookings: true,
      canHandleSupport: true,
      canModerateChat: true,
    }),
  },
  manager: {
    role: 'manager',
    label: 'Manager',
    description: 'Coordinate assigned listings, owners, and booking flow without full admin control.',
    dashboardTitle: 'Manager workspace',
    dashboardDescription:
      'Keep assigned listings tidy, move booking queues forward, and support owners without stepping into platform-wide authority.',
    workspaceTitle: 'Run Assigned Inventory Smoothly',
    workspaceDescription:
      'Work the listings assigned to you, keep approvals and support moving, and surface the right issues before they become owner or customer pain.',
    highlights: ['Assignments', 'Approvals', 'Support'],
    summaryLines: [
      'Work only the properties assigned to your management lane',
      'Track booking queues, support follow-ups, and listing readiness',
      'Support owners with operational visibility without inheriting admin powers',
    ],
    navigation: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'property-management', label: 'Assignments', icon: BriefcaseBusiness },
      { id: 'chat', label: 'Support', icon: MessageSquare },
    ],
    functions: [
      {
        id: 'manage-assigned-listings',
        title: 'Manage assigned listings',
        description: 'Keep your assigned properties accurate, available, and ready for shopper traffic.',
        state: 'property-management',
        cta: 'Open assignments',
        icon: Building2,
      },
      {
        id: 'review-booking-queue',
        title: 'Review booking queue',
        description: 'Stay on top of pending approvals, lease steps, and owner follow-through.',
        state: 'dashboard',
        cta: 'Review queue',
        icon: CheckCircle2,
      },
      {
        id: 'handle-owner-support',
        title: 'Handle support and owner follow-up',
        description: 'Keep conversations moving when a listing or booking needs a human response.',
        state: 'chat',
        cta: 'Open support',
        icon: MessageSquare,
      },
    ],
    homeState: 'dashboard',
    access: withAccess({
      canBrowseProperties: true,
      canManageProperties: true,
      canEditProperty: true,
      canApproveApplications: true,
      canManageContracts: true,
      canViewAnalytics: true,
      canManageBookings: true,
      canHandleSupport: true,
      canModerateChat: true,
    }),
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Govern trust, listings, disputes, and platform-wide controls.',
    dashboardTitle: 'Admin control',
    dashboardDescription:
      'Oversee platform health, disputes, listing quality, fraud signals, and emergency controls without crossing the line into property ownership or raw payment handling.',
    workspaceTitle: 'Operate The Trust Layer',
    workspaceDescription:
      'Admins can govern users, listings, disputes, analytics, and emergency controls. High-authority actions must stay audited, traceable, and separate from direct fund movement.',
    highlights: ['Trust', 'Disputes', 'Audit trail'],
    summaryLines: [
      'Manage users, listings, verification, and suspicious activity',
      'Oversee disputes, transaction flow, and marketplace health',
      'Use freezes and emergency controls with mandatory audit visibility',
    ],
    navigation: [
      { id: 'admin', label: 'Control', icon: Shield },
      { id: 'dashboard', label: 'Signals', icon: Activity },
      { id: 'chat', label: 'Oversight', icon: MessageSquare },
    ],
    functions: [
      {
        id: 'govern-users',
        title: 'Govern users and trust',
        description: 'Suspend bad actors, verify identities, and keep abuse from spreading.',
        state: 'admin',
        cta: 'Open admin',
        icon: Users,
      },
      {
        id: 'control-listings',
        title: 'Control listings',
        description: 'Review, verify, freeze, or remove suspicious inventory across the platform.',
        state: 'property-management',
        cta: 'Review listings',
        icon: Building2,
      },
      {
        id: 'resolve-disputes',
        title: 'Resolve disputes',
        description: 'Step into payment or agreement conflicts with traceable, policy-backed actions.',
        state: 'chat',
        cta: 'Review conversations',
        icon: MessageSquare,
      },
      {
        id: 'monitor-platform',
        title: 'Monitor platform health',
        description: 'Track transactions, usage, fraud alerts, and emergency controls from one surface.',
        state: 'admin',
        cta: 'Review platform',
        icon: BarChart3,
      },
    ],
    homeState: 'admin',
    access: withAccess({
      canBrowseProperties: true,
      canManagePayments: true,
      canManageProperties: true,
      canAddProperty: true,
      canEditProperty: true,
      canDeleteProperty: true,
      canApproveApplications: true,
      canManageContracts: true,
      canViewAnalytics: true,
      canManageBookings: true,
      canHandleSupport: true,
      canModerateChat: true,
      canManageUsers: true,
      canAccessAdmin: true,
      canViewAllTransactions: true,
      canFreezeAccounts: true,
      canFreezeProperties: true,
      canPauseTransactions: true,
      canConfigurePlatform: true,
      canAccessSensitivePaymentData: false,
      canReviewListings: true,
      canVerifyListings: true,
      canResolveDisputes: true,
      canViewAuditLogs: true,
      canUseEmergencyControls: true,
      canTakePropertyOwnership: false,
    }),
  },
};

const resolveRoleValue = (input: User | User['role'] | null | undefined): string => {
  if (!input) return 'user';
  if (typeof input === 'string') return input.trim().toLowerCase();
  return String(input.role || 'user').trim().toLowerCase();
};

export const normalizeUserRole = (input: User | User['role'] | null | undefined): CanonicalRole => {
  const role = resolveRoleValue(input);

  if (role === 'manager') {
    return 'manager';
  }

  if (
    role === 'admin' ||
    role === 'service_provider' ||
    role === 'service-provider' ||
    role === 'provider' ||
    role === 'finance_ops' ||
    role === 'finance-ops' ||
    role === 'finance' ||
    role === 'ops' ||
    role === 'operations'
  ) {
    return 'admin';
  }

  if (
    role === 'host' ||
    role === 'landlord' ||
    role === 'owner' ||
    role === 'seller' ||
    role === 'lessor'
  ) {
    return 'host';
  }

  return 'user';
};

const getManagerAccess = (input: User | User['role'] | null | undefined): RoleAccess => {
  if (!input || typeof input === 'string') {
    return ROLE_WORKSPACES.manager.access;
  }

  const permissions = new Set(input.managerData?.permissions || []);
  if (permissions.size === 0) {
    return ROLE_WORKSPACES.manager.access;
  }

  const canViewProperties =
    permissions.has('view_properties') ||
    permissions.has('edit_properties') ||
    permissions.has('manage_bookings') ||
    permissions.has('view_analytics');
  const canManageBookings = permissions.has('manage_bookings');
  const canHandleSupport = permissions.has('handle_support');

  return withAccess({
    canBrowseProperties: true,
    canManageProperties: canViewProperties,
    canEditProperty: permissions.has('edit_properties'),
    canApproveApplications: canManageBookings,
    canManageContracts: canManageBookings,
    canViewAnalytics: permissions.has('view_analytics'),
    canManageBookings,
    canHandleSupport,
    canModerateChat: canHandleSupport,
  });
};

export const getRoleAccess = (input: User | User['role'] | null | undefined): RoleAccess => {
  const role = normalizeUserRole(input);

  if (role === 'manager') {
    return getManagerAccess(input);
  }

  return ROLE_WORKSPACES[role].access;
};

export const getRoleWorkspace = (input: User | User['role'] | null | undefined): RoleWorkspace =>
  ROLE_WORKSPACES[normalizeUserRole(input)];

export const getRoleSummaryLines = (
  input: User | User['role'] | null | undefined,
  maxLines = 3,
): string[] => getRoleWorkspace(input).summaryLines.slice(0, maxLines);

export const userCan = (
  input: User | User['role'] | null | undefined,
  permission: keyof RoleAccess,
): boolean => getRoleAccess(input)[permission];

export const canAccessAppState = (
  input: User | User['role'] | null | undefined,
  state: AppState,
): boolean => {
  if (state === 'splash' || state === 'auth-landing' || state === 'login' || state === 'signup') {
    return true;
  }

  return ROLE_ALLOWED_STATES[normalizeUserRole(input)].has(state);
};
