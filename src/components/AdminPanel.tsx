import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  Download,
  Eye,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { AppState, Property, User } from '../types';
import { AdminChatOversight } from './AdminChatOversight';
import { LoadingSpinner } from './LoadingSpinner';
import { toast } from 'sonner';
import RoleFunctionsPanel from './RoleFunctionsPanel';
import { normalizeUserRole } from '../utils/roleCapabilities';
import {
  loadAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '../services/dashboardDataService';

interface AdminPanelProps {
  currentUser: User;
  properties?: Property[];
  onNavigation?: (state: AppState) => void;
}

const overviewIcons = [Users, Building2, TrendingUp, AlertTriangle] as const;

const downloadJsonReport = (title: string, payload: Record<string, unknown>) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = reportUrl;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(reportUrl);
};

export function AdminPanel({ currentUser, properties = [], onNavigation }: AdminPanelProps) {
  const [snapshot, setSnapshot] = React.useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    setLoading(true);

    void loadAdminDashboardSnapshot(currentUser, properties)
      .then((nextSnapshot) => {
        if (isMounted) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((error) => {
        console.error('Failed to load admin dashboard snapshot:', error);
        if (isMounted) {
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, properties]);

  if (normalizeUserRole(currentUser) !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading && !snapshot) {
    return <LoadingSpinner fullScreen />;
  }

  const overviewStats = snapshot?.overviewStats || [];
  const snapshotMetrics = snapshot?.snapshotMetrics || [];
  const activity = snapshot?.activity || [];
  const operations = snapshot?.operations || [];
  const risks = snapshot?.risks || [];
  const reports = snapshot?.reports || [];

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  <Shield className="mr-1 h-3.5 w-3.5" />
                  Admin Workspace
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Live data
                </Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Platform Control</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Marketplace operations, trust review, and exportable reporting from the live platform dataset.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {overviewStats.map((stat, index) => {
                const Icon = overviewIcons[index] || Shield;
                return (
                  <div
                    key={stat.title}
                    className="rounded-3xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {stat.title}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xl font-semibold">{stat.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {stat.description || 'Live platform snapshot'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[24px] border border-border bg-card p-1 lg:grid-cols-5">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs sm:text-sm">
              Operations
            </TabsTrigger>
            <TabsTrigger value="risk" className="text-xs sm:text-sm">
              Risk
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              Reports
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 text-xs sm:text-sm">
              <Eye className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <RoleFunctionsPanel currentUser={currentUser} onNavigate={onNavigation} compact />

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <Card className="rounded-[28px] border-border/70 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Platform Snapshot
                  </CardTitle>
                  <CardDescription>
                    A compact read of bookings, ratings, and listing readiness from the current live data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  {snapshotMetrics.map((metric) => (
                    <div key={metric.title} className="rounded-3xl bg-secondary/60 p-5">
                      <div className="text-sm text-muted-foreground">{metric.title}</div>
                      <div className="mt-2 text-3xl font-semibold">{metric.value}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{metric.description}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border-border/70 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Recent booking, review, and payment signals worth keeping in view.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activity.length > 0 ? (
                    activity.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground"
                      >
                        <p className="font-medium">{item.title}</p>
                        {item.description ? (
                          <p className="mt-1 text-muted-foreground">{item.description}</p>
                        ) : null}
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {item.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background px-4 py-6 text-sm text-muted-foreground">
                      Activity will populate here as live platform events arrive.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {operations.map((card) => (
                <Card
                  key={card.title}
                  className="rounded-[28px] border-border/70 shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
                >
                  <CardHeader>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {card.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm"
                      >
                        {item}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {risks.map((card) => (
                <Card
                  key={card.title}
                  className="rounded-[28px] border-border/70 shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {card.tone === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : card.tone === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-primary" />
                      )}
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="rounded-[28px] border-border/70 shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {report.title}
                    </CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => {
                        downloadJsonReport(report.title, report.payload);
                        toast.success(`${report.title} exported`);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[420px] lg:h-[calc(100dvh-12rem)]"
            >
              <AdminChatOversight currentUser={currentUser} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminPanel;
