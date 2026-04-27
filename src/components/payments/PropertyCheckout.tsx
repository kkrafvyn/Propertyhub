import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Loader2,
  Shield,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentProvider } from '../../types/payment';
import type { Property, User as AppUser } from '../../types';
import { usePayment } from '../../hooks/usePayment';
import { getLocationLabel } from '../../utils/location';
import { formatPrice } from '../../utils/propertyFiltering';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';

type TransactionType = 'purchase' | 'rent' | 'lease' | 'booking';
type CheckoutStep = 'payment-method' | 'billing' | 'confirmation' | 'processing';

interface PropertyCheckoutProps {
  property: Property;
  currentUser: AppUser;
  transactionType: TransactionType;
  amount: number;
  onSuccess: (_transactionId: string) => void;
  onCancel: () => void;
  className?: string;
}

interface CheckoutFormData {
  provider: PaymentProvider;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
}

const mapTransactionType = (value: TransactionType) => {
  if (value === 'rent') return 'rent_payment' as const;
  return 'service_payment' as const;
};

export function PropertyCheckout({
  property,
  currentUser,
  transactionType,
  amount,
  onCancel,
  className = '',
}: PropertyCheckoutProps): React.ReactElement {
  const propertyLocation = getLocationLabel(property.location);
  const { initiatePayment, loading, error } = usePayment();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('payment-method');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentReference, setPaymentReference] = useState('');

  const [formData, setFormData] = useState<CheckoutFormData>({
    provider: 'paystack',
    firstName: currentUser.name?.split(' ')[0] || '',
    lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    acceptTerms: false,
    subscribeNewsletter: false,
  });

  const processingFee = amount * 0.015;
  const vatAmount = (amount + processingFee) * 0.075;
  const finalAmount = amount + processingFee + vatAmount;

  const stepProgress = useMemo(() => {
    if (currentStep === 'payment-method') return '33%';
    if (currentStep === 'billing') return '66%';
    return '100%';
  }, [currentStep]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) nextErrors.address = 'Address is required';
    if (!formData.city.trim()) nextErrors.city = 'City is required';
    if (!formData.state.trim()) nextErrors.state = 'State is required';
    if (!formData.acceptTerms) nextErrors.acceptTerms = 'You must accept the terms';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData((previous) => ({ ...previous, [field]: value }));

    if (errors[field]) {
      setErrors((previous) => {
        const nextErrors = { ...previous };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'payment-method') {
      setCurrentStep('billing');
      return;
    }

    if (currentStep === 'billing') {
      if (validateForm()) {
        setCurrentStep('confirmation');
      }
      return;
    }

    if (currentStep === 'confirmation') {
      void handlePayment();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'billing') {
      setCurrentStep('payment-method');
      return;
    }

    if (currentStep === 'confirmation') {
      setCurrentStep('billing');
    }
  };

  const handlePayment = async () => {
    try {
      setCurrentStep('processing');

      const result = await initiatePayment(
        formData.email,
        finalAmount,
        mapTransactionType(transactionType),
        formData.provider,
        {
          user_id: currentUser.id,
          property_id: property.id,
          property_title: property.title,
          property_transaction_type: transactionType,
          billing_name: `${formData.firstName} ${formData.lastName}`.trim(),
          billing_phone: formData.phone,
          billing_address: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
          },
          subscribe_newsletter: formData.subscribeNewsletter,
        },
      );

      sessionStorage.setItem(
        'paymentCallback',
        JSON.stringify({
          transactionId: result.transaction_id,
          reference: result.reference,
          provider: formData.provider,
        }),
      );

      setPaymentReference(result.reference);
      toast.success('Redirecting to secure checkout...');

      window.location.assign(result.authorization_url);
    } catch (paymentError) {
      console.error('Payment error:', paymentError);
      setCurrentStep('confirmation');
      toast.error(
        paymentError instanceof Error
          ? paymentError.message
          : 'Unable to initialize payment.',
      );
    }
  };

  const renderPaymentMethodStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Choose Payment Provider</h2>
        <p className="text-muted-foreground">
          Your payment details stay inside the provider&apos;s secure checkout flow.
        </p>
      </div>

      <RadioGroup
        value={formData.provider}
        onValueChange={(value: PaymentProvider) => handleInputChange('provider', value)}
        className="space-y-4"
      >
        <Card className="cursor-pointer transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <RadioGroupItem value="paystack" id="paystack" />
              <div className="flex flex-1 items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="paystack" className="cursor-pointer text-base font-medium">
                    Paystack
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Cards, bank transfer, and provider-supported wallet flows
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <RadioGroupItem value="flutterwave" id="flutterwave" />
              <div className="flex flex-1 items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <Label htmlFor="flutterwave" className="cursor-pointer text-base font-medium">
                    Flutterwave
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Regional cards and mobile-friendly hosted checkout
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNextStep} size="lg" className="min-w-32">
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderBillingField = (
    field: keyof CheckoutFormData,
    label: string,
    placeholder: string,
    type = 'text',
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type={type}
        value={String(formData[field] || '')}
        onChange={(event) => handleInputChange(field, event.target.value)}
        placeholder={placeholder}
        className={errors[field] ? 'border-red-500' : ''}
      />
      {errors[field] ? <p className="text-sm text-red-500">{errors[field]}</p> : null}
    </div>
  );

  const renderBillingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Billing Information</h2>
        <p className="text-muted-foreground">
          We use this to initialize the payment and issue the receipt after verification.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderBillingField('firstName', 'First Name *', 'Enter your first name')}
            {renderBillingField('lastName', 'Last Name *', 'Enter your last name')}
            {renderBillingField('email', 'Email Address *', 'you@example.com', 'email')}
            {renderBillingField('phone', 'Phone Number *', '+233...', 'tel')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderBillingField('address', 'Street Address *', 'Enter your street address')}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {renderBillingField('city', 'City *', 'City')}
              {renderBillingField('state', 'State *', 'State')}
              {renderBillingField('zipCode', 'ZIP Code', 'ZIP Code')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="acceptTerms" className="cursor-pointer text-sm font-medium">
                  I accept the Terms and Conditions *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hosted checkout opens on the selected provider and returns here for verification.
                </p>
              </div>
            </div>
            {errors.acceptTerms ? (
              <p className="text-sm text-red-500">{errors.acceptTerms}</p>
            ) : null}

            <div className="flex items-start space-x-3">
              <Checkbox
                id="subscribeNewsletter"
                checked={formData.subscribeNewsletter}
                onCheckedChange={(checked) =>
                  handleInputChange('subscribeNewsletter', checked === true)
                }
              />
              <div className="space-y-1">
                <Label htmlFor="subscribeNewsletter" className="cursor-pointer text-sm font-medium">
                  Subscribe to PropertyHub updates
                </Label>
                <p className="text-xs text-muted-foreground">
                  Occasional transaction and listing updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePreviousStep} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNextStep} size="lg" className="min-w-32">
          Review Order
        </Button>
      </div>
    </motion.div>
  );

  const renderConfirmationStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Review Your Order</h2>
        <p className="text-muted-foreground">
          Confirm the payment summary before secure checkout opens.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted">
                {property.images?.[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{property.title}</h3>
                <p className="text-sm text-muted-foreground">{propertyLocation}</p>
                <p className="mt-1 text-sm font-medium capitalize">
                  Transaction Type: {transactionType}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Base Amount</span>
              <span>₦{formatPrice(amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing Fee (1.5%)</span>
              <span>₦{formatPrice(processingFee)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>VAT (7.5%)</span>
              <span>₦{formatPrice(vatAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount</span>
              <span>₦{formatPrice(finalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Provider:</strong>{' '}
              {formData.provider === 'paystack' ? 'Paystack' : 'Flutterwave'}
            </p>
            <p>
              <strong>Billing Name:</strong> {formData.firstName} {formData.lastName}
            </p>
            <p>
              <strong>Email:</strong> {formData.email}
            </p>
            <p>
              <strong>Phone:</strong> {formData.phone}
            </p>
          </CardContent>
        </Card>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Secure checkout opens on the provider and returns to PropertyHub for payment
            verification before your transaction is marked complete.
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePreviousStep} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNextStep} size="lg" className="min-w-40">
          <Shield className="mr-2 h-4 w-4" />
          Continue to Secure Checkout
        </Button>
      </div>
    </motion.div>
  );

  const renderProcessingStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center space-y-6 py-12"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Opening Secure Checkout</h2>
        <p className="text-muted-foreground">
          We&apos;re preparing your hosted payment session now.
        </p>
        {paymentReference ? (
          <p className="text-sm text-muted-foreground">Reference: {paymentReference}</p>
        ) : null}
      </div>
      <div className="h-2 w-full max-w-md rounded-full bg-muted">
        <div className="h-2 w-3/4 animate-pulse rounded-full bg-primary" />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      ) : null}
    </motion.div>
  );

  return (
    <div className={`mx-auto max-w-4xl ${className}`}>
      {currentStep !== 'processing' ? (
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Provider</span>
            <span>Billing</span>
            <span>Review</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: stepProgress }}
            />
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {currentStep === 'payment-method' ? renderPaymentMethodStep() : null}
        {currentStep === 'billing' ? renderBillingStep() : null}
        {currentStep === 'confirmation' ? renderConfirmationStep() : null}
        {currentStep === 'processing' ? renderProcessingStep() : null}
      </AnimatePresence>

      {currentStep !== 'processing' ? (
        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancel Transaction
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default PropertyCheckout;
