import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { CreditCard, Smartphone, Lock, Check, X, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

interface PaymentData {
  amount: number;
  email: string;
  propertyTitle: string;
  bookingId: string;
  duration: string;
  dueDate: string;
}

interface PaystackPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentData;
  onPaymentSuccess: (reference: string, method: string) => void;
}

export function PaystackPayment({ isOpen, onClose, paymentData, onPaymentSuccess }: PaystackPaymentProps) {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'details' | 'processing' | 'success' | 'error'>('select');

  // Card payment form
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  // Mobile money form
  const [mobileData, setMobileData] = useState({
    provider: '',
    phoneNumber: ''
  });

  const mobileProviders = [
    { value: 'mtn', label: 'MTN Mobile Money', code: '+233' },
    { value: 'vodafone', label: 'Vodafone Cash', code: '+233' },
    { value: 'airteltigo', label: 'AirtelTigo Money', code: '+233' }
  ];

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 3) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCardSubmit = async () => {
    if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
      toast.error('Please fill in all card details');
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    // Simulate Paystack API call
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate random success/failure for demo
      const isSuccess = Math.random() > 0.2; // 80% success rate
      
      if (isSuccess) {
        const reference = `pay_${Date.now()}_card`;
        setPaymentStep('success');
        setTimeout(() => {
          onPaymentSuccess(reference, 'card');
          onClose();
          setPaymentStep('select');
        }, 2000);
      } else {
        setPaymentStep('error');
      }
    } catch (error) {
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobileSubmit = async () => {
    if (!mobileData.provider || !mobileData.phoneNumber) {
      toast.error('Please select provider and enter phone number');
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    // Simulate Paystack Mobile Money API call
    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const isSuccess = Math.random() > 0.15; // 85% success rate
      
      if (isSuccess) {
        const reference = `pay_${Date.now()}_mobile`;
        setPaymentStep('success');
        setTimeout(() => {
          onPaymentSuccess(reference, 'mobile_money');
          onClose();
          setPaymentStep('select');
        }, 2000);
      } else {
        setPaymentStep('error');
      }
    } catch (error) {
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentStep('select');
    setCardData({ number: '', expiry: '', cvv: '', name: '' });
    setMobileData({ provider: '', phoneNumber: '' });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span>Complete Payment</span>
          </DialogTitle>
          <DialogDescription>
            Secure payment for {paymentData.propertyTitle} rental - ${paymentData.amount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {paymentStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Payment Summary */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Property</span>
                    <span className="text-sm font-medium">{paymentData.propertyTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-sm font-medium">{paymentData.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <span className="text-sm font-medium">{paymentData.dueDate}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-lg font-bold text-green-600">
                      ${paymentData.amount.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Tabs value={selectedMethod} onValueChange={(value: any) => setSelectedMethod(value)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="card" className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile Money</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="Full name"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="expiry">Expiry</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={cardData.expiry}
                          onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={cardData.cvv}
                          onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCardSubmit} className="w-full">
                    <Lock className="w-4 h-4 mr-2" />
                    Pay ${paymentData.amount.toLocaleString()}
                  </Button>
                </TabsContent>

                <TabsContent value="mobile" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="provider">Mobile Money Provider</Label>
                      <Select value={mobileData.provider} onValueChange={(value) => setMobileData({ ...mobileData, provider: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {mobileProviders.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm">
                          {mobileProviders.find(p => p.value === mobileData.provider)?.code || '+233'}
                        </div>
                        <Input
                          id="phoneNumber"
                          placeholder="24 123 4567"
                          value={mobileData.phoneNumber}
                          onChange={(e) => setMobileData({ ...mobileData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleMobileSubmit} className="w-full">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Pay ${paymentData.amount.toLocaleString()}
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Secured by Paystack</span>
              </div>
            </motion.div>
          )}

          {paymentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center space-y-4 py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
              />
              <div className="text-center">
                <h3 className="font-medium">Processing Payment</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedMethod === 'mobile' 
                    ? 'Please check your phone for the payment prompt'
                    : 'Please wait while we process your payment'
                  }
                </p>
              </div>
            </motion.div>
          )}

          {paymentStep === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center space-y-4 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
              <div className="text-center">
                <h3 className="font-medium text-green-600">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment has been processed successfully
                </p>
              </div>
            </motion.div>
          )}

          {paymentStep === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center space-y-4 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
                className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"
              >
                <X className="w-8 h-8 text-red-600" />
              </motion.div>
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-medium text-red-600">Payment Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    There was an issue processing your payment
                  </p>
                </div>
                <Button onClick={() => setPaymentStep('select')} variant="outline">
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
