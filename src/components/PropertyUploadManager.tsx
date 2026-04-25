/**
 * PropertyUploadManager - Comprehensive Property Upload System
 * Allows admins and hosts to upload and manage properties
 */

import React, { useState, useCallback } from 'react';
import { toast } from "sonner";
import { 
  Building2, 
  Upload, 
  Camera, 
  MapPin, 
  Home, 
  Bed, 
  Bath, 
  Square,
  DollarSign,
  Calendar,
  Star,
  Plus,
  X,
  Save,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Wifi,
  Car,
  Coffee,
  Shield,
  Phone,
  Mail
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'manager' | 'admin';
}

interface PropertyFormData {
  id?: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  location: string;
  type: string;
  category: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  features: string[];
  images: string[];
  status: 'draft' | 'active' | 'inactive' | 'pending';
  featured: boolean;
  verified: boolean;
  instantBook: boolean;
  selfCheckIn: boolean;
  petFriendly: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  virtualTour?: string;
  videoTour?: string;
  availability: {
    checkInTime: string;
    checkOutTime: string;
    minimumStay: number;
    maximumStay: number;
  };
  pricing: {
    basePrice: number;
    weeklyDiscount: number;
    monthlyDiscount: number;
    cleaningFee: number;
    securityDeposit: number;
    extraGuestFee: number;
    maxGuests: number;
  };
  policies: {
    cancellation: 'flexible' | 'moderate' | 'strict';
    houseRules: string[];
    safetyFeatures: string[];
  };
  ownerContact: {
    phone: string;
    email: string;
    preferredContact: 'phone' | 'email' | 'chat';
  };
  performance?: {
    conversionRate: number;
    responseRate: number;
    averageStay: number;
    revenue: number;
  };
}

interface PropertyUploadManagerProps {
  currentUser: User;
  onPropertySaved?: (property: PropertyFormData) => void;
  onClose?: () => void;
  editingProperty?: PropertyFormData | null;
}

const PROPERTY_TYPES = [
  'Apartment', 'House', 'Condo', 'Townhouse', 'Villa', 'Studio', 
  'Loft', 'Duplex', 'Penthouse', 'Commercial', 'Land', 'Shop'
];

const PROPERTY_CATEGORIES = [
  'For Sale', 'For Rent', 'For Lease', 'Short-term Rental', 
  'Commercial Sale', 'Commercial Rent', 'Land Sale'
];

const COMMON_AMENITIES = [
  'WiFi', 'Air Conditioning', 'Heating', 'Kitchen', 'Washer', 'Dryer',
  'Parking', 'Pool', 'Gym', 'Garden', 'Balcony', 'Terrace',
  'Security', 'Elevator', 'Pet-friendly', 'Smoking allowed'
];

const CURRENCIES = [
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

export const PropertyUploadManager: React.FC<PropertyUploadManagerProps> = ({
  currentUser,
  onPropertySaved,
  onClose,
  editingProperty
}) => {
  const [currentTab, setCurrentTab] = useState('basic');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState<PropertyFormData>(() => ({
    title: '',
    description: '',
    price: 0,
    currency: 'GHS',
    location: '',
    type: '',
    category: '',
    bedrooms: 1,
    bathrooms: 1,
    area: 0,
    amenities: [],
    features: [],
    images: [],
    status: 'draft',
    featured: false,
    verified: false,
    instantBook: false,
    selfCheckIn: false,
    petFriendly: false,
    smokingAllowed: false,
    partiesAllowed: false,
    availability: {
      checkInTime: '15:00',
      checkOutTime: '11:00',
      minimumStay: 1,
      maximumStay: 30
    },
    pricing: {
      basePrice: 0,
      weeklyDiscount: 0,
      monthlyDiscount: 0,
      cleaningFee: 0,
      securityDeposit: 0,
      extraGuestFee: 0,
      maxGuests: 2
    },
    policies: {
      cancellation: 'moderate',
      houseRules: [],
      safetyFeatures: []
    },
    ownerContact: {
      phone: '',
      email: currentUser.email,
      preferredContact: 'chat'
    },
    ...editingProperty
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.type) newErrors.type = 'Property type is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (formData.area <= 0) newErrors.area = 'Area must be greater than 0';
    if (formData.images.length === 0) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form field changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle nested field changes
  const handleNestedChange = useCallback((section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof PropertyFormData] as any),
        [field]: value
      }
    }));
  }, []);

  // Handle array field changes
  const handleArrayToggle = useCallback((field: 'amenities' | 'features', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(x => x !== item)
        : [...prev[field], item]
    }));
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const newImages: string[] = [];
    const maxImages = 10;
    
    if (formData.images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            if (newImages.length === files.length) {
              setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
              }));
              toast.success(`${newImages.length} image(s) uploaded successfully`);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, [formData.images.length]);

  // Remove image
  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }, []);

  // Handle property save
  const handleSave = useCallback(async (status: 'draft' | 'active' = 'draft') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const propertyData: PropertyFormData = {
        ...formData,
        id: editingProperty?.id || `prop_${Date.now()}`,
        status,
        verified: currentUser.role === 'admin' || formData.verified
      };

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Save property
      onPropertySaved?.(propertyData);
      
      toast.success(
        editingProperty 
          ? 'Property updated successfully!' 
          : `Property ${status === 'active' ? 'published' : 'saved as draft'} successfully!`
      );

      if (status === 'active') {
        onClose?.();
      }

    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [formData, validateForm, editingProperty, currentUser.role, onPropertySaved, onClose]);

  // Render basic information tab
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Property Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Beautiful 2BR Apartment in Accra"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Accra, Ghana"
              className={`pl-10 ${errors.location ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your property..."
          rows={4}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Property Type *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => handleInputChange('type', value)}
          >
            <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => handleInputChange('category', value)}
          >
            <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <div className="relative">
            <Bed className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bedrooms"
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <div className="relative">
            <Bath className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bathrooms"
              type="number"
              min="0"
              value={formData.bathrooms}
              onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || 0)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="area">Area (m²) *</Label>
          <div className="relative">
            <Square className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="area"
              type="number"
              min="0"
              value={formData.area}
              onChange={(e) => handleInputChange('area', parseInt(e.target.value) || 0)}
              className={`pl-10 ${errors.area ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.area && <p className="text-sm text-destructive">{errors.area}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="price"
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className={`pl-10 ${errors.price ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => handleInputChange('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // Render images tab
  const renderImages = () => (
    <div className="space-y-6">
      <div>
        <Label>Property Images *</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Upload up to 10 high-quality images of your property
        </p>
        
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Upload Images</p>
            <p className="text-sm text-muted-foreground">
              Click to select or drag and drop images here
            </p>
          </label>
        </div>
        {errors.images && <p className="text-sm text-destructive mt-2">{errors.images}</p>}
      </div>

      {formData.images.length > 0 && (
        <div>
          <h3 className="font-medium mb-4">Uploaded Images ({formData.images.length}/10)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative group">
                <ImageWithFallback
                  src={image}
                  alt={`Property image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
                {index === 0 && (
                  <Badge className="absolute bottom-2 left-2 bg-primary text-primary-foreground">
                    Main
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render amenities tab
  const renderAmenities = () => (
    <div className="space-y-6">
      <div>
        <Label>Amenities</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Select all amenities available in your property
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMMON_AMENITIES.map(amenity => (
            <div key={amenity} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`amenity-${amenity}`}
                checked={formData.amenities.includes(amenity)}
                onChange={() => handleArrayToggle('amenities', amenity)}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`amenity-${amenity}`} className="text-sm">
                {amenity}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Property Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="featured">Featured Property</Label>
            <Switch
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => handleInputChange('featured', checked)}
              disabled={currentUser.role !== 'admin'}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="verified">Verified Property</Label>
            <Switch
              id="verified"
              checked={formData.verified}
              onCheckedChange={(checked) => handleInputChange('verified', checked)}
              disabled={currentUser.role !== 'admin'}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="instantBook">Instant Book</Label>
            <Switch
              id="instantBook"
              checked={formData.instantBook}
              onCheckedChange={(checked) => handleInputChange('instantBook', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="selfCheckIn">Self Check-in</Label>
            <Switch
              id="selfCheckIn"
              checked={formData.selfCheckIn}
              onCheckedChange={(checked) => handleInputChange('selfCheckIn', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="petFriendly">Pet Friendly</Label>
            <Switch
              id="petFriendly"
              checked={formData.petFriendly}
              onCheckedChange={(checked) => handleInputChange('petFriendly', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="smokingAllowed">Smoking Allowed</Label>
            <Switch
              id="smokingAllowed"
              checked={formData.smokingAllowed}
              onCheckedChange={(checked) => handleInputChange('smokingAllowed', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Render contact tab
  const renderContact = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">Owner Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ownerPhone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerPhone"
                type="tel"
                value={formData.ownerContact.phone}
                onChange={(e) => handleNestedChange('ownerContact', 'phone', e.target.value)}
                placeholder="+233 20 123 4567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerContact.email}
                onChange={(e) => handleNestedChange('ownerContact', 'email', e.target.value)}
                placeholder="owner@example.com"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Preferred Contact Method</Label>
          <Select 
            value={formData.ownerContact.preferredContact} 
            onValueChange={(value) => handleNestedChange('ownerContact', 'preferredContact', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat">Chat (Recommended)</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-4">Availability & Pricing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkIn">Check-in Time</Label>
            <Input
              id="checkIn"
              type="time"
              value={formData.availability.checkInTime}
              onChange={(e) => handleNestedChange('availability', 'checkInTime', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkOut">Check-out Time</Label>
            <Input
              id="checkOut"
              type="time"
              value={formData.availability.checkOutTime}
              onChange={(e) => handleNestedChange('availability', 'checkOutTime', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minStay">Min Stay (days)</Label>
            <Input
              id="minStay"
              type="number"
              min="1"
              value={formData.availability.minimumStay}
              onChange={(e) => handleNestedChange('availability', 'minimumStay', parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxGuests">Max Guests</Label>
            <Input
              id="maxGuests"
              type="number"
              min="1"
              value={formData.pricing.maxGuests}
              onChange={(e) => handleNestedChange('pricing', 'maxGuests', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (previewMode) {
    return (
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Preview content would go here - similar to PropertyDetailsView */}
            <div className="text-center py-8">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Property Preview</h3>
              <p className="text-muted-foreground">Preview functionality coming soon</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingProperty ? 'Edit Property' : 'Upload New Property'}
              </CardTitle>
              <p className="text-muted-foreground">
                {editingProperty ? 'Update your property information' : 'Add a new property to the marketplace'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {uploading && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Uploading property...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="amenities">Features</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-6">
              {renderBasicInfo()}
            </TabsContent>

            <TabsContent value="images" className="mt-6">
              {renderImages()}
            </TabsContent>

            <TabsContent value="amenities" className="mt-6">
              {renderAmenities()}
            </TabsContent>

            <TabsContent value="contact" className="mt-6">
              {renderContact()}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Auto-saved as draft
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={uploading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              <Button
                onClick={() => handleSave('active')}
                disabled={uploading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {editingProperty ? 'Update Property' : 'Publish Property'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};