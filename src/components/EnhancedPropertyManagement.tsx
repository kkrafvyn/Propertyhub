/**
 * EnhancedPropertyManagement - Comprehensive Property Management Dashboard
 * Allows admins and hosts to manage their properties with advanced features
 */

import React, { useState, useCallback, useMemo } from 'react';
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  Share,
  MessageCircle,
  Calendar,
  BarChart3,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Download,
  Upload,
  Settings
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PropertyUploadManager } from './PropertyUploadManager';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'manager' | 'admin';
}

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  location: string;
  type: string;
  category: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  features: string[];
  status: 'draft' | 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  saved: number;
  bookings: number;
  featured: boolean;
  verified: boolean;
  instantBook: boolean;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    rating: number;
    responseTime: number;
  };
  ratings?: {
    overall: number;
    reviews: number;
  };
  performance?: {
    conversionRate: number;
    responseRate: number;
    averageStay: number;
    revenue: number;
  };
}

interface EnhancedPropertyManagementProps {
  currentUser: User;
  properties: Property[];
  onPropertyUpdate?: (property: Property) => void;
  onPropertyDelete?: (propertyId: string) => void;
  onPropertyCreate?: (property: any) => void;
}

type ViewMode = 'grid' | 'table' | 'analytics';
type SortBy = 'newest' | 'oldest' | 'price-high' | 'price-low' | 'views' | 'bookings';
type FilterStatus = 'all' | 'active' | 'draft' | 'inactive' | 'pending';

export const EnhancedPropertyManagement: React.FC<EnhancedPropertyManagementProps> = ({
  currentUser,
  properties: allProperties,
  onPropertyUpdate,
  onPropertyDelete,
  onPropertyCreate
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

  // Filter properties based on user role
  const userProperties = useMemo(() => {
    if (currentUser.role === 'admin') {
      return allProperties;
    } else if (currentUser.role === 'host' || currentUser.role === 'manager') {
      return allProperties.filter(property => property.owner.id === currentUser.id);
    }
    return [];
  }, [allProperties, currentUser]);

  // Apply filters and search
  const filteredProperties = useMemo(() => {
    let filtered = userProperties;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query) ||
        property.type.toLowerCase().includes(query) ||
        property.category.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(property => property.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        case 'views':
          return b.views - a.views;
        case 'bookings':
          return b.bookings - a.bookings;
        default:
          return 0;
      }
    });

    return filtered;
  }, [userProperties, searchQuery, filterStatus, sortBy]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = userProperties.length;
    const active = userProperties.filter(p => p.status === 'active').length;
    const draft = userProperties.filter(p => p.status === 'draft').length;
    const totalViews = userProperties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalBookings = userProperties.reduce((sum, p) => sum + (p.bookings || 0), 0);
    const totalRevenue = userProperties.reduce((sum, p) => sum + (p.performance?.revenue || 0), 0);
    const averageRating = total > 0 ? userProperties.reduce((sum, p) => sum + (p.ratings?.overall || 0), 0) / total : 0;

    return {
      total,
      active,
      draft,
      totalViews,
      totalBookings,
      totalRevenue,
      averageRating,
      conversionRate: totalViews > 0 ? (totalBookings / totalViews) * 100 : 0
    };
  }, [userProperties]);

  // Handle property actions
  const handleEditProperty = useCallback((property: Property) => {
    setEditingProperty(property);
    setShowUploadManager(true);
  }, []);

  const handleDeleteProperty = useCallback(async (propertyId: string) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await onPropertyDelete?.(propertyId);
        toast.success('Property deleted successfully');
      } catch (error) {
        toast.error('Failed to delete property');
      }
    }
  }, [onPropertyDelete]);

  const handleStatusChange = useCallback(async (propertyId: string, newStatus: string) => {
    try {
      const property = userProperties.find(p => p.id === propertyId);
      if (property) {
        const updatedProperty = { ...property, status: newStatus as any };
        await onPropertyUpdate?.(updatedProperty);
        toast.success(`Property status updated to ${newStatus}`);
      }
    } catch (error) {
      toast.error('Failed to update property status');
    }
  }, [userProperties, onPropertyUpdate]);

  const handleBulkAction = useCallback(async (action: string) => {
    const selectedIds = Array.from(selectedProperties);
    if (selectedIds.length === 0) {
      toast.error('No properties selected');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          for (const id of selectedIds) {
            await handleStatusChange(id, 'active');
          }
          break;
        case 'deactivate':
          for (const id of selectedIds) {
            await handleStatusChange(id, 'inactive');
          }
          break;
        case 'delete':
          if (window.confirm(`Delete ${selectedIds.length} selected properties?`)) {
            for (const id of selectedIds) {
              await handleDeleteProperty(id);
            }
          }
          break;
      }
      setSelectedProperties(new Set());
    } catch (error) {
      toast.error(`Failed to perform bulk ${action}`);
    }
  }, [selectedProperties, handleStatusChange, handleDeleteProperty]);

  // Render analytics dashboard
  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{analytics.active} Active</Badge>
              <Badge variant="secondary">{analytics.draft} Draft</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-green-500">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{analytics.totalBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <span className="text-muted-foreground">
                {analytics.conversionRate.toFixed(1)}% conversion rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₵{analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-green-500">+8% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Rating</span>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="font-medium">{analytics.averageRating.toFixed(1)}</span>
              </div>
            </div>
            <Progress value={analytics.averageRating * 20} className="w-full" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Conversion Rate</span>
              <span className="font-medium">{analytics.conversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={analytics.conversionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render property grid
  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProperties.map((property) => (
        <Card key={property.id} className="group hover:shadow-lg transition-shadow">
          <div className="relative">
            {property.images[0] && (
              <ImageWithFallback
                src={property.images[0]}
                alt={property.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            )}
            
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <Badge 
                variant={property.status === 'active' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {property.status}
              </Badge>
              {property.featured && (
                <Badge variant="outline" className="bg-yellow-500 text-white">
                  Featured
                </Badge>
              )}
              {property.verified && (
                <Badge variant="outline" className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat History
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteProperty(property.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{property.description}</p>
            
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{property.location}</span>
            </div>

            <div className="flex items-center gap-4 mb-4 text-sm">
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Square className="w-4 h-4" />
                <span>{property.area}m²</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-2xl font-bold text-primary">
                  {property.currency} {property.price.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm">{property.ratings.overall}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="font-medium">{property.views}</p>
                <p className="text-muted-foreground">Views</p>
              </div>
              <div>
                <p className="font-medium">{property.likes}</p>
                <p className="text-muted-foreground">Likes</p>
              </div>
              <div>
                <p className="font-medium">{property.bookings}</p>
                <p className="text-muted-foreground">Bookings</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => handleEditProperty(property)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange(property.id, property.status === 'active' ? 'inactive' : 'active')}
              >
                {property.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render table view
  const renderTable = () => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProperties(new Set(filteredProperties.map(p => p.id)));
                  } else {
                    setSelectedProperties(new Set());
                  }
                }}
                checked={selectedProperties.size === filteredProperties.length && filteredProperties.length > 0}
              />
            </TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProperties.map((property) => (
            <TableRow key={property.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedProperties.has(property.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedProperties);
                    if (e.target.checked) {
                      newSelected.add(property.id);
                    } else {
                      newSelected.delete(property.id);
                    }
                    setSelectedProperties(newSelected);
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {property.images[0] && (
                    <ImageWithFallback
                      src={property.images[0]}
                      alt={property.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium">{property.title}</p>
                    <p className="text-sm text-muted-foreground">{property.type}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{property.location}</TableCell>
              <TableCell>
                <span className="font-medium">
                  {property.currency} {property.price.toLocaleString()}
                </span>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={property.status === 'active' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {property.status}
                </Badge>
              </TableCell>
              <TableCell>{property.views.toLocaleString()}</TableCell>
              <TableCell>{property.bookings}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>{property.ratings.overall}</span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteProperty(property.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Property Management</h2>
          <p className="text-muted-foreground">
            Manage and oversee your property listings
          </p>
        </div>
        <Button onClick={() => setShowUploadManager(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price-high">Price (High)</SelectItem>
            <SelectItem value="price-low">Price (Low)</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="bookings">Most Bookings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedProperties.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedProperties.size} properties selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBulkAction('activate')}>
                Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                Deactivate
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          {filteredProperties.length > 0 ? (
            renderGrid()
          ) : (
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first property'
                }
              </p>
              <Button onClick={() => setShowUploadManager(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          {filteredProperties.length > 0 ? renderTable() : (
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <Button onClick={() => setShowUploadManager(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>

      {/* Property Upload Manager Dialog */}
      <Dialog open={showUploadManager} onOpenChange={setShowUploadManager}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <PropertyUploadManager
            currentUser={currentUser}
            editingProperty={editingProperty as any}
            onPropertySaved={(property) => {
              if (editingProperty) {
                onPropertyUpdate?.(property as unknown as Property);
              } else {
                onPropertyCreate?.(property);
              }
              setShowUploadManager(false);
              setEditingProperty(null);
            }}
            onClose={() => {
              setShowUploadManager(false);
              setEditingProperty(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};