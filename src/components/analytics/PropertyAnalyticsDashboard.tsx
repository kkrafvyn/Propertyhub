import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Home, 
  DollarSign, 
  Eye,
  Heart,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

const analyticsData = {
  totalProperties: 156,
  totalViews: 12487,
  totalLikes: 2341,
  totalBookings: 89,
  revenue: 245000,
  conversionRate: 3.2,
  averagePrice: 45000,
  popularLocations: [
    { name: 'East Legon', count: 34, percentage: 22 },
    { name: 'Spintex', count: 28, percentage: 18 },
    { name: 'Airport City', count: 21, percentage: 13 },
    { name: 'Osu', count: 19, percentage: 12 },
    { name: 'Adenta', count: 17, percentage: 11 }
  ],
  monthlyData: [
    { month: 'Jan', properties: 12, views: 1200, bookings: 8 },
    { month: 'Feb', properties: 15, views: 1500, bookings: 12 },
    { month: 'Mar', properties: 18, views: 1800, bookings: 15 },
    { month: 'Apr', properties: 22, views: 2100, bookings: 18 },
    { month: 'May', properties: 25, views: 2400, bookings: 21 },
    { month: 'Jun', properties: 28, views: 2800, bookings: 25 }
  ]
};

export function PropertyAnalyticsDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Track your property performance and market insights
        </p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.totalProperties}
                </p>
                <p className="text-sm text-green-600 mt-1">+12% from last month</p>
              </div>
              <Home className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.totalViews.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">+18% from last month</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData.totalBookings}
                </p>
                <p className="text-sm text-green-600 mt-1">+25% from last month</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  GHS {analyticsData.revenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">+32% from last month</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Performance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Views</span>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Likes</span>
                    <span className="text-sm font-medium">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bookings</span>
                    <span className="text-sm font-medium">58%</span>
                  </div>
                  <Progress value={58} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                    <span className="text-sm font-medium">91%</span>
                  </div>
                  <Progress value={91} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Popular Locations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Popular Locations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.popularLocations.map((location, index) => (
                  <div key={location.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {location.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {location.count} properties
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {location.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Monthly Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4">
              {analyticsData.monthlyData.map((month) => (
                <div key={month.month} className="text-center">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 mb-2">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                      {month.properties}
                    </div>
                    <div className="text-xs text-gray-500">Properties</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {month.month}
                  </div>
                  <div className="text-xs text-gray-500">
                    {month.views} views
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card>
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analyticsData.totalLikes.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Likes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analyticsData.conversionRate}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              GHS {analyticsData.averagePrice.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Price</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}