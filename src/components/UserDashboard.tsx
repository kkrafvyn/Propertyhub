import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Compass,
  CreditCard,
  Crown,
  DollarSign,
  Home,
  MapPin,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Property, User } from '../types';
import { getLocationLabel, getPropertyPrice } from '../utils/location';
import { formatPrice } from '../utils/propertyFiltering';
import { BrandMark } from './BrandMark';
import { cn } from './ui/utils';
import { useAppContext } from '../hooks/useAppContext';

interface UserDashboardProps {
  currentUser: User;
  properties: Property[];
  onPropertySelect: (property: Property) => void;
}

const activityFeed = [
  { action: 'Viewed property details', property: 'Modern city apartment', time: '2 hours ago' },
  { action: 'Updated profile settings', property: null, time: '1 day ago' },
  { action: 'Saved a property to shortlist', property: 'Waterfront villa', time: '3 days ago' },
  { action: 'Searched for homes', property: 'Downtown area', time: '1 week ago' },
];

export function UserDashboard({ currentUser, properties, onPropertySelect }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [SubscriptionManager, setSubscriptionManager] =
    useState<React.ComponentType<any> | null>(null);
  const { favoriteProperties: savedPropertyIds, recentlyViewedProperties } = useAppContext();

  const isHost = currentUser.role === 'host' || currentUser.role === 'admin';
  const firstName = currentUser.name.split(' ')[0] || currentUser.name;
  const mockBookings: any[] = [];

  const stats = [
    {
      title: 'Active bookings',
      value: '0',
      icon: Home,
      iconClass: 'theme-accent-icon',
    },
    {
      title: 'Total spent',
      value: 'GHS 0',
      icon: DollarSign,
      iconClass: 'theme-success-icon',
    },
    {
      title: 'Homes viewed',
      value: '24',
      icon: Building2,
      iconClass: 'theme-info-icon',
    },
    {
      title: 'Member since',
      value: currentUser.joinDate
        ? new Date(currentUser.joinDate).getFullYear().toString()
        : '2024',
      icon: Calendar,
      iconClass: 'theme-warning-icon',
    },
  ];

  const paymentSummary = [
    {
      title: 'Paid',
      value: '2 invoices',
      description: 'Recent rent and booking payments confirmed',
      icon: CreditCard,
      className: 'theme-status-paid',
    },
    {
      title: 'Due',
      value: '1 upcoming',
      description: 'Next payment is due within 5 days',
      icon: Clock,
      className: 'theme-status-due',
    },
    {
      title: 'Overdue',
      value: '0 balances',
      description: 'No overdue balances on your account',
      icon: AlertTriangle,
      className: 'theme-status-overdue',
    },
  ];

  const recentBookings = mockBookings.slice(0, 3) || [];
  const favoriteProperties = (
    savedPropertyIds.length > 0
      ? savedPropertyIds
          .map((propertyId) => properties.find((property) => property.id === propertyId))
          .filter((property): property is Property => Boolean(property))
      : properties.filter((property) => property.featured)
  ).slice(0, 3);
  const recentlyViewedHomes = recentlyViewedProperties
    .map((propertyId) => properties.find((property) => property.id === propertyId))
    .filter((property): property is Property => Boolean(property))
    .slice(0, 3);

  const handleManageSubscription = async () => {
    try {
      if (!SubscriptionManager) {
        const { default: SubscriptionManagerComponent } = await import(
          './subscription/SubscriptionManager'
        );
        setSubscriptionManager(() => SubscriptionManagerComponent);
      }
      setShowSubscriptionManager(true);
    } catch (error) {
      console.error('Error loading subscription manager:', error);
    }
  };

  const handleCloseSubscription = () => {
    setShowSubscriptionManager(false);
  };

  if (showSubscriptionManager && SubscriptionManager) {
    return <SubscriptionManager currentUser={currentUser} onClose={handleCloseSubscription} />;
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
                Dashboard overview
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Welcome back, {firstName}
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Track bookings, properties, payments, and messages from one clean tenant dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="rounded-full border-border bg-card px-4 py-2 text-sm shadow-sm">
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Badge>

                <Button
                  onClick={() => favoriteProperties[0] && onPropertySelect(favoriteProperties[0])}
                  className="h-11 rounded-full px-5"
                >
                  Explore homes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {isHost && (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    className="h-11 rounded-full border-border bg-card px-5"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Hosting tools
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
                isHost ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
              )}
            >
              <TabsTrigger value="overview" className="rounded-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-full">
                My Bookings
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full">
                Activity
              </TabsTrigger>
              {isHost && (
                <TabsTrigger value="hosting" className="rounded-full">
                  Hosting
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Recent bookings</CardTitle>
                  <CardDescription>Your next trip and rental activity in one place</CardDescription>
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
                      <h3 className="mt-4 text-xl font-semibold text-foreground">No bookings yet</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Start exploring homes and your upcoming bookings will show up here.
                      </p>
                      <Button
                        onClick={() => favoriteProperties[0] && onPropertySelect(favoriteProperties[0])}
                        className="mt-6 h-11 rounded-full px-5"
                      >
                        Browse homes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {savedPropertyIds.length > 0 ? 'Saved homes' : 'Homes you may like'}
                  </CardTitle>
                  <CardDescription>
                    {savedPropertyIds.length > 0
                      ? 'Your bookmarked homes stay here for quick comparison and follow-up'
                      : 'Featured listings pulled into your dashboard'}
                  </CardDescription>
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
                  <CardTitle className="text-2xl">All bookings</CardTitle>
                  <CardDescription>Review your reservation history and upcoming moves</CardDescription>
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
                      <h3 className="mt-4 text-xl font-semibold text-foreground">No bookings found</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your booking history will live here once you start reserving properties.
                      </p>
                      <Button
                        onClick={() => favoriteProperties[0] && onPropertySelect(favoriteProperties[0])}
                        className="mt-6 h-11 rounded-full px-5"
                      >
                        Start browsing
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
                  <div className="space-y-3">
                    {activityFeed.map((activity, index) => (
                      <motion.div
                        key={`${activity.action}-${index}`}
                        className="flex flex-col gap-3 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * index }}
                      >
                        <div>
                          <p className="font-semibold text-foreground">{activity.action}</p>
                          {activity.property && (
                            <p className="mt-1 text-sm text-muted-foreground">{activity.property}</p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.time}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isHost && (
              <TabsContent value="hosting" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      title: 'Properties listed',
                      value: '8',
                      icon: Building2,
                      iconClass: 'theme-info-icon',
                    },
                    {
                      title: 'Monthly revenue',
                      value: 'GHS 450K',
                      icon: TrendingUp,
                      iconClass: 'theme-success-icon',
                    },
                    {
                      title: 'Active bookings',
                      value: '12',
                      icon: Calendar,
                      iconClass: 'theme-violet-icon',
                    },
                    {
                      title: 'Host rating',
                      value: '4.7',
                      icon: Star,
                      iconClass: 'theme-warning-icon',
                    },
                  ].map((item, index) => (
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
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClass}`}>
                              <item.icon className="h-5 w-5" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Crown className="h-5 w-5 text-primary" />
                      Host subscription
                    </CardTitle>
                    <CardDescription>Manage billing, limits, and premium hosting tools</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="theme-accent-badge rounded-[28px] p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">Professional plan</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            GHS 15,000 per month · Renews January 15, 2025
                          </p>
                        </div>
                        <Badge variant="outline" className="theme-success-badge w-fit rounded-full">
                          Active
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[22px] bg-card p-4 shadow-sm">
                          <p className="text-2xl font-semibold text-foreground">8/15</p>
                          <p className="mt-1 text-sm text-muted-foreground">Properties used</p>
                        </div>
                        <div className="rounded-[22px] bg-card p-4 shadow-sm">
                          <p className="text-2xl font-semibold text-foreground">120/200</p>
                          <p className="mt-1 text-sm text-muted-foreground">Photos used</p>
                        </div>
                        <div className="rounded-[22px] bg-card p-4 shadow-sm">
                          <p className="text-2xl font-semibold text-foreground">Included</p>
                          <p className="mt-1 text-sm text-muted-foreground">Premium features</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button onClick={handleManageSubscription} className="h-11 flex-1 rounded-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage subscription
                      </Button>
                      <Button variant="outline" className="h-11 flex-1 rounded-full border-border bg-card">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View analytics
                      </Button>
                      <Button variant="outline" className="h-11 flex-1 rounded-full border-border bg-card">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing history
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <CardHeader>
                    <CardTitle className="text-2xl">Host performance</CardTitle>
                    <CardDescription>Your portfolio, revenue, and trust signals at a glance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        {
                          title: 'Superhost status',
                          description: 'Achieved in December 2024',
                          icon: Star,
                          iconClass: 'theme-info-icon',
                          badge: 'Earned',
                        },
                        {
                          title: 'Revenue milestone',
                          description: 'GHS 1M+ total earnings',
                          icon: TrendingUp,
                          iconClass: 'theme-success-icon',
                          badge: 'Achieved',
                        },
                        {
                          title: 'Property portfolio',
                          description: '8 active listings',
                          icon: Building2,
                          iconClass: 'theme-violet-icon',
                          badge: 'Growing',
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="flex flex-col gap-4 rounded-[24px] border border-border bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClass}`}>
                              <item.icon className="h-5 w-5" />
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
                      ))}
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
