import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Home, Plus, Edit, Trash2, Eye, DollarSign, TrendingUp } from 'lucide-react';
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
import type { Property, User as UserType } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PropertyManagementProps {
  user: UserType;
  properties: Property[];
  onAddProperty?: (property: Property) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<Property>) => void;
  onDeleteProperty?: (propertyId: string) => void;
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
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
}: PropertyManagementProps) {
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newProperty, setNewProperty] = useState<PropertyDraft>(initialDraft);

  const userProperties = useMemo(
    () =>
      properties.filter((property) => {
        if (user.role === 'admin') return true;
        if (user.role === 'manager') {
          return user.managerData?.assignedProperties?.includes(property.id) ?? false;
        }
        if (user.role === 'host') return property.ownerId === user.id;
        return false;
      }),
    [properties, user],
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

  const handleAddProperty = () => {
    if (!onAddProperty) return;

    const price = parseInt(newProperty.price, 10) || 0;
    const area = parseInt(newProperty.area, 10) || 0;
    const bedrooms = newProperty.bedrooms ? parseInt(newProperty.bedrooms, 10) : undefined;
    const bathrooms = newProperty.bathrooms ? parseInt(newProperty.bathrooms, 10) : undefined;
    const timestamp = new Date().toISOString();

    const property: Property = {
      id: Date.now().toString(),
      title: newProperty.title,
      description: newProperty.description,
      type: newProperty.type,
      listingType: 'sale',
      status: 'available',
      pricing: {
        amount: price,
        currency: 'USD',
        negotiable: true,
      },
      location: newProperty.location,
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
      currency: 'USD',
      images: newProperty.images,
      owner: user.name,
      available: true,
      featured: false,
      rating: 0,
      reviews: 0,
      area,
      bedrooms,
      bathrooms,
      coordinates: [40.7128, -74.006],
    };

    onAddProperty(property);
    setIsAddingProperty(false);
    setNewProperty(initialDraft());
  };

  const titleByRole: Record<string, string> = {
    admin: 'Property Management',
    manager: 'Assigned Properties',
    host: 'My Properties',
  };

  const descriptionByRole: Record<string, string> = {
    admin: 'Manage all platform properties and assignments.',
    manager: 'Review and update the properties assigned to you.',
    host: 'Manage your active listings and portfolio.',
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold">
          {titleByRole[user.role] || 'Properties'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {descriptionByRole[user.role] || 'View and manage your properties.'}
        </p>
      </motion.div>

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
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-[24px] border border-border bg-card p-1 shadow-sm">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {(user.role === 'host' || user.role === 'admin') && onAddProperty && (
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
                  <Button onClick={handleAddProperty}>Add Property</Button>
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
                            {onUpdateProperty && (
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
                                          onUpdateProperty(editingProperty.id, {
                                            available: value === 'available',
                                            status: value === 'available' ? 'available' : 'maintenance',
                                          });
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

                            {onDeleteProperty && user.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this property?')) {
                                    onDeleteProperty(property.id);
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
                    {user.role === 'host'
                      ? "You haven't added any properties yet."
                      : 'No properties are currently assigned to you.'}
                  </p>
                  {(user.role === 'host' || user.role === 'admin') && onAddProperty && (
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
                <p>Analytics are available from the management dashboard once live data is connected.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
