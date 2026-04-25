import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { X, CreditCard, Smartphone, Calendar, DollarSign } from 'lucide-react';
import { PendingBooking, User, Booking } from '../types';
import { usePayment } from './PaymentProvider';
import { toast } from "sonner";

interface BookingPaymentProps {
  booking: PendingBooking;
  currentUser: User;
  onSuccess: (booking: Booking) => void;
  onCancel: () => void;
}

export function BookingPayment({ booking, currentUser, onSuccess, onCancel }: BookingPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    phoneNumber: ''
  });

  const { processPayment } = usePayment();

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const success = await processPayment(booking.property.price, paymentMethod);
      
      if (success) {
        const newBooking: Booking = {
          id: `booking_${Date.now()}`,
          propertyId: booking.property.id,
          userId: currentUser.id,
          hostId: booking.property.ownerId,
          propertyTitle: booking.property.title,
          propertyImage: booking.property.images[0],
          type: booking.action,
          amount: booking.property.price,
          totalAmount: booking.property.price,
          currency: booking.property.currency as any || 'GHS',
          startDate: new Date().toISOString().split('T')[0],
          endDate: booking.action === 'rent' ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0],
          status: 'active',
          paymentStatus: 'completed',
          paymentReference: `pay_${Date.now()}`,
          duration: booking.action === 'rent' ? '1 month' : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confirmationCode: `CONF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        };
        
        onSuccess(newBooking as any);
        toast.success('Payment successful! Property booked.');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      toast.error('Payment error. Please try again.');
    }
    
    setIsProcessing(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg"
        >
          <Card className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Complete Your Booking</CardTitle>
                  <CardDescription>Secure payment for {booking.property.title}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Booking Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <img
                    src={booking.property.images[0]}
                    alt={booking.property.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{booking.property.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {typeof booking.property.location === 'string' 
                        ? booking.property.location 
                        : `${booking.property.location.address || ''}, ${booking.property.location.city}, ${booking.property.location.region}`.replace(/^, /, '')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Action: {booking.action.charAt(0).toUpperCase() + booking.action.slice(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ${booking.property.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      className="w-full h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span>Credit Card</span>
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant={paymentMethod === 'mobile' ? 'default' : 'outline'}
                      className="w-full h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setPaymentMethod('mobile')}
                    >
                      <Smartphone className="h-6 w-6" />
                      <span>Mobile Money</span>
                    </Button>
                  </motion.div>
                </div>
              </div>

              <Separator />

              {/* Payment Form */}
              <div className="space-y-4">
                {paymentMethod === 'card' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Mobile Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+1 234 567 8900"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Payment Button */}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pay ${booking.property.price.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>

              {/* Security Notice */}
              <p className="text-xs text-muted-foreground text-center">
                🔒 Your payment information is secure and encrypted
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}