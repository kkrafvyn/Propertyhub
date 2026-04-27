import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Home, Plus, Edit, Trash2, Eye, DollarSign, Shield, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import type { AppState, Property, User as UserType } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import RoleFunctionsPanel from './RoleFunctionsPanel';
import { getRoleWorkspace, userCan } from '../utils/roleCapabilities';
import { useGeocoding } from './geocoding/GeocodingProvider';

interface PropertyManagementProps {
  user: UserType;
  properties: Property[];
  onNavigation?: (state: AppState) => void;
  onAddProperty?: (property: Property) => Promise<void> | void;
  onUpdateProperty?: (propertyId: string, updates: Partial<Property>) => Promise<void> | void;
  onDeleteProperty?: (propertyId: string) => Promise<void> | void;
}

interface PropertyDraft {
  title: string;
  type: 'house' | 'land' | 'shop';
  price: string;
  location: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  description: string;
  amenities: string[];
  images: string[];
}

const initialDraft = (): PropertyDraft => ({
  title: '',
  type: 'house',
  price: '',
  location: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  description: '',
  amenities: [],
  images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3'],
});

const getLocationLabel = (location: Property['location']) =>
  typeof location === 'string'
    ? location
    : [location.city, location.region, location.country].filter(Boolean).join(', ');

const getPropertyPrice = (property: Property) => property.price ?? property.pricing.amount ?? 0;

const isPropertyAvailable = (property: Property) =>
  property.available ?? property.status === 'available';

const getPropertyImage = (property: Property) =>
  property.images?.[0] || property.media?.[0]?.url || '';

export function PropertyManagement({
  user,
  properties,
  onNavigation,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
}: PropertyManagementProps) {
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newProperty, setNewProperty] = useState<PropertyDraft>(initialDraft);
  const { geocodeAddress } = useGeocoding();
  const roleWorkspace = useMemo(() => getRoleWorkspace(user), [user]);
  const normalizedRole = roleWorkspace.role;
  const canManageProperties = userCan(user, 'canManageProperties');
  const canAddProperty = userCan(user, 'canAddProperty');
  const canEditProperty = userCan(user, 'canEditProperty');
  const canDeleteProperty = userCan(user, 'canDeleteProperty');
  const canViewAnalytics = userCan(user, 'canViewAnalytics');
  const managedPropertyIds = useMemo(
    () => new Set(user.managerData?.assignedProperties || []),
    [user.managerData?.assignedProperties],
  );

  const userProperties = useMemo(
    () =>
      properties.filter((property) => {
        if (!canManageProperties) return false;
        if (normalizedRole === 'admin') return true;
        if (normalizedRole === 'host') return property.ownerId === user.id;
        if (normalizedRole === 'manager') {
          return property.managerId === user.id || managedPropertyIds.has(property.id);
        }
        return false;
      }),
    [canManageProperties, managedPropertyIds, normalizedRole, properties, user],
  );

  const stats = useMemo(
    () => ({
      totalProperties: userProperties.length,
      availableProperties: userProperties.filter(isPropertyAvailable).length,
      totalValue: userProperties.reduce((sum, property) => sum + getPropertyPrice(property), 0),
      averageRating:
        userProperties.length > 0
          ? userProperties.reduce((sum, property) => sum + (property.rating || 0), 0) /
            userProperties.length
          : 0,
    }),
    [userProperties],
  );

  const runManagedAction = async (action: () => Promise<void> | void, failureMessage: string) => {
    try {
      await action();
    } catch (error) {
      console.error(failureMessage, error);
      toast.error(failureMessage);
    }
  };

  const handleAddProperty = async () => {
    if (!onAddProperty) return;

    setIsSavingProperty(true);

    const price = parseInt(newProperty.price, 10) || 0;
    const area = parseInt(newProperty.area, 10) || 0;
    const bedrooms = newProperty.bedrooms ? parseInt(newProperty.bedrooms, 10) : undefined;
    const bathrooms = newProperty.bathrooms ? parseInt(newProperty.bathrooms, 10) : undefined;
    const timestamp = new Date().toISOString();
    const geocodedLocation = newProperty.location.trim()
      ? await geocodeAddress(newProperty.location)
      : null;

    const property: Property = {
      id: `draft-${Date.now()}`,
      title: newProperty.title,
      description: newProperty.description,
      type: newProperty.type,
      listingType: 'sale',
      status: 'available',
      pricing: {
        amount: price,
        currency: 'GHS',
        negotiable: true,
      },
      location: geocodedLocation?.formattedAddress || newProperty.location,
      features: {
        area,
        bedrooms,
        bathrooms,
      },
      amenities: newProperty.amenities,
      media: newProperty.images.map((url, index) => ({
        id: `${Date.now()}-${index}`,
        url,
        type: 'image',
        order: index,
      })),
      ownerId: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      views: 0,
      favorites: 0,
      inquiries: 0,
      tags: [],
      price,
      currency: 'GHS',
      images: newProperty.images,
      owner: user.name,
      available: true,
      featured: false,
      rating: 0,
      reviews: 0,
      area,
      bedrooms,
      bathrooms,
      coordinates: geocodedLocation
        ? [geocodedLocation.coordinates.lat, geocodedLocation.coordinates.lng]
        : undefined,
    };

    try {
      await onAddProperty(property);
      setIsAddingProperty(false);
      setNewProperty(initialDraft());
      toast.success('Property saved successfully.');
    } catch (error) {
      console.error('Failed to add property:', error);
      toast.error('Failed to save property.');
    } finally {
      setIsSavingProperty(false);
    }
  };

  if (!canManageProperties) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="rounded-[32px] border border-border bg-card shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-foreground">Inventory access is limited</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              This role can browse the marketplace, activity, and messages, but property management is reserved for landlords, assigned managers, and admins.
            </p>
            {onNavigation ? (
              <Button className="mt-6" onClick={() => onNavigation(roleWorkspace.homeState)}>
                Return to workspace
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold">
          {roleWorkspace.role === 'admin'
            ? 'Property Management'
            : roleWorkspace.role === 'manager'
              ? 'Managed Properties'
              : 'My Properties'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {roleWorkspace.role === 'admin'
            ? 'Review, verify, edit, or remove listings across the platform.'
            : roleWorkspace.role === 'manager'
              ? 'Work assigned listings, update readiness, and keep owner operations on track.'
              : 'Manage your active listings, availability, and portfolio.'}
        </p>
      </motion.div>

      <RoleFunctionsPanel
        currentUser={user}
        onNavigate={onNavigation}
        compact
        maxItems={3}
      />

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">Properties managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Available</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableProperties}</div>
            <p className="text-xs text-muted-foreground">Ready for listing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Portfolio value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Avg. Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Across active reviews</p>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="properties" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList
            className={`grid h-auto w-full max-w-md rounded-[24px] border border-border bg-card p-1 shadow-sm ${
              canViewAnalytics ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <TabsTrigger value="properties">Properties</TabsTrigger>
            {canViewAnalytics ? <TabsTrigger value="analytics">Analytics</TabsTrigger> : null}
          </TabsList>

          {canAddProperty && onAddProperty && (
            <Dialog open={isAddingProperty} onOpenChange={setIsAddingProperty}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>Create a new property listing.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Property Title</Label>
                    <Input
                      id="title"
                      value={newProperty.title}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Modern Downtown Apartment"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type</Label>
                    <Select
                      value={newProperty.type}
                      onValueChange={(value: PropertyDraft['type']) =>
                        setNewProperty((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House / Apartment</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="shop">Commercial / Shop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newProperty.price}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="2500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newProperty.location}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Accra, Greater Accra"
                    />
                  </div>

                  {newProperty.type === 'house' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                          id="bedrooms"
                          type="number"
                          value={newProperty.bedrooms}
                          onChange={(e) =>
                            setNewProperty((prev) => ({ ...prev, bedrooms: e.target.value }))
                          }
                          placeholder="3"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                          id="bathrooms"
                          type="number"
                          value={newProperty.bathrooms}
                          onChange={(e) =>
                            setNewProperty((prev) => ({ ...prev, bathrooms: e.target.value }))
                          }
                          placeholder="2"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      type="number"
                      value={newProperty.area}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, area: e.target.value }))
                      }
                      placeholder="120"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProperty.description}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe the property, neighborhood, and amenities."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingProperty(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleAddProperty()} disabled={isSavingProperty}>
                    {isSavingProperty ? 'Saving...' : 'Add Property'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="properties" className="space-y-6">
          <motion.div
            className="grid gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {userProperties.length > 0 ? (
              userProperties.map((property) => (
                <Card key={property.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <ImageWithFallback
                        src={getPropertyImage(property)}
                        alt={property.title}
                        className="w-full lg:w-48 h-48 lg:h-32 object-cover rounded-lg"
                      />

                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{property.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                              <span>{getLocationLabel(property.location)}</span>
                              <span>${getPropertyPrice(property).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant={isPropertyAvailable(property) ? 'default' : 'secondary'}>
                              {isPropertyAvailable(property) ? 'Available' : 'Unavailable'}
                            </Badge>
                            <Badge variant="outline">{property.type}</Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {property.description}
                        </p>

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Rating {Number(property.rating || 0).toFixed(1)}</span>
                            <span>({property.reviews || 0} reviews)</span>
                            <span>{property.area || property.features.area} sq ft</span>
                          </div>

                          <div className="flex space-x-2">
                            {onUpdateProperty && canEditProperty && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingProperty(property)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Property</DialogTitle>
                                    <DialogDescription>Update property availability.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Availability</Label>
                                      <Select
                                        defaultValue={isPropertyAvailable(property) ? 'available' : 'unavailable'}
                                        onValueChange={(value) => {
                                          if (!editingProperty) return;
                                          void runManagedAction(
                                            () =>
                                              onUpdateProperty?.(editingProperty.id, {
                                                available: value === 'available',
                                                status:
                                                  value === 'available' ? 'available' : 'maintenance',
                                              }),
                                            'Failed to update property.',
                                          );
                                          setEditingProperty(null);
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="available">Available</SelectItem>
                                          <SelectItem value="unavailable">Unavailable</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            {onDeleteProperty && canDeleteProperty && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this property?')) {
                                    void runManagedAction(
                                      () => onDeleteProperty?.(property.id),
                                      'Failed to delete property.',
                                    );
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Properties Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {normalizedRole === 'host'
                      ? "You haven't added any properties yet."
                      : normalizedRole === 'manager'
                        ? 'No listings have been assigned to your management lane yet.'
                      : normalizedRole === 'admin'
                        ? 'No platform listings are available yet.'
                        : 'No properties are available for this role yet.'}
                  </p>
                  {canAddProperty && onAddProperty && (
                    <Button onClick={() => setIsAddingProperty(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Property
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Analytics</CardTitle>
              <CardDescription>Performance metrics for your properties.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                <p>
                  {canViewAnalytics
                    ? 'Analytics are available from the management dashboard once live data is connected.'
                    : 'Analytics access has not been enabled for this role yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
