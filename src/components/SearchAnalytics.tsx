import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { 
  TrendingUp, TrendingDown, Search, Clock, MapPin, Home, 
  Users, BarChart3, Filter, Eye, Star, Calendar 
} from 'lucide-react';

interface SearchAnalyticsData {
  popularSearches: Array<{
    term: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }>;
  popularLocations: Array<{
    location: string;
    searches: number;
    properties: number;
    avgPrice: number;
  }>;
  searchMetrics: {
    totalSearches: number;
    uniqueUsers: number;
    avgResultsPerSearch: number;
    searchConversionRate: number;
  };
  timeBasedData: Array<{
    hour: number;
    searches: number;
  }>;
  filterUsage: Array<{
    filter: string;
    usage: number;
    conversionRate: number;
  }>;
}

interface SearchAnalyticsProps {
  className?: string;
  isAdmin?: boolean;
  compactMode?: boolean;
}

export function SearchAnalytics({ className = "", isAdmin = false, compactMode = false }: SearchAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<SearchAnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  // Mock analytics data - in real app, this would come from API
  useEffect(() => {
    const mockData: SearchAnalyticsData = {
      popularSearches: [
        { term: 'apartments in accra', count: 245, trend: 'up', percentage: 15.2 },
        { term: 'houses east legon', count: 198, trend: 'up', percentage: 8.7 },
        { term: 'commercial space', count: 156, trend: 'stable', percentage: 2.1 },
        { term: 'land for sale', count: 134, trend: 'down', percentage: -5.3 },
        { term: 'furnished apartments', count: 127, trend: 'up', percentage: 12.8 },
        { term: 'swimming pool', count: 89, trend: 'up', percentage: 22.4 },
        { term: 'parking space', count: 76, trend: 'stable', percentage: 1.2 },
        { term: '3 bedroom house', count: 65, trend: 'up', percentage: 7.9 },
      ],
      popularLocations: [
        { location: 'East Legon', searches: 456, properties: 234, avgPrice: 45000 },
        { location: 'Airport Residential', searches: 389, properties: 189, avgPrice: 52000 },
        { location: 'Cantonments', searches: 298, properties: 145, avgPrice: 38000 },
        { location: 'Labone', searches: 267, properties: 123, avgPrice: 42000 },
        { location: 'Tema', searches: 234, properties: 178, avgPrice: 28000 },
      ],
      searchMetrics: {
        totalSearches: 12456,
        uniqueUsers: 3421,
        avgResultsPerSearch: 23.4,
        searchConversionRate: 12.8
      },
      timeBasedData: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        searches: Math.floor(Math.random() * 100) + 20
      })),
      filterUsage: [
        { filter: 'Price Range', usage: 78, conversionRate: 15.2 },
        { filter: 'Property Type', usage: 65, conversionRate: 18.7 },
        { filter: 'Location', usage: 54, conversionRate: 22.1 },
        { filter: 'Bedrooms', usage: 43, conversionRate: 16.9 },
        { filter: 'Amenities', usage: 38, conversionRate: 13.4 },
        { filter: 'Area Size', usage: 28, conversionRate: 11.8 },
      ]
    };

    setTimeout(() => {
      setAnalyticsData(mockData);
      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const maxSearchCount = useMemo(() => {
    return analyticsData ? Math.max(...analyticsData.popularSearches.map(s => s.count)) : 0;
  }, [analyticsData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
              <div className="w-4 h-4 bg-primary rounded-full animate-bounce delay-100" />
              <div className="w-4 h-4 bg-primary rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) return null;

  if (compactMode) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Search Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {analyticsData.searchMetrics.totalSearches.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Searches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.searchMetrics.searchConversionRate}%
              </div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
          </div>

          {/* Top Searches */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Trending Searches</h4>
            {analyticsData.popularSearches.slice(0, 3).map((search, index) => (
              <div key={search.term} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="truncate">{search.term}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(search.trend)}
                  <span className="text-xs">{search.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Search Analytics
          </CardTitle>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="searches">Searches</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <Search className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {analyticsData.searchMetrics.totalSearches.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Searches</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {analyticsData.searchMetrics.uniqueUsers.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Users</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {analyticsData.searchMetrics.avgResultsPerSearch}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Results</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {analyticsData.searchMetrics.searchConversionRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Conversion</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Search Activity Chart */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Search Activity (24h)
              </h3>
              <div className="h-32 flex items-end justify-between gap-1">
                {analyticsData.timeBasedData.map((data, index) => (
                  <motion.div
                    key={data.hour}
                    className="bg-primary/20 hover:bg-primary/40 rounded-t flex-1 transition-colors cursor-pointer"
                    style={{ height: `${(data.searches / 120) * 100}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.05 }}
                    title={`${data.hour}:00 - ${data.searches} searches`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="searches" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Popular Search Terms</h3>
              <Badge variant="outline">Last {timeRange}</Badge>
            </div>
            
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {analyticsData.popularSearches.map((search, index) => (
                  <motion.div
                    key={search.term}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{search.term}</div>
                        <div className="text-sm text-muted-foreground">
                          {search.count} searches
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Progress 
                          value={(search.count / maxSearchCount) * 100} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(search.trend)}
                        <span className={`text-sm font-medium ${
                          search.trend === 'up' ? 'text-green-600' : 
                          search.trend === 'down' ? 'text-red-600' : 
                          'text-muted-foreground'
                        }`}>
                          {search.percentage > 0 ? '+' : ''}{search.percentage}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Popular Locations
              </h3>
              <Badge variant="outline">Last {timeRange}</Badge>
            </div>

            <ScrollArea className="h-80">
              <div className="space-y-3">
                {analyticsData.popularLocations.map((location, index) => (
                  <motion.div
                    key={location.location}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{location.location}</h4>
                      <Badge variant="secondary">{location.searches} searches</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Properties</div>
                        <div className="font-medium">{location.properties}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Price</div>
                        <div className="font-medium">GHS {location.avgPrice.toLocaleString()}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter Usage & Performance
              </h3>
              <Badge variant="outline">Conversion Rates</Badge>
            </div>

            <div className="space-y-3">
              {analyticsData.filterUsage.map((filter, index) => (
                <motion.div
                  key={filter.filter}
                  className="p-4 bg-muted/20 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{filter.filter}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {filter.usage}% usage
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {filter.conversionRate}% conversion
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Usage Rate</span>
                      <span>{filter.usage}%</span>
                    </div>
                    <Progress value={filter.usage} className="h-2" />
                  </div>
                  
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Conversion Rate</span>
                      <span>{filter.conversionRate}%</span>
                    </div>
                    <Progress value={filter.conversionRate} className="h-2" />
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default SearchAnalytics;