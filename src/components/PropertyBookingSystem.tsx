/**
 * PropertyBookingSystem - Comprehensive booking management
 * 
 * Features:
 * - Date selection with availability calendar
 * - Guest count and pricing calculation
 * - Booking flow with payment integration
 * - Host communication and special requests
 * - Booking confirmation and management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calendar } from './ui/calendar';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Calendar as CalendarIcon,
  Users,
  CreditCard,
  MessageSquare,
  Shield,
  Star,
  MapPin,
  Clock,
  Check,
  AlertCircle,
  Info,
  Plus,
  Minus,
  Heart,
  Share,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  images: string[];
  price: number;
  currency: string;
  type: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    rating: number;
    responseTime: number;
  };
  availability: {
    calendar: { [key: string]: boolean };
    checkInTime: string;
    checkOutTime: string;
    minimumStay: number;
    maximumStay: number;
  };
  pricing: {
    basePrice: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;
    cleaningFee?: number;
    securityDeposit?: number;
    extraGuestFee?: number;
    maxGuests: number;
  };
  policies: {
    cancellation: 'flexible' | 'moderate' | 'strict';
    houseRules: string[];
  };
  ratings: {
    overall: number;
    reviews: number;
  };
  instantBook: boolean;
  amenities: string[];
  features: string[];
}

interface BookingSystemProps {
  property: Property;
  onBookingComplete: (booking: any) => void;
  onClose: () => void;
  className?: string;
}

interface BookingData {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  specialRequests: string;
  totalPrice: number;
  breakdown: {
    basePrice: number;
    nights: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    discount: number;
  };
}

export const PropertyBookingSystem: React.FC<BookingSystemProps> = ({
  property,
  onBookingComplete,
  onClose,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [bookingData, setBookingData] = useState<BookingData>({
    checkIn: null,
    checkOut: null,
    guests: 1,
    specialRequests: '',
    totalPrice: 0,
    breakdown: {
      basePrice: 0,
      nights: 0,
      cleaningFee: property.pricing?.cleaningFee || 0,
      serviceFee: 0,
      taxes: 0,
      discount: 0
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  // Calculate pricing whenever booking data changes
  useEffect(() => {
    if (bookingData.checkIn && bookingData.checkOut) {
      const nights = Math.ceil(
        (bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const basePrice = (property.pricing?.basePrice || property.price) * nights;
      const extraGuestFee = bookingData.guests > 1 
        ? (bookingData.guests - 1) * (property.pricing?.extraGuestFee || 0)
        : 0;
      const serviceFee = Math.round(basePrice * 0.14); // 14% service fee
      const taxes = Math.round(basePrice * 0.12); // 12% taxes
      
      let discount = 0;
      if (nights >= 28 && property.pricing?.monthlyDiscount) {
        discount = Math.round(basePrice * (property.pricing.monthlyDiscount / 100));
      } else if (nights >= 7 && property.pricing?.weeklyDiscount) {
        discount = Math.round(basePrice * (property.pricing.weeklyDiscount / 100));
      }

      const totalPrice = basePrice + extraGuestFee + bookingData.breakdown.cleaningFee + serviceFee + taxes - discount;

      setBookingData(prev => ({
        ...prev,
        totalPrice,
        breakdown: {
          ...prev.breakdown,
          basePrice: basePrice + extraGuestFee,
          nights,
          serviceFee,
          taxes,
          discount
        }
      }));
    }
  }, [bookingData.checkIn, bookingData.checkOut, bookingData.guests, property.pricing]);

  const handleDateSelect = useCallback((date: Date) => {
    if (selectingCheckIn) {
      setBookingData(prev => ({ ...prev, checkIn: date, checkOut: null }));
      setSelectingCheckIn(false);
    } else {
      if (date > bookingData.checkIn!) {
        setBookingData(prev => ({ ...prev, checkOut: date }));
        setShowCalendar(false);
        setSelectingCheckIn(true);
      }
    }
  }, [selectingCheckIn, bookingData.checkIn]);

  const handleGuestChange = useCallback((change: number) => {
    setBookingData(prev => ({
      ...prev,
      guests: Math.max(1, Math.min(property.pricing?.maxGuests || 8, prev.guests + change))
    }));
  }, [property.pricing?.maxGuests]);

  const handleBooking = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simulate booking process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const booking = {
        id: `booking_${Date.now()}`,
        propertyId: property.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        totalPrice: bookingData.totalPrice,
        specialRequests: bookingData.specialRequests,
        status: property.instantBook ? 'confirmed' : 'pending',
        createdAt: new Date()
      };
      
      onBookingComplete(booking);
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingData, property, onBookingComplete]);

  const canProceed = bookingData.checkIn && bookingData.checkOut && bookingData.guests >= 1;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentStep === 'details' && 'Book Your Stay'}
                {currentStep === 'payment' && 'Payment Details'}
                {currentStep === 'confirmation' && 'Booking Confirmed'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{property.title}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Property Preview */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div className="aspect-video rounded-xl overflow-hidden">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{property.title}</h3>
                  <Badge variant="outline" className="capitalize">{property.type}</Badge>
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={property.owner.avatar} />
                      <AvatarFallback>{property.owner.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Hosted by {property.owner.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          {property.owner.rating}
                        </div>
                        {property.owner.verified && (
                          <div className="flex items-center">
                            <Shield className="w-3 h-3 text-green-500 mr-1" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      Responds in ~{property.owner.responseTime} min
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">What's included</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {property.amenities.slice(0, 6).map((amenity) => (
                      <div key={amenity} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-3 h-3 text-green-500 mr-2" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                {property.policies.cancellation && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="flex items-center text-sm text-green-800 dark:text-green-200">
                      <Info className="w-4 h-4 mr-2" />
                      {property.policies.cancellation === 'flexible' && 'Free cancellation for 48 hours'}
                      {property.policies.cancellation === 'moderate' && 'Free cancellation before 5 days'}
                      {property.policies.cancellation === 'strict' && 'Non-refundable'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="w-1/2 p-6">
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {currentStep === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Pricing */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-baseline justify-between mb-4">
                          <div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {property.currency} {property.pricing.basePrice}
                            </span>
                            <span className="text-gray-500 ml-1">per night</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            {property.ratings.overall} ({property.ratings.reviews})
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Date Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-16 flex-col items-start justify-center"
                        onClick={() => {
                          setShowCalendar(true);
                          setSelectingCheckIn(true);
                        }}
                      >
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Check-in</span>
                        <span className="text-sm font-medium">
                          {bookingData.checkIn ? bookingData.checkIn.toLocaleDateString() : 'Select date'}
                        </span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-16 flex-col items-start justify-center"
                        onClick={() => {
                          setShowCalendar(true);
                          setSelectingCheckIn(false);
                        }}
                        disabled={!bookingData.checkIn}
                      >
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Check-out</span>
                        <span className="text-sm font-medium">
                          {bookingData.checkOut ? bookingData.checkOut.toLocaleDateString() : 'Select date'}
                        </span>
                      </Button>
                    </div>

                    {/* Guest Selection */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Guests</span>
                          <p className="text-xs text-gray-500">Maximum {property.pricing.maxGuests} guests</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGuestChange(-1)}
                            disabled={bookingData.guests <= 1}
                            className="h-8 w-8 rounded-full p-0"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{bookingData.guests}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGuestChange(1)}
                            disabled={bookingData.guests >= property.pricing.maxGuests}
                            className="h-8 w-8 rounded-full p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Special Requests */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Special requests (optional)
                      </label>
                      <Textarea
                        placeholder="Any special requests or questions for the host?"
                        value={bookingData.specialRequests}
                        onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                        className="min-h-20"
                      />
                    </div>

                    {/* Price Breakdown */}
                    {canProceed && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">
                              {property.currency} {property.pricing.basePrice} x {bookingData.breakdown.nights} nights
                            </span>
                            <span className="text-sm font-medium">
                              {property.currency} {bookingData.breakdown.basePrice}
                            </span>
                          </div>
                          
                          {bookingData.breakdown.cleaningFee > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Cleaning fee</span>
                              <span className="text-sm font-medium">
                                {property.currency} {bookingData.breakdown.cleaningFee}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Service fee</span>
                            <span className="text-sm font-medium">
                              {property.currency} {bookingData.breakdown.serviceFee}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Taxes</span>
                            <span className="text-sm font-medium">
                              {property.currency} {bookingData.breakdown.taxes}
                            </span>
                          </div>
                          
                          {bookingData.breakdown.discount > 0 && (
                            <div className="flex items-center justify-between text-green-600">
                              <span className="text-sm">Discount</span>
                              <span className="text-sm font-medium">
                                -{property.currency} {bookingData.breakdown.discount}
                              </span>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between font-medium">
                            <span>Total</span>
                            <span>{property.currency} {bookingData.totalPrice}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => setCurrentStep('payment')}
                      disabled={!canProceed}
                      className="w-full h-12"
                      size="lg"
                    >
                      {property.instantBook ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Reserve Instantly
                        </>
                      ) : (
                        'Request to Book'
                      )}
                    </Button>

                    {!property.instantBook && (
                      <p className="text-xs text-gray-500 text-center">
                        You won't be charged yet. The host will review your request.
                      </p>
                    )}
                  </motion.div>
                )}

                {currentStep === 'payment' && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Secure Payment
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Complete your booking with our secure payment system
                      </p>
                    </div>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Total Amount</span>
                            <span className="text-xl font-bold text-blue-600">
                              {property.currency} {bookingData.totalPrice}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Check-in: {bookingData.checkIn?.toLocaleDateString()} • 
                            Check-out: {bookingData.checkOut?.toLocaleDateString()} • 
                            {bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep('details')}
                        className="h-12"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleBooking}
                        disabled={isLoading}
                        className="h-12"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            Complete Booking
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'confirmation' && (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Booking Confirmed!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Your reservation has been confirmed. You'll receive a confirmation email shortly.
                      </p>
                    </div>

                    <Card>
                      <CardContent className="p-4 text-left">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Property</span>
                            <span className="text-sm font-medium">{property.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Check-in</span>
                            <span className="text-sm font-medium">{bookingData.checkIn?.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Check-out</span>
                            <span className="text-sm font-medium">{bookingData.checkOut?.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Guests</span>
                            <span className="text-sm font-medium">{bookingData.guests}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>Total Paid</span>
                            <span>{property.currency} {bookingData.totalPrice}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-12">
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Message Host
                      </Button>
                      <Button onClick={onClose} className="h-12">
                        Done
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Calendar Modal */}
              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">
                          Select {selectingCheckIn ? 'check-in' : 'check-out'} date
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCalendar(false)}
                        >
                          ×
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectingCheckIn ? bookingData.checkIn : bookingData.checkOut}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyBookingSystem;