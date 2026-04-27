import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle,
  MapPin,
  Timer,
  User,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LocationData, Property, User as UserType } from '../types';
import { bookingService } from '../services/supabaseApi';
import {
  getCurrentLocation,
  scheduleLocalNotifications,
  showLocalNotification,
} from '../services/nativeCapabilities';
import { getLocationLabel, getPropertyCoordinates, getPropertyPrice } from '../utils/location';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';

type TourType = 'in-person' | 'virtual' | 'self-guided';
type ContactMethod = 'email' | 'phone' | 'whatsapp';
type VirtualPlatform = 'google-meet' | 'zoom' | 'whatsapp-video' | 'phone-call';

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
  duration: number;
  tourType: TourType;
  status:
    | 'scheduled'
    | 'pending_confirmation'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'rescheduled';
  workflow: {
    hostAction: string;
    contactMethod?: ContactMethod;
    contactValue?: string;
    virtualPlatform?: VirtualPlatform;
    arrivalWindowMinutes?: number;
    governmentIdReady?: boolean;
    accessNotes?: string;
  };
  reminderSettings: {
    enabled: boolean;
    locationRadius: number;
    reminderTimes: number[];
    notificationTypes: ('push')[];
  };
  attendees: {
    name: string;
    email: string;
    phone?: string;
  }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PropertyTourSchedulerProps {
  property: Property;
  currentUser: UserType;
  onBack: () => void;
  onTourScheduled: (tour: PropertyTour) => void;
}

const calculateDistanceMeters = (
  firstPoint: { lat: number; lng: number },
  secondPoint: { lat: number; lng: number },
) => {
  const earthRadius = 6371000;
  const latitudeDelta = ((secondPoint.lat - firstPoint.lat) * Math.PI) / 180;
  const longitudeDelta = ((secondPoint.lng - firstPoint.lng) * Math.PI) / 180;
  const latitudeOne = (firstPoint.lat * Math.PI) / 180;
  const latitudeTwo = (secondPoint.lat * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const tourTypeCopy: Record<
  TourType,
  {
    label: string;
    description: string;
    hostAction: string;
    notesPlaceholder: string;
    reminderDescription: string;
    nearbyDescription: string;
  }
> = {
  'in-person': {
    label: 'In-person tour',
    description: 'Meet on site with the host or their representative at the property.',
    hostAction: 'Confirm the on-site plan and who will receive you at the property.',
    notesPlaceholder: 'Arrival questions, gate access notes, or anything the host should prepare...',
    reminderDescription: 'Schedule device reminders for the visit and nudge yourself when you are nearby.',
    nearbyDescription:
      'If location access is available when you schedule, we can also nudge you when you are close to the property and the tour is near.',
  },
  virtual: {
    label: 'Virtual tour',
    description: 'Request a live remote walkthrough and let the host confirm the meeting link.',
    hostAction: 'Confirm the platform and send a meeting link or call details before the session.',
    notesPlaceholder: 'Connectivity notes, rooms you want to see closely, or questions for the host...',
    reminderDescription: 'Schedule device reminders for the session start and follow-up handoff.',
    nearbyDescription: 'Virtual tours only use time-based reminders because no arrival travel is needed.',
  },
  'self-guided': {
    label: 'Self-guided tour',
    description: 'Request a host-approved access window and receive instructions after confirmation.',
    hostAction: 'Approve the request, verify access readiness, and share entry instructions.',
    notesPlaceholder: 'Parking, gate, ID, or access concerns the host should plan around...',
    reminderDescription: 'Schedule device reminders for arrival and the approved access window.',
    nearbyDescription:
      'If location access is available when you schedule, we can still nudge you when you are close to the property and the access window is near.',
  },
};

const getReminderBody = (
  propertyTitle: string,
  scheduledTime: string,
  minutesBefore: number,
  tourType: TourType,
) => {
  const label = tourTypeCopy[tourType].label.toLowerCase();

  if (minutesBefore === 0) {
    return `It is time for your ${label} at ${propertyTitle}.`;
  }

  return `${propertyTitle} ${label} starts in ${minutesBefore} minutes at ${scheduledTime}.`;
};

export function PropertyTourScheduler({
  property,
  currentUser,
  onBack,
  onTourScheduled,
}: PropertyTourSchedulerProps) {
  const propertyLocation = getLocationLabel(property.location);
  const propertyCoordinates = getPropertyCoordinates(property);
  const propertyPrice = getPropertyPrice(property);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: 60,
    tourType: 'in-person' as TourType,
    virtualPlatform: 'google-meet' as VirtualPlatform,
    virtualContactMethod: currentUser.phone ? ('phone' as ContactMethod) : ('email' as ContactMethod),
    virtualContactValue: currentUser.phone || currentUser.email,
    selfGuidedContactMethod: currentUser.phone ? ('phone' as ContactMethod) : ('email' as ContactMethod),
    selfGuidedContactValue: currentUser.phone || currentUser.email,
    selfGuidedArrivalWindow: 30,
    selfGuidedGovernmentIdReady: false,
    selfGuidedAccessNotes: '',
    attendees: [
      {
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
      },
    ],
    notes: '',
    enableReminders: true,
    locationRadius: 500,
    reminderTimes: [30, 10],
  });
  const [isScheduling, setIsScheduling] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const bannerShownRef = useRef(false);

  useEffect(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 18; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (!cancelled) {
          setCurrentLocation(location);
          setLocationError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Location access is unavailable on this device.',
          );
        }
      }
    };

    void loadLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const scheduledDateTime = useMemo(() => {
    if (!formData.date || !formData.time) return null;
    return new Date(`${formData.date}T${formData.time}:00`);
  }, [formData.date, formData.time]);

  const handleFormChange = <T extends keyof typeof formData>(
    field: T,
    value: (typeof formData)[T],
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleAttendeeChange = (index: number, field: string, value: string) => {
    const nextAttendees = [...formData.attendees];
    nextAttendees[index] = { ...nextAttendees[index], [field]: value };
    setFormData((previous) => ({ ...previous, attendees: nextAttendees }));
  };

  const addAttendee = () => {
    setFormData((previous) => ({
      ...previous,
      attendees: [...previous.attendees, { name: '', email: '', phone: '' }],
    }));
  };

  const removeAttendee = (index: number) => {
    if (formData.attendees.length <= 1) return;

    setFormData((previous) => ({
      ...previous,
      attendees: previous.attendees.filter((_, attendeeIndex) => attendeeIndex !== index),
    }));
  };

  const scheduleDeviceReminders = async (tour: PropertyTour) => {
    if (!scheduledDateTime || !tour.reminderSettings.enabled) return;

    const notifications = tour.reminderSettings.reminderTimes
      .map((minutesBefore) => {
        const reminderAt = new Date(scheduledDateTime.getTime() - minutesBefore * 60 * 1000);
        return {
          id: Number(`${Date.now()}`.slice(-6)) + minutesBefore,
          title: 'Property tour reminder',
          body: getReminderBody(
            tour.propertyTitle,
            tour.scheduledTime,
            minutesBefore,
            tour.tourType,
          ),
          at: reminderAt,
          data: {
            propertyId: tour.propertyId,
            bookingId: tour.id,
            tourType: tour.tourType,
          },
        };
      })
      .filter((notification) => notification.at.getTime() > Date.now());

    if (notifications.length > 0) {
      await scheduleLocalNotifications(notifications);
    }

    if (currentLocation && tour.tourType !== 'virtual') {
      const distance = calculateDistanceMeters(
        {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        {
          lat: propertyCoordinates[0],
          lng: propertyCoordinates[1],
        },
      );

      const minutesUntil = Math.floor(
        (scheduledDateTime.getTime() - Date.now()) / (1000 * 60),
      );

      if (distance <= tour.reminderSettings.locationRadius && minutesUntil <= 60 && minutesUntil >= -15) {
        await showLocalNotification({
          title:
            tour.tourType === 'self-guided'
              ? 'You are close to the self-guided tour location'
              : 'You are close to the property',
          body:
            tour.tourType === 'self-guided'
              ? `${tour.propertyTitle} access window starts at ${tour.scheduledTime}.`
              : `${tour.propertyTitle} starts at ${tour.scheduledTime}.`,
          data: {
            propertyId: tour.propertyId,
            bookingId: tour.id,
          },
        });
      }
    }
  };

  const handleScheduleTour = async () => {
    if (!formData.date || !formData.time || !scheduledDateTime) {
      toast.error('Please select a date and time for the tour.');
      return;
    }

    if (formData.attendees.some((attendee) => !attendee.name || !attendee.email)) {
      toast.error('Please complete every attendee name and email.');
      return;
    }

    if (formData.tourType === 'virtual' && !formData.virtualContactValue.trim()) {
      toast.error('Add the contact detail the host should use for the virtual session.');
      return;
    }

    if (formData.tourType === 'self-guided') {
      if (!formData.selfGuidedContactValue.trim()) {
        toast.error('Add the contact detail the host should use for self-guided access.');
        return;
      }

      if (!formData.selfGuidedGovernmentIdReady) {
        toast.error('Confirm that you will bring a government ID for self-guided access.');
        return;
      }
    }

    setIsScheduling(true);

    try {
      const workflow =
        formData.tourType === 'virtual'
          ? {
              hostAction: tourTypeCopy.virtual.hostAction,
              contactMethod: formData.virtualContactMethod,
              contactValue: formData.virtualContactValue.trim(),
              virtualPlatform: formData.virtualPlatform,
            }
          : formData.tourType === 'self-guided'
            ? {
                hostAction: tourTypeCopy['self-guided'].hostAction,
                contactMethod: formData.selfGuidedContactMethod,
                contactValue: formData.selfGuidedContactValue.trim(),
                arrivalWindowMinutes: formData.selfGuidedArrivalWindow,
                governmentIdReady: formData.selfGuidedGovernmentIdReady,
                accessNotes: formData.selfGuidedAccessNotes.trim() || undefined,
              }
            : {
                hostAction: tourTypeCopy['in-person'].hostAction,
              };
      const checkoutTime = new Date(scheduledDateTime.getTime() + formData.duration * 60 * 1000);
      const bookingPayload = {
        property_id: property.id,
        user_id: currentUser.id,
        owner_id: property.ownerId,
        check_in: scheduledDateTime.toISOString(),
        check_out: checkoutTime.toISOString(),
        guests: formData.attendees.length,
        total_price: 0,
        currency: property.pricing?.currency || property.currency || 'GHS',
        payment_status: 'pending' as const,
        payment_method: 'tour_request',
        note: JSON.stringify({
          kind: 'tour_schedule',
          tourType: formData.tourType,
          notes: formData.notes,
          attendees: formData.attendees,
          workflow,
          reminderSettings: {
            enabled: formData.enableReminders,
            locationRadius: formData.locationRadius,
            reminderTimes: formData.reminderTimes,
          },
        }),
      };

      const { data, error } = await bookingService.createBooking(bookingPayload);
      if (error || !data) {
        throw error || new Error('Unable to save the tour request.');
      }

      const tour: PropertyTour = {
        id: data.id,
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
        status: formData.tourType === 'in-person' ? 'scheduled' : 'pending_confirmation',
        workflow,
        reminderSettings: {
          enabled: formData.enableReminders,
          locationRadius: formData.locationRadius,
          reminderTimes: formData.reminderTimes,
          notificationTypes: ['push'],
        },
        attendees: formData.attendees.filter((attendee) => attendee.name && attendee.email),
        notes: formData.notes,
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
      };

      if (formData.enableReminders) {
        await scheduleDeviceReminders(tour);
      }

      toast.success(
        formData.tourType === 'in-person'
          ? 'Tour scheduled successfully. Device reminders are ready.'
          : 'Tour request sent. The host still needs to confirm the final access details.',
      );
      onTourScheduled(tour);
      onBack();
    } catch (error) {
      console.error('Error scheduling tour:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule tour.');
    } finally {
      setIsScheduling(false);
    }
  };

  useEffect(() => {
    if (
      formData.enableReminders &&
      locationError &&
      !bannerShownRef.current
    ) {
      bannerShownRef.current = true;
      toast.info('Location access is unavailable, so only time-based reminders will be scheduled.');
    }
  }, [formData.enableReminders, locationError]);

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        className="sticky top-0 z-50 border-b border-border bg-card/80 p-4 backdrop-blur-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Schedule Property Tour</h1>
              <p className="text-sm text-muted-foreground">
                Book a tour with real device reminders
              </p>
            </div>
          </div>

          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            <CalendarDays className="mr-1 h-4 w-4" />
            Tour Scheduling
          </Badge>
        </div>
      </motion.header>

      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {property.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="aspect-video w-32 overflow-hidden rounded-lg bg-muted">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground">{propertyLocation}</p>
                  <p className="text-lg font-semibold">${propertyPrice.toLocaleString()}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                    {property.bedrooms ? <span>{property.bedrooms} beds</span> : null}
                    {property.bathrooms ? <span>{property.bathrooms} baths</span> : null}
                    <span>{property.area} sqft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Tour Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tour-date">Tour Date</Label>
                  <Input
                    id="tour-date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={(event) => handleFormChange('date', event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tour-time">Tour Time</Label>
                  <Select
                    value={formData.time}
                    onValueChange={(value) => handleFormChange('time', value)}
                  >
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tour-type">Tour Type</Label>
                  <Select
                    value={formData.tourType}
                    onValueChange={(value) => handleFormChange('tourType', value as TourType)}
                  >
                    <SelectTrigger id="tour-type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person">In-person tour</SelectItem>
                      <SelectItem value="virtual">Virtual tour</SelectItem>
                      <SelectItem value="self-guided">Self-guided tour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tourTypeCopy[formData.tourType].description}
                  </p>
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={String(formData.duration)}
                    onValueChange={(value) => handleFormChange('duration', Number.parseInt(value, 10))}
                  >
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

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-sm font-semibold">
                  {tourTypeCopy[formData.tourType].label} host workflow
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tourTypeCopy[formData.tourType].hostAction}
                </p>
              </div>

              {formData.tourType === 'virtual' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="virtual-platform">Preferred Platform</Label>
                    <Select
                      value={formData.virtualPlatform}
                      onValueChange={(value) =>
                        handleFormChange('virtualPlatform', value as VirtualPlatform)
                      }
                    >
                      <SelectTrigger id="virtual-platform" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google-meet">Google Meet</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="whatsapp-video">WhatsApp video</SelectItem>
                        <SelectItem value="phone-call">Phone call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="virtual-contact-method">Host Contact Method</Label>
                    <Select
                      value={formData.virtualContactMethod}
                      onValueChange={(value) =>
                        handleFormChange('virtualContactMethod', value as ContactMethod)
                      }
                    >
                      <SelectTrigger id="virtual-contact-method" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="virtual-contact-value">Contact Detail</Label>
                    <Input
                      id="virtual-contact-value"
                      value={formData.virtualContactValue}
                      onChange={(event) =>
                        handleFormChange('virtualContactValue', event.target.value)
                      }
                      placeholder="Where the host should send the link"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : null}

              {formData.tourType === 'self-guided' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="self-guided-window">Arrival Window</Label>
                      <Select
                        value={String(formData.selfGuidedArrivalWindow)}
                        onValueChange={(value) =>
                          handleFormChange('selfGuidedArrivalWindow', Number.parseInt(value, 10))
                        }
                      >
                        <SelectTrigger id="self-guided-window" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minute window</SelectItem>
                          <SelectItem value="30">30 minute window</SelectItem>
                          <SelectItem value="45">45 minute window</SelectItem>
                          <SelectItem value="60">1 hour window</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="self-guided-contact-method">Access Contact Method</Label>
                      <Select
                        value={formData.selfGuidedContactMethod}
                        onValueChange={(value) =>
                          handleFormChange('selfGuidedContactMethod', value as ContactMethod)
                        }
                      >
                        <SelectTrigger id="self-guided-contact-method" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="self-guided-contact-value">Contact Detail</Label>
                      <Input
                        id="self-guided-contact-value"
                        value={formData.selfGuidedContactValue}
                        onChange={(event) =>
                          handleFormChange('selfGuidedContactValue', event.target.value)
                        }
                        placeholder="Where the host should send access instructions"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="air-surface flex items-start justify-between gap-4 rounded-lg px-4 py-4">
                    <div>
                      <div className="text-sm font-semibold">Government ID ready</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Self-guided access requires the guest to be ready for an identity check.
                      </p>
                    </div>
                    <Switch
                      checked={formData.selfGuidedGovernmentIdReady}
                      onCheckedChange={(checked) =>
                        handleFormChange('selfGuidedGovernmentIdReady', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="self-guided-access-notes">Access Notes</Label>
                    <Textarea
                      id="self-guided-access-notes"
                      rows={3}
                      value={formData.selfGuidedAccessNotes}
                      onChange={(event) =>
                        handleFormChange('selfGuidedAccessNotes', event.target.value)
                      }
                      placeholder="Parking, gate, stairwell, or safety notes for the host to consider..."
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label>Tour Attendees</Label>
                  <Button variant="outline" size="sm" onClick={addAttendee}>
                    <User className="mr-1 h-4 w-4" />
                    Add Person
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.attendees.map((attendee, index) => (
                    <div
                      key={`${attendee.email}-${index}`}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-4"
                    >
                      <Input
                        placeholder="Full Name"
                        value={attendee.name}
                        onChange={(event) =>
                          handleAttendeeChange(index, 'name', event.target.value)
                        }
                      />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={attendee.email}
                        onChange={(event) =>
                          handleAttendeeChange(index, 'email', event.target.value)
                        }
                      />
                      <Input
                        placeholder="Phone (optional)"
                        value={attendee.phone || ''}
                        onChange={(event) =>
                          handleAttendeeChange(index, 'phone', event.target.value)
                        }
                      />
                      <div className="flex items-center justify-end">
                        {index > 0 ? (
                          <Button variant="outline" size="sm" onClick={() => removeAttendee(index)}>
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder={tourTypeCopy[formData.tourType].notesPlaceholder}
                  value={formData.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Device Reminders
                <Badge variant="secondary" className="ml-2">
                  <Zap className="mr-1 h-3 w-3" />
                  Native
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-reminders">Enable Device Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    {tourTypeCopy[formData.tourType].reminderDescription}
                  </p>
                </div>
                <Switch
                  id="enable-reminders"
                  checked={formData.enableReminders}
                  onCheckedChange={(checked) => handleFormChange('enableReminders', checked)}
                />
              </div>

              {formData.enableReminders ? (
                <>
                  {formData.tourType !== 'virtual' ? (
                    <div>
                      <Label htmlFor="location-radius">Nearby Reminder Radius</Label>
                      <Select
                        value={String(formData.locationRadius)}
                        onValueChange={(value) =>
                          handleFormChange('locationRadius', Number.parseInt(value, 10))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="200">200m - Very close</SelectItem>
                          <SelectItem value="500">500m - Walking distance</SelectItem>
                          <SelectItem value="1000">1km - Nearby by car</SelectItem>
                          <SelectItem value="2000">2km - Wider area</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tourTypeCopy[formData.tourType].nearbyDescription}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {tourTypeCopy.virtual.nearbyDescription}
                    </div>
                  )}

                  <div>
                    <Label>Reminder Schedule</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {[5, 10, 15, 30, 60].map((minutes) => (
                        <label
                          key={minutes}
                          className="flex items-center space-x-2 rounded-lg border border-border p-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.reminderTimes.includes(minutes)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                handleFormChange('reminderTimes', [
                                  ...formData.reminderTimes,
                                  minutes,
                                ]);
                              } else {
                                handleFormChange(
                                  'reminderTimes',
                                  formData.reminderTimes.filter(
                                    (value) => value !== minutes,
                                  ),
                                );
                              }
                            }}
                          />
                          <span>{minutes}m before</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Notification channel: device reminders</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      SMS and email are not exposed here until backend delivery channels are wired in.
                    </p>
                  </div>

                  {formData.tourType === 'virtual' ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Time-based reminders ready
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                        The host will still need to confirm the final meeting link or call details.
                      </p>
                    </div>
                  ) : currentLocation ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Location access granted
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                        We can evaluate whether you are already near the property when the tour is
                        created.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Location access unavailable
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                        We will still schedule time-based device reminders.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

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
            disabled={isScheduling || !formData.date || !formData.time}
            onClick={() => {
              void handleScheduleTour();
            }}
            className="min-w-[150px]"
          >
            {isScheduling ? (
              <>
                <Timer className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {formData.tourType === 'in-person' ? 'Schedule Tour' : 'Send Tour Request'}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
