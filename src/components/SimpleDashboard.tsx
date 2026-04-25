import React from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Activity,
  Eye,
  Heart,
  Bookmark,
  Calendar,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'manager' | 'admin';
  avatar?: string;
  verified?: boolean;
  joinedAt?: string;
  stats?: {
    propertiesViewed?: number;
    propertiesLiked?: number;
    propertiesSaved?: number;
    reviewsGiven?: number;
    responseRate?: number;
  };
}

interface Property {
  id: string;
  title: string;
  type: string;
  location?: string;
  price?: number;
  currency?: string;
  views: number;
  likes: number;
  saved: number;
  bookings: number;
  status: string;
  createdAt: string;
  featured: boolean;
  verified: boolean;
  ratings: {
    overall: number;
    reviews: number;
  };
}

interface SimpleDashboardProps {
  currentUser: User;
  properties: Property[];
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ currentUser, properties }) => {
  // Calculate user statistics
  const userStats = React.useMemo(() => {
    const userProperties = properties.filter(p => true); // In real app, filter by user ownership
    const totalViews = userProperties.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = userProperties.reduce((sum, p) => sum + p.likes, 0);
    const totalBookings = userProperties.reduce((sum, p) => sum + p.bookings, 0);
    const activeProperties = userProperties.filter(p => p.status === 'active').length;
    const totalRevenue = userProperties.reduce((sum, p) => sum + (p.price || 0) * p.bookings, 0);

    return {
      totalProperties: userProperties.length,
      activeProperties,
      totalViews,
      totalLikes,
      totalBookings,
      totalRevenue,
      averageRating: userProperties.length > 0 
        ? userProperties.reduce((sum, p) => sum + p.ratings.overall, 0) / userProperties.length 
        : 0
    };
  }, [properties]);

  // Recent activity (mock data)
  const recentActivity = [
    {
      id: 1,
      type: 'view',
      message: 'New property view',
      property: 'Modern Apartment in East Legon',
      time: '2 hours ago',
      icon: Eye
    },
    {
      id: 2,
      type: 'like',
      message: 'Property liked',
      property: 'Luxury Villa in Airport Residential',
      time: '4 hours ago',
      icon: Heart
    },
    {
      id: 3,
      type: 'booking',
      message: 'New booking received',
      property: '3-Bedroom House in Tema',
      time: '1 day ago',
      icon: Calendar
    },
    {
      id: 4,
      type: 'review',
      message: 'New review received',
      property: 'Cozy Apartment in Kumasi',
      time: '2 days ago',
      icon: Star
    }
  ];

  // Quick stats cards
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    color = 'primary' 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    change?: string;
    color?: string;
  }) => (
    <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          color === 'primary' ? 'bg-primary/10' :
          color === 'green' ? 'bg-green-500/10' :
          color === 'blue' ? 'bg-blue-500/10' :
          color === 'orange' ? 'bg-orange-500/10' :
          'bg-primary/10'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'primary' ? 'text-primary' :
            color === 'green' ? 'text-green-500' :
            color === 'blue' ? 'text-blue-500' :
            color === 'orange' ? 'text-orange-500' :
            'text-primary'
          }`} />
        </div>
        {change && (
          <span className={`text-sm font-medium ${
            change.startsWith('+') ? 'text-green-500' : 'text-red-500'
          }`}>
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {currentUser.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your properties today.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Properties"
            value={userStats.totalProperties}
            icon={Building2}
            change="+2 this month"
            color="primary"
          />
          <StatCard
            title="Total Views"
            value={userStats.totalViews.toLocaleString()}
            icon={Eye}
            change="+12% this week"
            color="blue"
          />
          <StatCard
            title="Total Bookings"
            value={userStats.totalBookings}
            icon={Calendar}
            change="+5 this month"
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={`GHS ${userStats.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            change="+18% this month"
            color="orange"
          />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Profile Overview</h2>
              
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-foreground text-2xl font-bold">
                      {currentUser.name.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-1">{currentUser.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{currentUser.email}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    currentUser.role === 'admin' ? 'bg-red-100 text-red-700' :
                    currentUser.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                    currentUser.role === 'host' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {currentUser.role}
                  </span>
                  {currentUser.verified && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm font-medium">
                    {currentUser.joinedAt ? new Date(currentUser.joinedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Properties</span>
                  <span className="text-sm font-medium">{userStats.activeProperties}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">
                      {userStats.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity and Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Activity */}
            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <button className="text-sm text-primary hover:underline">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <activity.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{activity.message}</p>
                      <p className="text-sm text-muted-foreground mb-1">{activity.property}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Quick Actions</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
                  <Building2 className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-3 mx-auto" />
                  <p className="text-sm font-medium group-hover:text-primary">Add Property</p>
                </button>
                
                <button className="p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
                  <BarChart3 className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-3 mx-auto" />
                  <p className="text-sm font-medium group-hover:text-primary">View Analytics</p>
                </button>
                
                <button className="p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
                  <Users className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-3 mx-auto" />
                  <p className="text-sm font-medium group-hover:text-primary">Manage Bookings</p>
                </button>
                
                <button className="p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
                  <Activity className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-3 mx-auto" />
                  <p className="text-sm font-medium group-hover:text-primary">View Reports</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        {userStats.totalProperties > 0 && (
          <div className="mt-8">
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-6">Performance Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Eye className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{(userStats.totalViews / userStats.totalProperties).toFixed(0)}</h3>
                  <p className="text-sm text-muted-foreground">Avg. Views per Property</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{((userStats.totalBookings / userStats.totalViews) * 100).toFixed(1)}%</h3>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">GHS {(userStats.totalRevenue / userStats.totalProperties).toFixed(0)}</h3>
                  <p className="text-sm text-muted-foreground">Avg. Revenue per Property</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDashboard;