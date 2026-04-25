/**
 * PropertyHub - Property Payment Flow Component
 * 
 * Comprehensive payment flow for property-related transactions including:
 * - Property purchases with down payments and financing
 * - Rental payments and security deposits  
 * - Booking fees for property tours and viewings
 * - Payment plan setup and installment processing
 * - Multi-step checkout with payment method selection
 * - Real-time payment status updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { 
  Calendar,
  CreditCard, 
  DollarSign, 
  Home, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Info,
  Calculator,
  Clock,
  FileText,
  Lock
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';

// Services
import { 
  paymentService, 
  PaymentIntent, 
  PaymentTransaction, 
  PaymentMethod,
  PaymentPlan,
  PaymentType,
  PaymentFees
} from '../../utils/paymentService';

// Types
export interface Property {
  id: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  location: string;
  images: string[];
  hostId: string;
  hostName: string;
}

export interface PaymentFlowProps {
  property: Property;
  paymentType: PaymentType;
  amount?: number; // Override amount for bookings/deposits
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: PaymentTransaction) => void;
  customerId: string;
  customerEmail: string;
  metadata?: Record<string, any>;
}

type PaymentStep = 'details' | 'plan' | 'method' | 'review' | 'processing' | 'success' | 'error';

export function PropertyPaymentFlow({
  property,
  paymentType,
  amount,
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerEmail,
  metadata = {}
}: PaymentFlowProps) {
  
  // State management
  const [currentStep, setCurrentStep] = useState<PaymentStep>('details');
  const [paymentAmount, setPaymentAmount] = useState<number>(amount || property.price);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [savePaymentMethod, setSavePaymentMethod] = useState<boolean>(true);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    notes: '',
    agreeTerms: false,
    agreeRefund: false,
  });

  // Load payment methods when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
      resetFlow();
    }
  }, [isOpen, customerId]);

  // Reset flow state
  const resetFlow = () => {
    setCurrentStep('details');
    setSelectedPlan(null);
    setSelectedMethodId('');
    setPaymentIntent(null);
    setTransaction(null);
    setError(null);
    setFormData({
      notes: '',
      agreeTerms: false,
      agreeRefund: false,
    });
  };

  // Load available payment methods
  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getPaymentMethods(customerId);
      setPaymentMethods(methods);
      
      // Select default method if available
      const defaultMethod = methods.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      }
    } catch (error) {
      console.error('❌ Failed to load payment methods:', error);
    }
  };

  // Calculate payment fees
  const fees = useMemo<PaymentFees>(() => {
    return paymentService.calculateFees(paymentAmount, property.currency);
  }, [paymentAmount, property.currency]);

  // Generate payment plans based on payment type
  const availablePaymentPlans = useMemo<PaymentPlan[]>(() => {
    const plans: PaymentPlan[] = [];
    
    // Full payment option
    plans.push({
      type: 'full',
      totalAmount: paymentAmount,
      downPayment: paymentAmount,
      installments: []
    });

    // For property purchases, offer installment plans
    if (paymentType === 'property_purchase' && paymentAmount >= 1000000) {
      
      // 3-month plan
      const threeMonthPlan: PaymentPlan = {
        type: 'installment',
        totalAmount: paymentAmount,
        downPayment: paymentAmount * 0.3, // 30% down
        installments: []
      };
      
      const remainingAmount = paymentAmount * 0.7;
      const monthlyAmount = remainingAmount / 3;
      
      for (let i = 1; i <= 3; i++) {
        threeMonthPlan.installments!.push({
          number: i,
          amount: monthlyAmount,
          dueDate: addMonths(new Date(), i).toISOString(),
          status: 'pending'
        });
      }
      plans.push(threeMonthPlan);

      // 6-month plan
      const sixMonthPlan: PaymentPlan = {
        type: 'installment',
        totalAmount: paymentAmount,
        downPayment: paymentAmount * 0.2, // 20% down
        installments: []
      };
      
      const sixMonthRemaining = paymentAmount * 0.8;
      const sixMonthlyAmount = sixMonthRemaining / 6;
      
      for (let i = 1; i <= 6; i++) {
        sixMonthPlan.installments!.push({
          number: i,
          amount: sixMonthlyAmount,
          dueDate: addMonths(new Date(), i).toISOString(),
          status: 'pending'
        });
      }
      plans.push(sixMonthPlan);
    }

    return plans;
  }, [paymentAmount, paymentType]);

  // Handle step navigation
  const handleNext = () => {
    switch (currentStep) {
      case 'details':
        setCurrentStep('plan');
        break;
      case 'plan':
        if (!selectedPlan) {
          toast.error('Please select a payment plan');
          return;
        }
        setCurrentStep('method');
        break;
      case 'method':
        if (!selectedMethodId) {
          toast.error('Please select a payment method');
          return;
        }
        setCurrentStep('review');
        break;
      case 'review':
        if (!formData.agreeTerms) {
          toast.error('Please agree to the terms and conditions');
          return;
        }
        handlePayment();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'plan':
        setCurrentStep('details');
        break;
      case 'method':
        setCurrentStep('plan');
        break;
      case 'review':
        setCurrentStep('method');
        break;
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (!selectedPlan) return;

    try {
      setLoading(true);
      setCurrentStep('processing');

      // Create payment intent
      const intent = await paymentService.createPaymentIntent({
        amount: selectedPlan.downPayment,
        currency: property.currency,
        type: paymentType,
        customerId,
        customerEmail,
        propertyId: property.id,
        description: `${paymentType.replace('_', ' ').toUpperCase()} - ${property.title}`,
        paymentPlan: selectedPlan,
        metadata: {
          ...metadata,
          propertyId: property.id,
          propertyTitle: property.title,
          hostId: property.hostId,
          paymentPlan: selectedPlan,
          notes: formData.notes
        }
      });

      setPaymentIntent(intent);

      // Process payment
      const completedTransaction = await paymentService.processPayment(intent);
      
      setTransaction(completedTransaction);
      setCurrentStep('success');
      
      toast.success('Payment completed successfully!');
      onSuccess(completedTransaction);
      
    } catch (error) {
      console.error('❌ Payment failed:', error);
      setError(error instanceof Error ? error.message : 'Payment failed');
      setCurrentStep('error');
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: property.currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get payment type title
  const getPaymentTypeTitle = () => {
    switch (paymentType) {
      case 'property_purchase': return 'Purchase Property';
      case 'property_deposit': return 'Property Deposit';
      case 'rental_payment': return 'Rental Payment';
      case 'rental_deposit': return 'Security Deposit';
      case 'booking_fee': return 'Booking Fee';
      case 'tour_fee': return 'Property Tour';
      default: return 'Payment';
    }
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = ['details', 'plan', 'method', 'review'];
    const currentStepIndex = steps.indexOf(currentStep);

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index <= currentStepIndex 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {index < currentStepIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-px ${
                index < currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{getPaymentTypeTitle()}</h3>
              <p className="text-muted-foreground">Review property and payment details</p>
            </div>

            {/* Property Details */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Home className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{property.title}</h4>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                    <p className="text-sm text-muted-foreground">Host: {property.hostName}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{property.type}</Badge>
                      <Badge variant="outline">{formatCurrency(property.price)}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Amount */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <Label htmlFor="amount">Payment Amount</Label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      disabled={!amount} // Only allow editing if amount wasn't provided
                      className="text-lg font-semibold"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {paymentType === 'property_purchase' 
                      ? 'Full property price or down payment amount'
                      : 'Amount to be paid'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
        );

      case 'plan':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Choose Payment Plan</h3>
              <p className="text-muted-foreground">Select how you'd like to pay</p>
            </div>

            <RadioGroup 
              value={selectedPlan?.type || ''} 
              onValueChange={(value) => {
                const plan = availablePaymentPlans.find(p => p.type === value);
                setSelectedPlan(plan || null);
              }}
              className="space-y-4"
            >
              {availablePaymentPlans.map((plan, index) => (
                <Card key={index} className={`cursor-pointer transition-colors ${
                  selectedPlan?.type === plan.type ? 'ring-2 ring-primary' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <RadioGroupItem value={plan.type} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            {plan.type === 'full' && 'Pay in Full'}
                            {plan.type === 'installment' && `${plan.installments?.length}-Month Plan`}
                          </h4>
                          <Badge variant="outline">
                            {formatCurrency(plan.downPayment)} now
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          {plan.type === 'full' ? (
                            <p>Pay the full amount immediately</p>
                          ) : (
                            <>
                              <p>Down payment: {formatCurrency(plan.downPayment)} ({((plan.downPayment / plan.totalAmount) * 100).toFixed(0)}%)</p>
                              <p>Remaining: {plan.installments?.length} monthly payments of {formatCurrency(plan.installments?.[0]?.amount || 0)}</p>
                            </>
                          )}
                        </div>

                        {plan.type === 'installment' && plan.installments && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium">Payment Schedule:</p>
                            {plan.installments.slice(0, 3).map((installment, i) => (
                              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                                <span>Payment {installment.number}</span>
                                <span>{format(new Date(installment.dueDate), 'MMM d, yyyy')}</span>
                                <span>{formatCurrency(installment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>

            {selectedPlan && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Calculator className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">Payment Summary</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Amount due now:</span>
                      <span className="font-medium">{formatCurrency(selectedPlan.downPayment)}</span>
                    </div>
                    {selectedPlan.type === 'installment' && (
                      <div className="flex justify-between">
                        <span>Future payments:</span>
                        <span className="font-medium">{formatCurrency(selectedPlan.totalAmount - selectedPlan.downPayment)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedPlan.totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'method':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              <p className="text-muted-foreground">Choose how you'd like to pay</p>
            </div>

            <RadioGroup 
              value={selectedMethodId} 
              onValueChange={setSelectedMethodId}
              className="space-y-4"
            >
              {paymentMethods.map((method) => (
                <Card key={method.id} className={`cursor-pointer transition-colors ${
                  selectedMethodId === method.id ? 'ring-2 ring-primary' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value={method.id} />
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{method.brand} •••• {method.last4}</p>
                          {method.isDefault && <Badge variant="secondary">Default</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* New payment method option */}
              <Card className={`cursor-pointer transition-colors ${
                selectedMethodId === 'new' ? 'ring-2 ring-primary' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value="new" />
                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Add New Payment Method</p>
                      <p className="text-sm text-muted-foreground">Enter card details during payment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>

            {selectedMethodId && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-method"
                    checked={savePaymentMethod}
                    onCheckedChange={(checked) => setSavePaymentMethod(checked as boolean)}
                  />
                  <Label htmlFor="save-method" className="text-sm">
                    Save payment method for future use
                  </Label>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium">Secure Payment</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your payment information is encrypted and secure. We use industry-standard SSL encryption.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case 'review':
        if (!selectedPlan) return null;

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Review & Confirm</h3>
              <p className="text-muted-foreground">Please review your payment details</p>
            </div>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Property:</span>
                  <span className="font-medium">{property.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment type:</span>
                  <span className="font-medium">{getPaymentTypeTitle()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment plan:</span>
                  <span className="font-medium">
                    {selectedPlan.type === 'full' ? 'Pay in Full' : `${selectedPlan.installments?.length}-Month Plan`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount due now:</span>
                  <span className="font-medium">{formatCurrency(selectedPlan.downPayment)}</span>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedPlan.downPayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform fee:</span>
                    <span>{formatCurrency(fees.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment processing:</span>
                    <span>{formatCurrency(fees.paystackFee + fees.vatFee)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedPlan.downPayment + fees.totalFees)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Payment Method</p>
                      {selectedMethodId === 'new' ? (
                        <p className="text-sm text-muted-foreground">New payment method</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {paymentMethods.find(m => m.id === selectedMethodId)?.brand} ••••{' '}
                          {paymentMethods.find(m => m.id === selectedMethodId)?.last4}
                        </p>
                      )}
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agree-terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => setFormData({...formData, agreeTerms: checked as boolean})}
                />
                <Label htmlFor="agree-terms" className="text-sm leading-relaxed">
                  I agree to the <button className="text-primary hover:underline">Terms and Conditions</button> and{' '}
                  <button className="text-primary hover:underline">Privacy Policy</button>
                </Label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="agree-refund"
                  checked={formData.agreeRefund}
                  onCheckedChange={(checked) => setFormData({...formData, agreeRefund: checked as boolean})}
                />
                <Label htmlFor="agree-refund" className="text-sm leading-relaxed">
                  I understand the <button className="text-primary hover:underline">Refund Policy</button>
                </Label>
              </div>
            </div>

            {selectedPlan.type === 'installment' && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium">Payment Plan Notice</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By proceeding, you agree to the installment payment schedule. 
                    Future payments will be automatically charged to your selected payment method.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <div className="animate-spin">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Processing Payment</h3>
              <p className="text-muted-foreground">Please wait while we process your payment...</p>
            </div>
            <Progress value={undefined} className="w-full" />
            <p className="text-xs text-muted-foreground">
              Do not close this window or navigate away from this page.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
              <p className="text-muted-foreground">Your payment has been processed successfully.</p>
            </div>
            
            {transaction && (
              <Card>
                <CardContent className="p-4 text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Transaction ID:</span>
                      <span className="text-sm font-mono">{transaction.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Amount:</span>
                      <span className="text-sm font-medium">{formatCurrency(transaction.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Date:</span>
                      <span className="text-sm">{format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-600">Payment Failed</h3>
              <p className="text-muted-foreground">{error || 'An error occurred while processing your payment.'}</p>
            </div>
            
            <div className="space-y-3">
              <Button className="w-full" onClick={() => setCurrentStep('review')}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Home className="w-5 h-5" />
            <span>{getPaymentTypeTitle()}</span>
          </DialogTitle>
          <DialogDescription>
            Complete your payment for {property.title}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!['processing', 'success', 'error'].includes(currentStep) && renderStepIndicator()}
          {renderStepContent()}
        </div>

        {!['processing', 'success', 'error'].includes(currentStep) && (
          <DialogFooter className="flex justify-between">
            <div>
              {currentStep !== 'details' && (
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              {currentStep !== 'review' ? (
                <Button onClick={handleNext} disabled={loading}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={loading || !formData.agreeTerms}>
                  {loading ? 'Processing...' : `Pay ${formatCurrency((selectedPlan?.downPayment || 0) + fees.totalFees)}`}
                  <CreditCard className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}