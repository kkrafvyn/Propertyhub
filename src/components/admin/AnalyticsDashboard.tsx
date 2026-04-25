import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, Users, Home, DollarSign, MessageSquare, Eye } from 'lucide-react';

export interface AnalyticsData {
  totalUsers: number;
  totalProperties: number;
  totalRevenue: number;
  totalMessages: number;
  avgPropertyViews: number;
  conversionRate: number;
  dailyStats: Array<{
    date: string;
    users: number;
    properties: number;
    revenue: number;
    messages: number;
  }>;
  propertyTypes: Array<{
    name: string;
    count: number;
  }>;
  topLocations: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  userActivity: Array<{
    time: string;
    active: number;
  }>;
}

// Mock analytics data generator
export const generateMockAnalytics = (): AnalyticsData => {
  const dailyStats = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 100) + 50,
      properties: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      messages: Math.floor(Math.random() * 200) + 50,
    };
  });

  return {
    totalUsers: 1245,
    totalProperties: 342,
    totalRevenue: 1250000,
    totalMessages: 8945,
    avgPropertyViews: 234,
    conversionRate: 8.5,
    dailyStats,
    propertyTypes: [
      { name: 'Apartment', count: 145 },
      { name: 'House', count: 98 },
      { name: 'Land', count: 64 },
      { name: 'Office', count: 23 },
      { name: 'Shop', count: 12 },
    ],
    topLocations: [
      { name: 'Lagos', count: 98, revenue: 450000 },
      { name: 'Accra', count: 76, revenue: 380000 },
      { name: 'Abuja', count: 54, revenue: 250000 },
      { name: 'Kumasi', count: 45, revenue: 180000 },
      { name: 'Cape Coast', count: 32, revenue: 120000 },
    ],
    userActivity: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      active: Math.floor(Math.random() * 300) + 50,
    })),
  };
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'bg-blue-50' }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`text-sm mt-2 flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend.isPositive ? '+' : ''}{trend.value}% from last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const AdminAnalyticsDashboard: React.FC<{
  data?: AnalyticsData;
}> = ({ data: initialData }) => {
  const [data, setData] = useState<AnalyticsData>(initialData || generateMockAnalytics());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor marketplace performance and user engagement</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={data.totalUsers}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          trend={{ value: 12, isPositive: true }}
          color="bg-blue-50"
        />
        <StatCard
          title="Active Properties"
          value={data.totalProperties}
          icon={<Home className="w-6 h-6 text-green-600" />}
          trend={{ value: 8, isPositive: true }}
          color="bg-green-50"
        />
        <StatCard
          title="Total Revenue"
          value={`GHS ${(data.totalRevenue / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
          trend={{ value: 15, isPositive: true }}
          color="bg-yellow-50"
        />
        <StatCard
          title="Messages Sent"
          value={data.totalMessages}
          icon={<MessageSquare className="w-6 h-6 text-purple-600" />}
          trend={{ value: 5, isPositive: true }}
          color="bg-purple-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>User Activity by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="active" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Property Types Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Properties by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.propertyTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => `${name}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.propertyTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Locations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Top Locations by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={data.topLocations}
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Average Views per Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.avgPropertyViews}</p>
            <p className="text-sm text-gray-600 mt-2">Engagement metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.conversionRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Booking conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Property Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.propertyTypes[0].name}</p>
            <p className="text-sm text-gray-600 mt-2">
              {data.propertyTypes[0].count} listings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
