import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  Clock,
  MapPin,
  Bell,
  User,
  Phone,
  Mail,
  Navigation,
  AlertCircle,
  CheckCircle,
  CalendarDays,
  Timer,
  Zap
} from 'lucide-react';
import { Property, User as UserType, LocationData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { getLocationLabel, getPropertyCoordinates, getPropertyPrice } from '../utils/location';
import { toast } from "sonner";

interface PropertyTour {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyCoordinates: [number, number];
  userId: string;
  hostId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in minutes
  tourType: 'in-person' | 'virtual' | 'self-guided';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  reminderSettings: {
    enabled: boolean;
    locationRadius: number; // meters
    reminderTimes: number[]; // minutes before tour
    notificationTypes: ('push' | 'sms' | 'email')[];
  };
  attendees: {
    name: string;
    email: string;
    phone?: string;
  }[];
  notes?: string;
  hostNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TourReminderService {
  scheduleLocationReminder: (tour: PropertyTour) => Promise<void>;
  cancelLocationReminder: (tourId: string) => Promise<void>;
  checkLocationProximity: (tour: PropertyTour, userLocation: LocationData) => boolean;
  triggerProximityNotification: (tour: PropertyTour) => void;
}

interface PropertyTourSchedulerProps {
  property: Property;
  currentUser: UserType;
  onBack: () => void;
  onTourScheduled: (tour: PropertyTour) => void;
}

// Mock tour reminder service
const tourReminderService: TourReminderService = {
  async scheduleLocationReminder(tour: PropertyTour): Promise<void> {
    // In a real app, this would integrate with push notification service
    console.log(`Scheduled location reminder for tour ${tour.id}`);
    
    // Store in localStorage for demo
    const reminders = JSON.parse(localStorage.getItem('tourReminders') || '[]');
    reminders.push({
      tourId: tour.id,
      reminderTimes: tour.reminderSettings.reminderTimes,
      locationRadius: tour.reminderSettings.locationRadius,
      coordinates: tour.propertyCoordinates,
    });
    localStorage.setItem('tourReminders', JSON.stringify(reminders));
  },

  async cancelLocationReminder(tourId: string): Promise<void> {
    const reminders = JSON.parse(localStorage.getItem('tourReminders') || '[]');
    const updatedReminders = reminders.filter((r: any) => r.tourId !== tourId);
    localStorage.setItem('tourReminders', JSON.stringify(updatedReminders));
  },

  checkLocationProximity(tour: PropertyTour, userLocation: LocationData): boolean {
    const distance = calculateDistance(
      { lat: userLocation.latitude, lng: userLocation.longitude },
      { lat: tour.propertyCoordinates[0], lng: tour.propertyCoordinates[1] }
    );
    return distance <= tour.reminderSettings.locationRadius;
  },

  triggerProximityNotification(tour: PropertyTour): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Property Tour Reminder`, {
        body: `You're near ${tour.propertyTitle}. Your tour is at ${tour.scheduledTime}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
    
    toast.info(`📍 You're near ${tour.propertyTitle}! Tour at ${tour.scheduledTime}`);
  },
};

// Utility function to calculate distance
const calculateDistance = (pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = deg2rad(pos2.lat - pos1.lat);
  const dLon = deg2rad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(pos1.lat)) *
      Math.cos(deg2rad(pos2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number): number => deg * (Math.PI / 180);

export function PropertyTourScheduler({ property, currentUser, onBack, onTourScheduled }: PropertyTourSchedulerProps) {
  const propertyLocation = getLocationLabel(property.location);
  const propertyCoordinates = getPropertyCoordinates(property);
  const propertyPrice = getPropertyPrice(property);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: 60,
    tourType: 'in-person' as 'in-person' | 'virtual' | 'self-guided',
    attendees: [{ name: currentUser.name, email: currentUser.email, phone: currentUser.phone || '' }],
    notes: '',
    enableReminders: true,
    locationRadius: 500, // meters
    reminderTimes: [30, 10], // minutes before
    notificationTypes: ['push'] as ('push' | 'sms' | 'email')[],
  });

  const [isScheduling, setIsScheduling] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    // Get current location for proximity reminders
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          });
        },
        (error) => console.warn('Location access denied:', error)
      );
    }

    // Generate available time slots
    generateTimeSlots();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    setTimeSlots(slots);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttendeeChange = (index: number, field: string, value: string) => {
    const updatedAttendees = [...formData.attendees];
    updatedAttendees[index] = { ...updatedAttendees[index], [field]: value };
    setFormData(prev => ({ ...prev, attendees: updatedAttendees }));
  };

  const addAttendee = () => {
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, { name: '', email: '', phone: '' }]
    }));
  };

  const removeAttendee = (index: number) => {
    if (formData.attendees.length > 1) {
      const updatedAttendees = formData.attendees.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, attendees: updatedAttendees }));
    }
  };

  const handleScheduleTour = async () => {
    if (!formData.date || !formData.time) {
      toast.error('Please select a date and time for the tour');
      return;
    }

    if (formData.attendees.some(a => !a.name || !a.email)) {
      toast.error('Please fill in all attendee information');
      return;
    }

    setIsScheduling(true);

    try {
      const tour: PropertyTour = {
        id: `tour-${Date.now()}`,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation,
        propertyCoordinates,
        userId: currentUser.id,
        hostId: property.ownerId,
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        duration: formData.duration,
        tourType: formData.tourType,
        status: 'scheduled',
        reminderSettings: {
          enabled: formData.enableReminders,
          locationRadius: formData.locationRadius,
          reminderTimes: formData.reminderTimes,
          notificationTypes: formData.notificationTypes,
        },
        attendees: formData.attendees.filter(a => a.name && a.email),
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save tour to localStorage (in real app, this would be saved to backend)
      const tours = JSON.parse(localStorage.getItem('propertyTours') || '[]');
      tours.push(tour);
      localStorage.setItem('propertyTours', JSON.stringify(tours));

      // Schedule location-based reminders
      if (formData.enableReminders && currentLocation) {
        await tourReminderService.scheduleLocationReminder(tour);
      }

      // Start location monitoring for this tour
      if (formData.enableReminders) {
        startLocationMonitoring(tour);
      }

      toast.success('Tour scheduled successfully! You\'ll receive reminders as you approach the property.');
      onTourScheduled(tour);
      onBack();
    } catch (error) {
      console.error('Error scheduling tour:', error);
      toast.error('Failed to schedule tour. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const startLocationMonitoring = (tour: PropertyTour) => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        // Check if user is near the property
        if (tourReminderService.checkLocationProximity(tour, userLocation)) {
          const now = new Date();
          const tourDateTime = new Date(`${tour.scheduledDate}T${tour.scheduledTime}`);
          const timeDiff = tourDateTime.getTime() - now.getTime();
          const minutesUntil = Math.floor(timeDiff / (1000 * 60));

          // Trigger notification if tour is within the reminder window
          if (minutesUntil <= 60 && minutesUntil >= -15) {
            tourReminderService.triggerProximityNotification(tour);
            navigator.geolocation.clearWatch(watchId); // Stop monitoring after notification
          }
        }
      },
      (error) => console.warn('Location monitoring error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 300000, // 5 minutes
        timeout: 10000,
      }
    );

    // Store watch ID for cleanup
    const watchIds = JSON.parse(localStorage.getItem('locationWatchIds') || '[]');
    watchIds.push({ tourId: tour.id, watchId });
    localStorage.setItem('locationWatchIds', JSON.stringify(watchIds));
  };

  const getTourTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual': return '💻';
      case 'self-guided': return '🗺️';
      default: return '🏠';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'sms': return '📱';
      case 'email': return '📧';
      default: return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        className="bg-card/80 backdrop-blur-lg border-b border-border p-4 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Schedule Property Tour</h1>
              <p className="text-sm text-muted-foreground">Book a tour with smart location reminders</p>
            </div>
          </div>
          
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CalendarDays className="w-4 h-4 mr-1" />
            Smart Scheduling
          </Badge>
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Property Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {property.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="aspect-video w-32 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground">{propertyLocation}</p>
                  <p className="font-semibold text-lg">${propertyPrice.toLocaleString()}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                    {property.bedrooms && <span>{property.bedrooms} beds</span>}
                    {property.bathrooms && <span>{property.bathrooms} baths</span>}
                    <span>{property.area} sqft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tour Scheduling Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Tour Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date and Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tour-date">Tour Date</Label>
                  <Input
                    id="tour-date"
                    type="date"
                    value={formData.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tour-time">Tour Time</Label>
                  <Select value={formData.time} onValueChange={(value) => handleFormChange('time', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tour Type and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tour-type">Tour Type</Label>
                  <Select value={formData.tourType} onValueChange={(value: any) => handleFormChange('tourType', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">
                        🏠 In-Person Tour
                      </SelectItem>
                      <SelectItem value="virtual">
                        💻 Virtual Tour
                      </SelectItem>
                      <SelectItem value="self-guided">
                        🗺️ Self-Guided Tour
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select value={formData.duration.toString()} onValueChange={(value) => handleFormChange('duration', parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attendees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Tour Attendees</Label>
                  <Button variant="outline" size="sm" onClick={addAttendee}>
                    <User className="w-4 h-4 mr-1" />
                    Add Person
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.attendees.map((attendee, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-border rounded-lg">
                      <Input
                        placeholder="Full Name"
                        value={attendee.name}
                        onChange={(e) => handleAttendeeChange(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={attendee.email}
                        onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                      />
                      <Input
                        placeholder="Phone (optional)"
                        value={attendee.phone || ''}
                        onChange={(e) => handleAttendeeChange(index, 'phone', e.target.value)}
                      />
                      <div className="flex items-center justify-end">
                        {index > 0 && (
                          <Button variant="outline" size="sm" onClick={() => removeAttendee(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requests or questions about the property..."
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Smart Reminder Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Smart Location Reminders
                <Badge variant="secondary" className="ml-2">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Reminders */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-reminders">Enable Smart Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get notified when you're near the property</p>
                </div>
                <Switch
                  id="enable-reminders"
                  checked={formData.enableReminders}
                  onCheckedChange={(checked) => handleFormChange('enableReminders', checked)}
                />
              </div>

              {formData.enableReminders && (
                <>
                  {/* Location Radius */}
                  <div>
                    <Label htmlFor="location-radius">Notification Radius</Label>
                    <Select 
                      value={formData.locationRadius.toString()} 
                      onValueChange={(value) => handleFormChange('locationRadius', parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="200">200m - Very Close</SelectItem>
                        <SelectItem value="500">500m - Walking Distance</SelectItem>
                        <SelectItem value="1000">1km - Driving Distance</SelectItem>
                        <SelectItem value="2000">2km - Nearby Area</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll be notified when you're within this distance of the property
                    </p>
                  </div>

                  {/* Reminder Times */}
                  <div>
                    <Label>Reminder Schedule</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {[5, 10, 15, 30, 60].map((minutes) => (
                        <div key={minutes} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`reminder-${minutes}`}
                            checked={formData.reminderTimes.includes(minutes)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleFormChange('reminderTimes', [...formData.reminderTimes, minutes]);
                              } else {
                                handleFormChange('reminderTimes', formData.reminderTimes.filter(t => t !== minutes));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`reminder-${minutes}`} className="text-sm">
                            {minutes}m before
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Types */}
                  <div>
                    <Label>Notification Methods</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      {[
                        { type: 'push', label: 'Push Notifications', icon: '🔔' },
                        { type: 'sms', label: 'SMS', icon: '📱' },
                        { type: 'email', label: 'Email', icon: '📧' },
                      ].map(({ type, label, icon }) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`notification-${type}`}
                            checked={formData.notificationTypes.includes(type as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleFormChange('notificationTypes', [...formData.notificationTypes, type]);
                              } else {
                                handleFormChange('notificationTypes', formData.notificationTypes.filter(t => t !== type));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`notification-${type}`} className="text-sm">
                            {icon} {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Location Status */}
                  {currentLocation && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Location Access Granted
                        </span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Smart reminders will work when you're near the property
                      </p>
                    </div>
                  )}

                  {!currentLocation && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Location Access Required
                        </span>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        Please enable location services for smart reminders to work
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-end space-x-3"
        >
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button 
            onClick={handleScheduleTour}
            disabled={isScheduling || !formData.date || !formData.time}
            className="min-w-[150px]"
          >
            {isScheduling ? (
              <>
                <Timer className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Tour
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
