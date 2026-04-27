import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Home,
  MapPin,
  MessageCircle,
  Receipt,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppState, Property, User } from '../types';
import { getLocationLabel, getPropertyPrice } from '../utils/location';
import { formatPrice } from '../utils/propertyFiltering';
import { BrandMark } from './BrandMark';
import { cn } from './ui/utils';
import { useAppContext } from '../hooks/useAppContext';
import { useSearch } from './EnhancedSearchProvider';
import RoleFunctionsPanel from './RoleFunctionsPanel';
import { getRoleWorkspace, normalizeUserRole } from '../utils/roleCapabilities';
import { LoadingSpinner } from './LoadingSpinner';
import { loadUserDashboardSnapshot, type DashboardActivityItem } from '../services/dashboardDataService';

interface UserDashboardProps {
  currentUser: User;
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  onNavigation: (state: AppState) => void;
}

export function UserDashboard({
  currentUser,
  properties,
  onPropertySelect,
  onNavigation,
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardSnapshot, setDashboardSnapshot] = useState<Awaited<
    ReturnType<typeof loadUserDashboardSnapshot>
  > | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const { favoriteProperties: savedPropertyIds, recentlyViewedProperties } = useAppContext();
  const { savedSearches, propertyAlerts } = useSearch();

  const normalizedRole = normalizeUserRole(currentUser.role);
  const roleWorkspace = React.useMemo(() => getRoleWorkspace(currentUser), [currentUser]);
  const primaryRoleAction = roleWorkspace.functions[0];
  const isLandlord = normalizedRole === 'host';
  const isManager = normalizedRole === 'manager';
  const showsOperationsTab = isLandlord || isManager;
  const firstName = currentUser.name.split(' ')[0] || currentUser.name;
  const managedProperties = React.useMemo(() => {
    if (!isManager) return [];

    const assignedPropertyIds = new Set(currentUser.managerData?.assignedProperties || []);
    return properties.filter(
      (property) => property.managerId === currentUser.id || assignedPropertyIds.has(property.id),
    );
  }, [currentUser, isManager, properties]);

  useEffect(() => {
    let isMounted = true;

    setLoadingSnapshot(true);

    void loadUserDashboardSnapshot(
      currentUser,
      properties,
      savedPropertyIds.length,
      recentlyViewedProperties,
    )
      .then((snapshot) => {
        if (isMounted) {
          setDashboardSnapshot(snapshot);
        }
      })
      .catch((error) => {
        console.error('Failed to load dashboard snapshot:', error);
        if (isMounted) {
          setDashboardSnapshot(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingSnapshot(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, properties, recentlyViewedProperties, savedPropertyIds.length]);

  const statDecorators = {
    user: [
      { icon: Home, iconClass: 'theme-accent-icon' },
      { icon: Star, iconClass: 'theme-success-icon' },
      { icon: CreditCard, iconClass: 'theme-info-icon' },
      { icon: Calendar, iconClass: 'theme-warning-icon' },
    ],
    host: [
      { icon: Building2, iconClass: 'theme-info-icon' },
      { icon: MessageCircle, iconClass: 'theme-accent-icon' },
      { icon: Star, iconClass: 'theme-warning-icon' },
      { icon: TrendingUp, iconClass: 'theme-success-icon' },
    ],
    manager: [
      { icon: BriefcaseBusiness, iconClass: 'theme-info-icon' },
      { icon: CheckCircle2, iconClass: 'theme-accent-icon' },
      { icon: Users, iconClass: 'theme-warning-icon' },
      { icon: BarChart3, iconClass: 'theme-success-icon' },
    ],
    admin: [
      { icon: Users, iconClass: 'theme-info-icon' },
      { icon: Building2, iconClass: 'theme-accent-icon' },
      { icon: AlertTriangle, iconClass: 'theme-warning-icon' },
      { icon: Shield, iconClass: 'theme-success-icon' },
    ],
  } as const;

  const summaryDecorators = {
    user: [
      { icon: CreditCard, className: 'theme-status-paid' },
      { icon: Clock, className: 'theme-status-due' },
      { icon: AlertTriangle, className: 'theme-status-overdue' },
    ],
    host: [
      { icon: TrendingUp, className: 'theme-status-paid' },
      { icon: Building2, className: 'theme-status-due' },
      { icon: CheckCircle2, className: 'theme-status-overdue' },
    ],
    manager: [
      { icon: CheckCircle2, className: 'theme-status-paid' },
      { icon: Building2, className: 'theme-status-due' },
      { icon: MessageCircle, className: 'theme-status-overdue' },
    ],
    admin: [
      { icon: Building2, className: 'theme-status-paid' },
      { icon: Receipt, className: 'theme-status-due' },
      { icon: Shield, className: 'theme-status-overdue' },
    ],
  } as const;

  const stats = statDecorators[normalizedRole].map((decorator, index) => ({
    ...decorator,
    title: dashboardSnapshot?.stats[index]?.title || 'Loading',
    value: dashboardSnapshot?.stats[index]?.value || (loadingSnapshot ? '...' : '0'),
  }));

  const paymentSummary = summaryDecorators[normalizedRole].map((decorator, index) => ({
    ...decorator,
    title: dashboardSnapshot?.summaryCards[index]?.title || 'Loading',
    value: dashboardSnapshot?.summaryCards[index]?.value || (loadingSnapshot ? '...' : '0'),
    description:
      dashboardSnapshot?.summaryCards[index]?.description ||
      'Fresh platform data will appear here as soon as it loads.',
  }));

  const overviewQueueCopy = {
    user: {
      title: 'Active property journey',
      description: 'Applications, offers, and payments gathered into one calmer queue',
      emptyTitle: 'Nothing active yet',
      emptyDescription: 'Start exploring homes and your first rent, sale, or lease flow will show up here.',
      actionLabel: 'Browse homes',
      actionState: 'marketplace' as AppState,
    },
    host: {
      title: 'Deal pipeline',
      description: 'Applicants, buyers, and lease follow-ups that still need attention',
      emptyTitle: 'No active pipeline yet',
      emptyDescription: 'As people engage with your listings, approvals and contract steps will show up here.',
      actionLabel: 'Open portfolio',
      actionState: 'property-management' as AppState,
    },
    manager: {
      title: 'Assigned operations queue',
      description: 'Booking requests, listing fixes, and support follow-ups that still need manager attention',
      emptyTitle: 'No assigned queue yet',
      emptyDescription: 'As listings and booking work get assigned to you, the live queue will collect here.',
      actionLabel: 'Open assignments',
      actionState: 'property-management' as AppState,
    },
    admin: {
      title: 'Trust and control queue',
      description: 'High-authority work that deserves a careful admin decision before it spreads',
      emptyTitle: 'No urgent platform items',
      emptyDescription: 'Listing reviews, disputes, and account actions will surface here when they matter.',
      actionLabel: 'Open admin workspace',
      actionState: 'admin' as AppState,
    },
  }[normalizedRole];

  const collectionCopy = {
    user: {
      title: savedPropertyIds.length > 0 ? 'Saved homes' : 'Homes you may like',
      description:
        savedPropertyIds.length > 0
          ? 'Your bookmarked homes stay here for quick comparison and follow-up'
          : 'Featured listings pulled into your dashboard',
    },
    host: {
      title: 'Portfolio watchlist',
      description: 'Inventory worth checking because it is attracting stronger demand right now',
    },
    manager: {
      title: 'Assigned listings',
      description: 'The properties currently routed through your management lane',
    },
    admin: {
      title: 'Trust watchlist',
      description: 'Inventory worth checking because it affects platform quality and customer trust',
    },
  }[normalizedRole];

  const bookingsTabCopy = {
    user: {
      tabLabel: 'My Deals',
      title: 'Applications and agreements',
      description: 'Review offers, rent steps, and lease activity tied to your account',
      emptyTitle: 'No deals found',
      emptyDescription: 'Your applications, offers, and signed agreements will live here once you start moving on properties.',
      actionLabel: 'Start browsing',
      actionState: 'marketplace' as AppState,
    },
    host: {
      tabLabel: 'Pipeline',
      title: 'Offers and approvals',
      description: 'Stay close to inquiries, signed deals, and next-step follow-up across your listings',
      emptyTitle: 'No approvals yet',
      emptyDescription: 'New tenant, buyer, and lessee activity will land here as your listings pick up.',
      actionLabel: 'Open portfolio',
      actionState: 'property-management' as AppState,
    },
    manager: {
      tabLabel: 'Queue',
      title: 'Assigned booking queue',
      description: 'Keep managed bookings, owner follow-up, and approval work in one place',
      emptyTitle: 'No assigned work right now',
      emptyDescription: 'Assigned booking requests and owner tasks will appear here once your lane is active.',
      actionLabel: 'Open assignments',
      actionState: 'property-management' as AppState,
    },
    admin: {
      tabLabel: 'Platform',
      title: 'Platform actions',
      description: 'Keep listing reviews, dispute work, and user enforcement steps in one summary feed',
      emptyTitle: 'No platform actions right now',
      emptyDescription: 'Escalations, audits, and overrides will show up here when something needs a decision.',
      actionLabel: 'Open admin workspace',
      actionState: 'admin' as AppState,
    },
  }[normalizedRole];

  const recentBookings = dashboardSnapshot?.recentBookings.slice(0, 3) || [];
  const activePropertyAlerts = propertyAlerts.filter((alert) => alert.enabled);
  const favoriteProperties = (
    isManager
      ? managedProperties
      : savedPropertyIds.length > 0
        ? savedPropertyIds
            .map((propertyId) => properties.find((property) => property.id === propertyId))
            .filter((property): property is Property => Boolean(property))
        : properties.filter((property) => property.featured)
  ).slice(0, 3);
  const recentlyViewedHomes = recentlyViewedProperties
    .map((propertyId) => properties.find((property) => property.id === propertyId))
    .filter((property): property is Property => Boolean(property))
    .slice(0, 3);
  const activityFeed: DashboardActivityItem[] = dashboardSnapshot?.activity || [];
  const hostSnapshot = dashboardSnapshot?.hostSnapshot;
  const managerSnapshot = dashboardSnapshot?.managerSnapshot;
  const operationsSnapshot = isLandlord ? hostSnapshot : isManager ? managerSnapshot : null;
  const operationsTabCopy = isLandlord
    ? {
        tabLabel: 'Landlord',
        title: 'Portfolio toolkit',
        description: 'Live portfolio signals pulled from listings, bookings, and review activity',
        bannerTitle: 'Operating baseline',
        bannerDescription:
          'Use this view to catch media, review, or payment gaps before they slow down the portfolio.',
        primaryActionLabel: 'Manage listings',
        secondaryActionLabel: 'Review pipeline',
      }
    : isManager
      ? {
          tabLabel: 'Manager',
          title: 'Management toolkit',
          description: 'Operational signals across your assigned listings, approvals, and owner follow-up',
          bannerTitle: 'Management baseline',
          bannerDescription:
            'Use this view to catch assignment drift, media gaps, and booking slowdowns before they hit owners or renters.',
          primaryActionLabel: 'Open assignments',
          secondaryActionLabel: 'Review queue',
        }
      : null;

  if (loadingSnapshot && !dashboardSnapshot) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.section
          className="relative overflow-hidden rounded-[36px] border border-border bg-card px-5 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="theme-page-glow absolute inset-0" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] xl:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary" />
                {roleWorkspace.dashboardTitle}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Welcome back, {firstName}
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  {roleWorkspace.dashboardDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="rounded-full border-border bg-card px-4 py-2 text-sm shadow-sm">
                  {roleWorkspace.label}
                </Badge>

                <Button
                  onClick={() => onNavigation(primaryRoleAction.state)}
                  className="h-11 rounded-full px-5"
                >
                  {primaryRoleAction.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {showsOperationsTab && (
                  <Button
                    variant="outline"
                    onClick={() => onNavigation('property-management')}
                    className="h-11 rounded-full border-border bg-card px-5"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {isLandlord ? 'Portfolio tools' : 'Assignment tools'}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.06 }}
                >
                  <div className="rounded-[26px] border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="mt-3 text-2xl font-semibold text-foreground">{stat.value}</p>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.iconClass}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RoleFunctionsPanel currentUser={currentUser} onNavigate={onNavigation} className="mb-6" />

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {paymentSummary.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index }}
                className={`${item.className} rounded-[28px] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">{item.title}</p>
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm leading-6">{item.description}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card/80 text-current shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList
              className={cn(
                'grid h-auto w-full gap-1 rounded-[24px] border border-border bg-card p-1 shadow-sm',
                showsOperationsTab ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
              )}
            >
              <TabsTrigger value="overview" className="rounded-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-full">
                {bookingsTabCopy.tabLabel}
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full">
                Activity
              </TabsTrigger>
              {operationsTabCopy && (
                <TabsTrigger value="hosting" className="rounded-full">
                  {operationsTabCopy.tabLabel}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">{overviewQueueCopy.title}</CardTitle>
                  <CardDescription>{overviewQueueCopy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentBookings.length > 0 ? (
                    <div className="space-y-4">
                      {recentBookings.map((booking, index) => (
                        <motion.div
                          key={booking.id}
                          className="flex flex-col gap-4 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 * index }}
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={booking.propertyImage}
                              alt={booking.propertyTitle}
                              className="h-16 w-16 rounded-[18px] object-cover"
                            />
                            <div>
                              <h4 className="font-semibold text-foreground">{booking.propertyTitle}</h4>
                              <p className="text-sm text-muted-foreground">
                                {booking.type.charAt(0).toUpperCase() + booking.type.slice(1)} · {booking.startDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-foreground">GHS {booking.amount.toLocaleString()}</p>
                            <Badge variant={booking.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                              {booking.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
                      <Home className="mx-auto h-12 w-12 text-primary" />
                      <h3 className="mt-4 text-xl font-semibold text-foreground">
                        {overviewQueueCopy.emptyTitle}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {overviewQueueCopy.emptyDescription}
                      </p>
                      <Button
                        onClick={() => onNavigation(overviewQueueCopy.actionState)}
                        className="mt-6 h-11 rounded-full px-5"
                      >
                        {overviewQueueCopy.actionLabel}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">{collectionCopy.title}</CardTitle>
                  <CardDescription>{collectionCopy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {favoriteProperties.map((property, index) => (
                      <motion.button
                        key={property.id}
                        type="button"
                        className="overflow-hidden rounded-[28px] border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 * index }}
                        onClick={() => onPropertySelect(property)}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-secondary">
                          {property.images?.[0] ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.02))]">
                              <BrandMark className="h-20 w-20 rounded-[26px]" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-5">
                          <div>
                            <h4 className="line-clamp-1 text-lg font-semibold text-foreground">{property.title}</h4>
                            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 text-primary" />
                              {getLocationLabel(property.location)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-foreground">
                              {(property.pricing?.currency || property.currency || 'GHS')}{' '}
                              {formatPrice(getPropertyPrice(property))}
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="h-4 w-4 fill-current text-[color:var(--warning)]" />
                              {property.rating?.toFixed(1) || 'New'}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Search tools</CardTitle>
                  <CardDescription>
                    Keep saved searches and property alerts close so you can move faster when the right listing appears.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[26px] border border-border bg-secondary/50 p-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Compass className="h-4 w-4 text-primary" />
                        Saved searches
                      </div>
                      <p className="mt-3 text-3xl font-semibold text-foreground">{savedSearches.length}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {savedSearches.length > 0
                          ? `${savedSearches[0].name} is ready to reopen from the marketplace.`
                          : 'Save a search from the marketplace to keep your best filters ready.'}
                      </p>
                    </div>

                    <div className="rounded-[26px] border border-border bg-secondary/50 p-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Active alerts
                      </div>
                      <p className="mt-3 text-3xl font-semibold text-foreground">{activePropertyAlerts.length}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {activePropertyAlerts.length > 0
                          ? `${activePropertyAlerts[0].matchCount} current matches on your newest live alert.`
                          : 'Create a property alert from your current marketplace filters to stay ahead.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={() => onNavigation('marketplace')} className="h-11 rounded-full px-5">
                      Open marketplace
                    </Button>
                    {savedSearches.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => onNavigation('marketplace')}
                        className="h-11 rounded-full px-5"
                      >
                        Resume saved search
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {recentlyViewedHomes.length > 0 && (
                <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <CardTitle className="text-2xl">Recently viewed</CardTitle>
                    <CardDescription>Jump back into homes you opened most recently</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {recentlyViewedHomes.map((property, index) => (
                        <motion.button
                          key={property.id}
                          type="button"
                          className="overflow-hidden rounded-[28px] border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * index }}
                          onClick={() => onPropertySelect(property)}
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-secondary">
                            {property.images?.[0] ? (
                              <img
                                src={property.images[0]}
                                alt={property.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.02))]">
                                <BrandMark className="h-20 w-20 rounded-[26px]" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-3 p-5">
                            <div>
                              <h4 className="line-clamp-1 text-lg font-semibold text-foreground">{property.title}</h4>
                              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-primary" />
                                {getLocationLabel(property.location)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-semibold text-foreground">
                                {(property.pricing?.currency || property.currency || 'GHS')}{' '}
                                {formatPrice(getPropertyPrice(property))}
                              </p>
                              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-4 w-4 fill-current text-[color:var(--warning)]" />
                                {property.rating?.toFixed(1) || 'New'}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">{bookingsTabCopy.title}</CardTitle>
                  <CardDescription>{bookingsTabCopy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentBookings.length > 0 ? (
                    <div className="space-y-4">
                      {recentBookings.map((booking, index) => (
                        <motion.div
                          key={booking.id}
                          className="flex flex-col gap-4 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.06 * index }}
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={booking.propertyImage}
                              alt={booking.propertyTitle}
                              className="h-16 w-16 rounded-[18px] object-cover"
                            />
                            <div>
                              <h4 className="font-semibold text-foreground">{booking.propertyTitle}</h4>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {booking.startDate} {booking.endDate && `- ${booking.endDate}`}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{booking.duration || 'Ongoing'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-lg font-semibold text-foreground">
                              GHS {booking.amount.toLocaleString()}
                            </p>
                            <Badge className="mt-2">{booking.status}</Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
                      <Compass className="mx-auto h-14 w-14 text-primary" />
                      <h3 className="mt-4 text-xl font-semibold text-foreground">
                        {bookingsTabCopy.emptyTitle}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {bookingsTabCopy.emptyDescription}
                      </p>
                      <Button
                        onClick={() => onNavigation(bookingsTabCopy.actionState)}
                        className="mt-6 h-11 rounded-full px-5"
                      >
                        {bookingsTabCopy.actionLabel}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Recent activity</CardTitle>
                  <CardDescription>A snapshot of what you have been doing around the app</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityFeed.length > 0 ? (
                    <div className="space-y-3">
                      {activityFeed.map((activity, index) => (
                        <motion.div
                          key={`${activity.id}-${index}`}
                          className="flex flex-col gap-3 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.06 * index }}
                        >
                          <div>
                            <p className="font-semibold text-foreground">{activity.title}</p>
                            {activity.description && (
                              <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.time}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-border bg-secondary/40 px-6 py-10 text-center text-sm text-muted-foreground">
                      Activity will show up here as you use the app and receive live updates.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {operationsTabCopy && operationsSnapshot && (
              <TabsContent value="hosting" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {operationsSnapshot.metrics.map((item, index) => {
                    const iconMap = isLandlord
                      ? ([Building2, TrendingUp, Calendar, Star] as const)
                      : ([BriefcaseBusiness, CheckCircle2, Users, BarChart3] as const);
                    const iconClassMap = [
                      'theme-info-icon',
                      'theme-success-icon',
                      'theme-violet-icon',
                      'theme-warning-icon',
                    ] as const;
                    const MetricIcon = iconMap[index] || Building2;

                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 * index }}
                      >
                        <Card className="rounded-[28px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                                <p className="mt-3 text-2xl font-semibold text-foreground">{item.value}</p>
                              </div>
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassMap[index] || 'theme-info-icon'}`}>
                                <MetricIcon className="h-5 w-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {operationsTabCopy.title}
                    </CardTitle>
                    <CardDescription>{operationsTabCopy.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="theme-accent-badge rounded-[28px] p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{operationsTabCopy.bannerTitle}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {operationsTabCopy.bannerDescription}
                          </p>
                        </div>
                        <Badge variant="outline" className="theme-success-badge w-fit rounded-full">
                          Live data
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {operationsSnapshot.toolkit.map((item) => (
                          <div key={item.title} className="rounded-[22px] bg-card p-4 shadow-sm">
                            <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button onClick={() => onNavigation('property-management')} className="h-11 flex-1 rounded-full">
                        <Building2 className="mr-2 h-4 w-4" />
                        {operationsTabCopy.primaryActionLabel}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 flex-1 rounded-full border-border bg-card"
                        onClick={() => setActiveTab('bookings')}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {operationsTabCopy.secondaryActionLabel}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 flex-1 rounded-full border-border bg-card"
                        onClick={() => onNavigation('chat')}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Open messages
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {isLandlord ? 'Portfolio health' : 'Assignment health'}
                    </CardTitle>
                    <CardDescription>
                      {isLandlord
                        ? 'Your listings, income, and trust signals at a glance'
                        : 'Your assignments, support load, and listing readiness at a glance'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {operationsSnapshot.health.map((item, index) => {
                        const iconMap = isLandlord
                          ? ([Star, TrendingUp, Building2] as const)
                          : ([BriefcaseBusiness, CheckCircle2, MessageCircle] as const);
                        const iconClassMap = [
                          'theme-info-icon',
                          'theme-success-icon',
                          'theme-violet-icon',
                        ] as const;
                        const HealthIcon = iconMap[index] || Building2;

                        return (
                          <div
                            key={item.title}
                            className="flex flex-col gap-4 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassMap[index] || 'theme-info-icon'}`}>
                                <HealthIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{item.title}</p>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="w-fit rounded-full bg-card">
                              {item.badge}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default UserDashboard;
