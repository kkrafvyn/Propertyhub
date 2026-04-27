import type { Property, User } from '../types';
import { normalizeUserRole } from '../utils/roleCapabilities';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface DashboardMetric {
  title: string;
  value: string;
  description?: string;
}

export interface DashboardBookingItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  status: string;
  startDate: string;
  endDate?: string;
  startDateRaw?: string;
  endDateRaw?: string;
  amount: number;
  currency: string;
  type: string;
  duration: string;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  description?: string;
  time: string;
}

export interface HostHealthItem {
  title: string;
  description: string;
  badge: string;
}

export interface HostDashboardSnapshot {
  metrics: DashboardMetric[];
  toolkit: DashboardMetric[];
  health: HostHealthItem[];
}

export interface ManagerDashboardSnapshot {
  metrics: DashboardMetric[];
  toolkit: DashboardMetric[];
  health: HostHealthItem[];
}

export interface UserDashboardSnapshot {
  stats: DashboardMetric[];
  summaryCards: DashboardMetric[];
  recentBookings: DashboardBookingItem[];
  activity: DashboardActivityItem[];
  hostSnapshot?: HostDashboardSnapshot;
  managerSnapshot?: ManagerDashboardSnapshot;
}

export interface AdminReportDefinition {
  id: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface AdminRiskCard {
  title: string;
  description: string;
  tone: 'warning' | 'neutral' | 'success';
}

export interface AdminOperationsCard {
  title: string;
  description: string;
  items: string[];
}

export interface AdminDashboardSnapshot {
  overviewStats: DashboardMetric[];
  snapshotMetrics: DashboardMetric[];
  activity: DashboardActivityItem[];
  operations: AdminOperationsCard[];
  risks: AdminRiskCard[];
  reports: AdminReportDefinition[];
}

interface BookingRecord {
  id: string;
  property_id: string;
  user_id?: string;
  owner_id?: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  total_price?: number;
  currency?: string;
  payment_status?: string;
  created_at?: string;
  updated_at?: string;
}

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'active', 'in_progress']);
const COMPLETED_BOOKING_STATUSES = new Set(['completed', 'active', 'confirmed']);
const PROBLEM_PAYMENT_STATUSES = new Set(['failed', 'refunded', 'cancelled']);

const relativeTimeFormatter =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

const compactCurrency = (amount: number, currency = 'GHS'): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: safeAmount >= 1000 ? 1 : 0,
    })
      .format(safeAmount)
      .replace(/\s+/g, ' ');
  } catch {
    return `${currency} ${safeAmount.toLocaleString('en-US')}`;
  }
};

const formatPlainNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

const formatPercent = (value: number): string => `${Math.round(Number.isFinite(value) ? value : 0)}%`;

const formatDateLabel = (value?: string): string => {
  if (!value) return 'Date pending';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date pending';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDuration = (start?: string, end?: string): string => {
  if (!start || !end) return 'Open ended';

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Open ended';
  }

  const dayCount = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return dayCount === 1 ? '1 day' : `${dayCount} days`;
};

const formatRelativeTime = (value?: string): string => {
  if (!value) return 'Recently';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  const diffMs = parsed.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (!relativeTimeFormatter) {
    return formatDateLabel(value);
  }

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute');
  }

  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour');
  }

  return relativeTimeFormatter.format(diffDays, 'day');
};

const titleCaseStatus = (status?: string): string => {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const propertyImage = (property?: Property): string =>
  property?.images?.[0] || property?.media?.[0]?.url || '';

const resolveBookingType = (record: BookingRecord, property?: Property): string => {
  if (property?.listingType) return String(property.listingType);
  if (property?.type) return String(property.type);
  if (record.status === 'pending') return 'application';
  return 'booking';
};

const mapDashboardBooking = (
  record: BookingRecord,
  propertyMap: Map<string, Property>,
): DashboardBookingItem => {
  const property = propertyMap.get(record.property_id);
  const amount = Number(record.total_price ?? property?.pricing?.amount ?? property?.price ?? 0);
  const currency = record.currency || property?.pricing?.currency || property?.currency || 'GHS';

  return {
    id: record.id,
    propertyId: record.property_id,
    propertyTitle: property?.title || 'Property',
    propertyImage: propertyImage(property),
    status: titleCaseStatus(record.status),
    startDate: formatDateLabel(record.check_in || record.created_at),
    endDate: record.check_out ? formatDateLabel(record.check_out) : undefined,
    startDateRaw: record.check_in || record.created_at,
    endDateRaw: record.check_out,
    amount,
    currency,
    type: resolveBookingType(record, property),
    duration: formatDuration(record.check_in || record.created_at, record.check_out),
  };
};

const getLocalPropertyMap = (properties: Property[]): Map<string, Property> =>
  new Map(properties.map((property) => [property.id, property]));

const getManagedProperties = (currentUser: User, properties: Property[]): Property[] => {
  const assignedPropertyIds = new Set(currentUser.managerData?.assignedProperties || []);

  return properties.filter(
    (property) => property.managerId === currentUser.id || assignedPropertyIds.has(property.id),
  );
};

const safeCount = async (
  table: string,
  apply?: (query: any) => any,
): Promise<number> => {
  try {
    const baseQuery = supabase.from(table).select('id', { count: 'exact', head: true });
    const query = apply ? apply(baseQuery as any) : baseQuery;
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
};

const safeList = async <T>(run: () => any): Promise<T[]> => {
  try {
    const { data, error } = await run();
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const loadNotificationActivity = async (userId: string): Promise<DashboardActivityItem[]> => {
  const notifications = await safeList<any>(() =>
    supabase
      .from('notifications')
      .select('id, title, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(4),
  );

  return notifications.map((notification) => ({
    id: notification.id,
    title: notification.title || 'Platform update',
    description: notification.message || undefined,
    time: formatRelativeTime(notification.created_at),
  }));
};

const loadReviewActivity = async (ownerId: string): Promise<DashboardActivityItem[]> => {
  const reviews = await safeList<any>(() =>
    supabase
      .from('reviews')
      .select('id, title, comment, rating, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(3),
  );

  return reviews.map((review) => ({
    id: review.id,
    title: `${review.rating || 0}/5 review received`,
    description: review.title || review.comment || 'A guest or renter left new feedback.',
    time: formatRelativeTime(review.created_at),
  }));
};

const buildFallbackActivity = (
  properties: Property[],
  recentlyViewedProperties: string[],
): DashboardActivityItem[] => {
  return recentlyViewedProperties.slice(0, 4).map((propertyId, index) => {
    const property = properties.find((item) => item.id === propertyId);
    return {
      id: `recent-${propertyId}-${index}`,
      title: property ? 'Viewed property details' : 'Opened the marketplace',
      description: property?.title || 'Keep exploring fresh inventory and saved homes.',
      time: index === 0 ? 'Just now' : formatRelativeTime(new Date(Date.now() - index * 3600000).toISOString()),
    };
  });
};

export const listAccessibleBookings = async (
  currentUser: User,
  properties: Property[],
  limit = 12,
): Promise<DashboardBookingItem[]> => {
  const role = normalizeUserRole(currentUser);
  const propertyMap = getLocalPropertyMap(properties);
  const managedPropertyIds =
    role === 'manager' ? getManagedProperties(currentUser, properties).map((property) => property.id) : [];

  if (!isSupabaseConfigured()) {
    return [];
  }

  if (role === 'manager' && managedPropertyIds.length === 0) {
    return [];
  }

  const bookings = await safeList<BookingRecord>(() => {
    let query = supabase
      .from('bookings')
      .select(
        'id, property_id, user_id, owner_id, check_in, check_out, status, total_price, currency, payment_status, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (role === 'host') {
      query = query.eq('owner_id', currentUser.id);
    } else if (role === 'manager') {
      query = query.in('property_id', managedPropertyIds);
    } else if (role === 'user') {
      query = query.eq('user_id', currentUser.id);
    }

    return query;
  });

  return bookings.map((booking) => mapDashboardBooking(booking, propertyMap));
};

export const loadUserDashboardSnapshot = async (
  currentUser: User,
  properties: Property[],
  savedPropertyCount: number,
  recentlyViewedProperties: string[],
): Promise<UserDashboardSnapshot> => {
  const role = normalizeUserRole(currentUser);
  const ownedProperties = properties.filter((property) => property.ownerId === currentUser.id);
  const managedProperties = getManagedProperties(currentUser, properties);
  const allBookings = await listAccessibleBookings(currentUser, properties, 8);

  if (role === 'admin') {
    const adminSnapshot = await loadAdminDashboardSnapshot(currentUser, properties);

    return {
      stats: adminSnapshot.overviewStats,
      summaryCards: [
        {
          title: 'Moderation load',
          value: adminSnapshot.operations[0]?.items[0] || 'No live queue',
          description: 'Listing quality work that still needs review from the control layer.',
        },
        {
          title: 'Risk watch',
          value: adminSnapshot.risks[0]?.title || 'Stable',
          description: adminSnapshot.risks[0]?.description || 'No elevated platform alerts were found.',
        },
        {
          title: 'Reporting',
          value: `${adminSnapshot.reports.length} exports`,
          description: 'Download a fresh operational snapshot from the admin workspace when needed.',
        },
      ],
      recentBookings: allBookings.slice(0, 3),
      activity: adminSnapshot.activity.slice(0, 4),
    };
  }

  const notificationActivity = isSupabaseConfigured()
    ? await loadNotificationActivity(currentUser.id)
    : [];

  if (role === 'manager') {
    const managerBookings = allBookings;
    const pendingBookings = managerBookings.filter((booking) =>
      booking.status.toLowerCase().includes('pending'),
    );
    const activeManagerBookings = managerBookings.filter((booking) =>
      ACTIVE_BOOKING_STATUSES.has(booking.status.toLowerCase().replace(/\s+/g, '_')),
    );
    const managedOwnerCount = new Set(
      managedProperties.map((property) => property.ownerId).filter(Boolean),
    ).size;
    const listingsWithMedia = managedProperties.filter((property) => propertyImage(property)).length;
    const listingsNeedingAttention = managedProperties.filter(
      (property) => !propertyImage(property) || property.available === false || property.status === 'maintenance',
    ).length;
    const inquiryCount = managedProperties.reduce((sum, property) => sum + Number(property.inquiries || 0), 0);
    const averageRating =
      managedProperties.length > 0
        ? managedProperties.reduce((sum, property) => sum + Number(property.rating || 0), 0) /
          Math.max(1, managedProperties.filter((property) => Number(property.rating || 0) > 0).length)
        : 0;
    const unreadNotifications = isSupabaseConfigured()
      ? await safeCount('notifications', (query) => query.eq('user_id', currentUser.id).eq('read', false))
      : 0;
    const managerActivity =
      notificationActivity.length > 0
        ? notificationActivity
        : managerBookings.slice(0, 4).map((booking) => ({
            id: `manager-booking-${booking.id}`,
            title: `${booking.status} booking in queue`,
            description: `${booking.propertyTitle} still needs follow-through.`,
            time: booking.startDate,
          }));

    return {
      stats: [
        { title: 'Assigned listings', value: formatPlainNumber(managedProperties.length) },
        { title: 'Live bookings', value: formatPlainNumber(activeManagerBookings.length) },
        { title: 'Owners supported', value: formatPlainNumber(managedOwnerCount) },
        { title: 'Inquiry load', value: formatPlainNumber(inquiryCount) },
      ],
      summaryCards: [
        {
          title: 'Approval queue',
          value: pendingBookings.length > 0 ? `${pendingBookings.length} pending` : 'Clear',
          description:
            pendingBookings.length > 0
              ? 'Assigned bookings still need approval or follow-up before they can settle.'
              : 'No pending approvals are waiting in your assigned lane right now.',
        },
        {
          title: 'Listing readiness',
          value:
            managedProperties.length > 0
              ? `${listingsWithMedia}/${managedProperties.length} with media`
              : 'No assignments',
          description:
            listingsNeedingAttention > 0
              ? `${listingsNeedingAttention} assigned listings still need media or availability cleanup.`
              : 'Your assigned listings currently look complete and available.',
        },
        {
          title: 'Support watch',
          value: unreadNotifications > 0 ? `${unreadNotifications} alerts` : 'Calm',
          description:
            unreadNotifications > 0
              ? 'Unread notifications still need a manager response or review.'
              : 'No unread manager notifications are waiting on you right now.',
        },
      ],
      recentBookings: managerBookings.slice(0, 3),
      activity: managerActivity.slice(0, 4),
      managerSnapshot: {
        metrics: [
          { title: 'Managed listings', value: formatPlainNumber(managedProperties.length) },
          { title: 'Pending approvals', value: formatPlainNumber(pendingBookings.length) },
          { title: 'Owner coverage', value: formatPlainNumber(managedOwnerCount) },
          { title: 'Listing rating', value: averageRating > 0 ? averageRating.toFixed(1) : 'New' },
        ],
        toolkit: [
          {
            title: 'Listings with media',
            value: `${listingsWithMedia}/${managedProperties.length || 0}`,
            description: 'Assigned listings that already have enough gallery coverage to feel complete.',
          },
          {
            title: 'Open inquiries',
            value: formatPlainNumber(inquiryCount),
            description: 'Questions and demand signals still sitting across your assigned inventory.',
          },
          {
            title: 'Needs attention',
            value: formatPlainNumber(listingsNeedingAttention),
            description: 'Assigned listings that still need media, status, or operational cleanup.',
          },
        ],
        health: [
          {
            title: managedProperties.length > 0 ? 'Assignments active' : 'No assignments yet',
            description:
              managedProperties.length > 0
                ? 'You have active listings in your management lane and can work them directly.'
                : 'Once listings are assigned to you, they will show up here automatically.',
            badge: managedProperties.length > 0 ? 'Active' : 'Waiting',
          },
          {
            title: pendingBookings.length > 0 ? 'Approval queue live' : 'Approval queue clear',
            description:
              pendingBookings.length > 0
                ? `${pendingBookings.length} booking requests still need follow-through from the management lane.`
                : 'No pending booking requests are waiting on your next step right now.',
            badge: pendingBookings.length > 0 ? 'Review' : 'Clear',
          },
          {
            title: unreadNotifications > 0 ? 'Support follow-up waiting' : 'Support inbox calm',
            description:
              unreadNotifications > 0
                ? `${unreadNotifications} unread notifications still need attention or a reply.`
                : 'Support and owner updates are currently in a calm state.',
            badge: unreadNotifications > 0 ? 'Action needed' : 'Calm',
          },
        ],
      },
    };
  }

  if (role === 'host') {
    const hostBookings = allBookings;
    const activeBookings = hostBookings.filter((booking) =>
      ACTIVE_BOOKING_STATUSES.has(booking.status.toLowerCase().replace(/\s+/g, '_')),
    );
    const revenueBookings = hostBookings.filter((booking) =>
      COMPLETED_BOOKING_STATUSES.has(booking.status.toLowerCase().replace(/\s+/g, '_')),
    );
    const totalRevenue = revenueBookings.reduce((sum, booking) => sum + booking.amount, 0);
    const occupiedListingIds = new Set(activeBookings.map((booking) => booking.propertyId));
    const inquiries = ownedProperties.reduce((sum, property) => sum + (property.inquiries || 0), 0);
    const averageRating =
      ownedProperties.length > 0
        ? ownedProperties.reduce((sum, property) => sum + (property.rating || 0), 0) /
          ownedProperties.filter((property) => typeof property.rating === 'number').length || 0
        : currentUser.hostData?.rating || 0;
    const monthlyRevenue = revenueBookings
      .filter((booking) => {
        const parsed = new Date(booking.startDate);
        return !Number.isNaN(parsed.getTime()) && Date.now() - parsed.getTime() <= 31 * 24 * 60 * 60 * 1000;
      })
      .reduce((sum, booking) => sum + booking.amount, 0);
    const listingsWithMedia = ownedProperties.filter((property) => propertyImage(property)).length;
    const listingsWithReviews = ownedProperties.filter((property) => Number(property.rating || 0) > 0).length;
    const paymentCoverage =
      hostBookings.length > 0
        ? Math.round(
            (hostBookings.filter((booking) => booking.status.toLowerCase() !== 'cancelled').length /
              hostBookings.length) *
              100,
          )
        : 0;

    return {
      stats: [
        { title: 'Active listings', value: formatPlainNumber(ownedProperties.length) },
        { title: 'Live inquiries', value: formatPlainNumber(inquiries) },
        { title: 'Portfolio rating', value: averageRating > 0 ? averageRating.toFixed(1) : 'New' },
        {
          title: 'Response rate',
          value: formatPercent(currentUser.hostData?.responseRate || 0),
        },
      ],
      summaryCards: [
        {
          title: 'Revenue',
          value: compactCurrency(totalRevenue, 'GHS'),
          description: 'Completed booking value flowing through your current portfolio.',
        },
        {
          title: 'Occupancy',
          value: ownedProperties.length > 0 ? formatPercent((occupiedListingIds.size / ownedProperties.length) * 100) : '0%',
          description: 'Listings with an active deal attached right now.',
        },
        {
          title: 'Contracts',
          value: formatPlainNumber(activeBookings.length),
          description: 'Confirmed or active booking records that still need attention.',
        },
      ],
      recentBookings: hostBookings.slice(0, 3),
      activity: (
        isSupabaseConfigured()
          ? [...(await loadReviewActivity(currentUser.id)), ...notificationActivity]
          : notificationActivity
      )
        .slice(0, 4),
      hostSnapshot: {
        metrics: [
          { title: 'Properties listed', value: formatPlainNumber(ownedProperties.length) },
          { title: 'Monthly revenue', value: compactCurrency(monthlyRevenue, 'GHS') },
          { title: 'Active bookings', value: formatPlainNumber(activeBookings.length) },
          { title: 'Landlord rating', value: averageRating > 0 ? averageRating.toFixed(1) : 'New' },
        ],
        toolkit: [
          {
            title: 'Listings with media',
            value: `${listingsWithMedia}/${ownedProperties.length || 0}`,
            description: 'Properties that already have gallery coverage for mobile and web shoppers.',
          },
          {
            title: 'Reviewed listings',
            value: `${listingsWithReviews}/${ownedProperties.length || 0}`,
            description: 'Listings with enough customer feedback to build trust quickly.',
          },
          {
            title: 'Payment coverage',
            value: `${paymentCoverage}%`,
            description: 'Deals still holding a valid status instead of failing out of the flow.',
          },
        ],
        health: [
          {
            title: currentUser.hostData?.verified ? 'Verified landlord' : 'Verification pending',
            description: currentUser.hostData?.verified
              ? 'Your host profile is verified and visible as a trusted account.'
              : 'Finish identity review and listing verification to strengthen trust.',
            badge: currentUser.hostData?.verified ? 'Verified' : 'Action needed',
          },
          {
            title: activeBookings.length > 0 ? 'Deals in motion' : 'Pipeline is clear',
            description:
              activeBookings.length > 0
                ? `${activeBookings.length} active agreements still need follow-through or communication.`
                : 'No active agreements are waiting on your follow-up right now.',
            badge: activeBookings.length > 0 ? 'Live' : 'Calm',
          },
          {
            title: listingsWithMedia === ownedProperties.length ? 'Media coverage complete' : 'Media backlog',
            description:
              listingsWithMedia === ownedProperties.length
                ? 'Every live listing currently has image coverage.'
                : `${ownedProperties.length - listingsWithMedia} listings still need stronger gallery coverage.`,
            badge: listingsWithMedia === ownedProperties.length ? 'Ready' : 'Review',
          },
        ],
      },
    };
  }

  const paymentCount = isSupabaseConfigured()
    ? await safeCount('transactions', (query) => query.eq('user_id', currentUser.id))
    : 0;
  const unreadNotifications = isSupabaseConfigured()
    ? await safeCount('notifications', (query) => query.eq('user_id', currentUser.id).eq('read', false))
    : 0;
  const activeDeals = allBookings.filter((booking) =>
    ACTIVE_BOOKING_STATUSES.has(booking.status.toLowerCase().replace(/\s+/g, '_')),
  );
  const outstandingDeals = allBookings.filter((booking) =>
    booking.status.toLowerCase().includes('pending') || booking.status.toLowerCase().includes('failed'),
  );

  return {
    stats: [
      { title: 'Active applications', value: formatPlainNumber(activeDeals.length) },
      { title: 'Saved homes', value: formatPlainNumber(savedPropertyCount) },
      { title: 'Payments tracked', value: formatPlainNumber(paymentCount) },
      {
        title: 'Member since',
        value:
          currentUser.joinDate || currentUser.joinedAt
            ? new Date(currentUser.joinDate || currentUser.joinedAt || Date.now()).getFullYear().toString()
            : new Date().getFullYear().toString(),
      },
    ],
    summaryCards: [
      {
        title: 'Rent status',
        value: outstandingDeals.length > 0 ? 'Needs action' : activeDeals.length > 0 ? 'Current' : 'No active rent',
        description:
          outstandingDeals.length > 0
            ? 'At least one application or payment still needs follow-up before it settles cleanly.'
            : 'Your active property steps are currently sitting inside the expected payment window.',
      },
      {
        title: 'Offers',
        value: activeDeals.length > 0 ? `${activeDeals.length} active` : 'No open offers',
        description: 'Keep an eye on live property journeys, negotiations, and next steps in one place.',
      },
      {
        title: 'Lease watch',
        value: unreadNotifications > 0 ? `${unreadNotifications} reminders` : 'Clear',
        description: 'Notifications and booking milestones that are still worth checking today.',
      },
    ],
    recentBookings: allBookings.slice(0, 3),
    activity:
      notificationActivity.length > 0
        ? notificationActivity
        : buildFallbackActivity(properties, recentlyViewedProperties),
  };
};

export const loadAdminDashboardSnapshot = async (
  currentUser: User,
  properties: Property[],
): Promise<AdminDashboardSnapshot> => {
  const role = normalizeUserRole(currentUser);
  if (role !== 'admin') {
    return {
      overviewStats: [],
      snapshotMetrics: [],
      activity: [],
      operations: [],
      risks: [],
      reports: [],
    };
  }

  const propertyCount = properties.length;
  const listingsWithMedia = properties.filter((property) => propertyImage(property)).length;
  const lowRatedProperties = properties.filter((property) => Number(property.rating || 0) > 0 && Number(property.rating || 0) < 3.5).length;

  const [userCount, bookingRows, transactionRows, reviewRows, unreadAdminNotifications] = isSupabaseConfigured()
    ? await Promise.all([
        safeCount('users'),
        safeList<any>(() =>
          supabase
            .from('bookings')
            .select('id, property_id, status, total_price, currency, created_at')
            .order('created_at', { ascending: false })
            .limit(12),
        ),
        safeList<any>(() =>
          supabase
            .from('transactions')
            .select('id, amount, status, currency, created_at')
            .order('created_at', { ascending: false })
            .limit(20),
        ),
        safeList<any>(() =>
          supabase
            .from('reviews')
            .select('id, title, comment, rating, created_at, property_id')
            .order('created_at', { ascending: false })
            .limit(8),
        ),
        safeCount('notifications', (query) => query.eq('read', false)),
      ])
    : [0, [], [], [], 0];

  const completedTransactions = transactionRows.filter((row) => row.status === 'completed');
  const problemTransactions = transactionRows.filter((row) =>
    PROBLEM_PAYMENT_STATUSES.has(String(row.status || '').toLowerCase()),
  );
  const totalVolume = completedTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  );
  const pendingBookings = bookingRows.filter((row) => row.status === 'pending').length;
  const activeBookings = bookingRows.filter((row) =>
    ACTIVE_BOOKING_STATUSES.has(String(row.status || '').toLowerCase()),
  ).length;
  const completedBookings = bookingRows.filter((row) =>
    COMPLETED_BOOKING_STATUSES.has(String(row.status || '').toLowerCase()),
  ).length;
  const averageRating =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewRows.length
      : properties.reduce((sum, property) => sum + Number(property.rating || 0), 0) /
        Math.max(1, properties.filter((property) => Number(property.rating || 0) > 0).length);

  const activity: DashboardActivityItem[] = [
    ...bookingRows.slice(0, 4).map((booking) => {
      const property = properties.find((item) => item.id === booking.property_id);
      return {
        id: `booking-${booking.id}`,
        title: `${titleCaseStatus(booking.status)} booking`,
        description: property?.title || 'A new booking record moved through the platform.',
        time: formatRelativeTime(booking.created_at),
      };
    }),
    ...reviewRows.slice(0, 3).map((review) => ({
      id: `review-${review.id}`,
      title: `${review.rating || 0}/5 review posted`,
      description: review.title || review.comment || 'New listing feedback arrived.',
      time: formatRelativeTime(review.created_at),
    })),
    ...transactionRows.slice(0, 3).map((transaction) => ({
      id: `transaction-${transaction.id}`,
      title: `${titleCaseStatus(transaction.status)} payment update`,
      description: `${compactCurrency(Number(transaction.amount || 0), transaction.currency || 'GHS')} recorded.`,
      time: formatRelativeTime(transaction.created_at),
    })),
  ]
    .slice(0, 6);

  const operations: AdminOperationsCard[] = [
    {
      title: 'Listing Quality',
      description: 'Inventory signals pulled directly from the current property dataset.',
      items: [
        `${formatPlainNumber(propertyCount - listingsWithMedia)} listings still need gallery coverage`,
        `${formatPlainNumber(properties.filter((property) => property.available !== false).length)} listings currently look live`,
        `${formatPlainNumber(properties.filter((property) => Number(property.views || 0) > 0).length)} listings already have shopper traffic`,
      ],
    },
    {
      title: 'Booking Flow',
      description: 'Recent booking records moving across the marketplace.',
      items: [
        `${formatPlainNumber(pendingBookings)} bookings are still pending approval`,
        `${formatPlainNumber(activeBookings)} bookings are currently active or confirmed`,
        `${formatPlainNumber(completedBookings)} bookings recently completed across the platform`,
      ],
    },
    {
      title: 'Payments',
      description: 'Transaction flow that now reflects live payment records instead of placeholders.',
      items: [
        `${formatPlainNumber(completedTransactions.length)} completed transactions captured in live records`,
        `${formatPlainNumber(problemTransactions.length)} failed or refunded transactions to review`,
        `${compactCurrency(totalVolume, 'GHS')} settled volume across recent completed transactions`,
      ],
    },
    {
      title: 'Community Pulse',
      description: 'A quick read on users, reviews, and unread platform alerts.',
      items: [
        `${formatPlainNumber(userCount)} users currently present in the platform data`,
        `${formatPlainNumber(reviewRows.length)} recent reviews available for moderation context`,
        `${formatPlainNumber(unreadAdminNotifications)} unread notifications still waiting on review`,
      ],
    },
  ];

  const risks: AdminRiskCard[] = [
    {
      title: problemTransactions.length > 0 ? 'Payment exceptions' : 'Payments stable',
      tone: problemTransactions.length > 0 ? 'warning' : 'success',
      description:
        problemTransactions.length > 0
          ? `${problemTransactions.length} recent transactions are failed or refunded and deserve a closer look.`
          : 'No failed or refunded transactions appeared in the recent payment records.',
    },
    {
      title: propertyCount - listingsWithMedia > 0 ? 'Media backlog' : 'Media coverage ready',
      tone: propertyCount - listingsWithMedia > 0 ? 'neutral' : 'success',
      description:
        propertyCount - listingsWithMedia > 0
          ? `${propertyCount - listingsWithMedia} listings still need stronger image coverage before they feel complete.`
          : 'Every visible listing currently has at least one media asset attached.',
    },
    {
      title: lowRatedProperties > 0 ? 'Low-rated inventory' : 'Listing sentiment healthy',
      tone: lowRatedProperties > 0 ? 'warning' : 'success',
      description:
        lowRatedProperties > 0
          ? `${lowRatedProperties} listings are sitting below a 3.5 rating and should be reviewed for quality issues.`
          : 'The latest rated inventory is staying above the low-rating threshold.',
    },
  ];

  const overviewStats: DashboardMetric[] = [
    {
      title: 'Active customers',
      value: formatPlainNumber(userCount),
      description: 'Users currently represented in the live dataset.',
    },
    {
      title: 'Live listings',
      value: formatPlainNumber(properties.filter((property) => property.available !== false).length),
      description: 'Listings currently available to browse.',
    },
    {
      title: 'Gross volume',
      value: compactCurrency(totalVolume, 'GHS'),
      description: 'Completed transaction value pulled from live payment records.',
    },
    {
      title: 'Risk alerts',
      value: formatPlainNumber(problemTransactions.length + (propertyCount - listingsWithMedia) + lowRatedProperties),
      description: 'Payment, media, and listing quality flags combined.',
    },
  ];

  const snapshotMetrics: DashboardMetric[] = [
    {
      title: 'Bookings in motion',
      value: formatPlainNumber(activeBookings),
      description: 'Active or confirmed booking records across the marketplace.',
    },
    {
      title: 'Average rating',
      value: averageRating > 0 ? averageRating.toFixed(1) : 'No reviews',
      description: 'Current review average pulled from live listing feedback.',
    },
    {
      title: 'Media-ready inventory',
      value: propertyCount > 0 ? formatPercent((listingsWithMedia / propertyCount) * 100) : '0%',
      description: 'Share of listings that already have at least one image asset.',
    },
  ];

  const reportPayloadBase = {
    generatedAt: new Date().toISOString(),
    overviewStats,
    snapshotMetrics,
    operations,
    risks,
  };

  const reports: AdminReportDefinition[] = [
    {
      id: 'marketplace-brief',
      title: 'Marketplace Brief',
      description: 'Core inventory, booking, and payment volume signals.',
      payload: {
        ...reportPayloadBase,
        bookings: bookingRows,
      },
    },
    {
      id: 'trust-review',
      title: 'Trust Review',
      description: 'Recent reviews, media coverage, and alert surfaces.',
      payload: {
        ...reportPayloadBase,
        reviews: reviewRows,
      },
    },
    {
      id: 'payments-watch',
      title: 'Payments Watch',
      description: 'Completed and failed transactions for finance oversight.',
      payload: {
        ...reportPayloadBase,
        transactions: transactionRows,
      },
    },
  ];

  return {
    overviewStats,
    snapshotMetrics,
    activity,
    operations,
    risks,
    reports,
  };
};
