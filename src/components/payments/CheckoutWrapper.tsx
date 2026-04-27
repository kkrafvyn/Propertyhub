import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, CreditCard, Home, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AppState, Property, User } from '../../types';
import { formatPrice } from '../../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../../utils/location';
import { PropertyCheckout } from './PropertyCheckout';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export type TransactionType = 'purchase' | 'rent' | 'lease' | 'booking';

type CheckoutState = 'selection' | 'checkout';

interface CheckoutWrapperProps {
  property: Property;
  currentUser: User;
  transactionType?: TransactionType;
  customAmount?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transactionId: string, property: Property) => void;
  onNavigate?: (state: AppState) => void;
  className?: string;
}

const TRANSACTION_CONFIG = {
  purchase: {
    title: 'Purchase Property',
    description: 'Complete your property purchase',
    buttonText: 'Buy Now',
    icon: Home,
  },
  rent: {
    title: 'Rent Property',
    description: 'Set up your rental agreement',
    buttonText: 'Rent Now',
    icon: Home,
  },
  lease: {
    title: 'Lease Property',
    description: 'Set up your lease agreement',
    buttonText: 'Lease Now',
    icon: Home,
  },
  booking: {
    title: 'Book Property Tour',
    description: 'Schedule your property viewing',
    buttonText: 'Book Tour',
    icon: CreditCard,
  },
} as const;

export function CheckoutWrapper({
  property,
  currentUser,
  transactionType = 'purchase',
  customAmount,
  isOpen,
  onClose,
  onNavigate,
  className = '',
}: CheckoutWrapperProps): React.ReactElement {
  const propertyLocation = getLocationLabel(property.location);
  const propertyPrice = getPropertyPrice(property);
  const isAvailable = property.available ?? property.status === 'available';

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('selection');
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType>(transactionType);
  const [transactionAmount, setTransactionAmount] = useState<number>(
    customAmount || propertyPrice,
  );

  useEffect(() => {
    if (!customAmount) {
      switch (selectedTransactionType) {
        case 'purchase':
          setTransactionAmount(propertyPrice);
          break;
        case 'rent':
          setTransactionAmount(propertyPrice * 0.08);
          break;
        case 'lease':
          setTransactionAmount(propertyPrice * 0.12);
          break;
        case 'booking':
          setTransactionAmount(50000);
          break;
        default:
          setTransactionAmount(propertyPrice);
      }
    }
  }, [customAmount, propertyPrice, selectedTransactionType]);

  const config = TRANSACTION_CONFIG[selectedTransactionType];
  const IconComponent = config.icon;

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      toast.error('Please log in to continue with your transaction');
      onNavigate?.('login');
      return;
    }

    if (!isAvailable) {
      toast.error('This property is currently not available');
      return;
    }

    setCheckoutState('checkout');
  };

  const handleClose = () => {
    if (checkoutState === 'checkout') {
      const shouldClose = window.confirm(
        'Are you sure you want to cancel the checkout process?',
      );

      if (!shouldClose) {
        return;
      }
    }

    onClose();
  };

  const renderTransactionSelection = (): React.ReactElement => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {property.images?.[0] ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-lg font-semibold">{property.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{propertyLocation}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={isAvailable ? 'default' : 'secondary'}>
                  {isAvailable ? 'Available' : 'Not Available'}
                </Badge>
                <Badge variant="outline">{property.type}</Badge>
              </div>
              <p className="mt-2 text-lg font-semibold">
                {property.pricing?.currency || property.currency || 'GHS'} {formatPrice(propertyPrice)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Transaction Type</CardTitle>
          <CardDescription>
            Choose how you would like to proceed with this property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TRANSACTION_CONFIG).map(([type, option]) => {
            const OptionIcon = option.icon;
            const isSelected = selectedTransactionType === type;

            return (
              <button
                key={type}
                type="button"
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTransactionType(type as TransactionType)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <OptionIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{option.title}</h4>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {property.pricing?.currency || property.currency || 'GHS'}{' '}
                      {formatPrice(
                        type === 'purchase'
                          ? propertyPrice
                          : type === 'rent'
                            ? propertyPrice * 0.08
                            : type === 'lease'
                              ? propertyPrice * 0.12
                              : 50000,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type === 'rent' && 'per month'}
                      {type === 'lease' && 'per year'}
                      {type === 'booking' && 'booking fee'}
                      {type === 'purchase' && 'total price'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Secure checkout opens on the selected provider and
          returns to PropertyHub for verification before the payment is marked complete.
        </AlertDescription>
      </Alert>

      {!isAvailable ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This property is currently not available for {selectedTransactionType}. Please
            contact the property owner for more information.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-between space-x-4">
        <Button variant="outline" onClick={handleClose} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleProceedToCheckout}
          size="lg"
          className="flex-1"
          disabled={!isAvailable}
        >
          <IconComponent className="mr-2 h-4 w-4" />
          {config.buttonText} - {property.pricing?.currency || property.currency || 'GHS'}{' '}
          {formatPrice(transactionAmount)}
        </Button>
      </div>
    </motion.div>
  );

  const renderCheckout = (): React.ReactElement => (
    <PropertyCheckout
      property={property}
      currentUser={currentUser}
      transactionType={selectedTransactionType}
      amount={transactionAmount}
      onSuccess={() => undefined}
      onCancel={() => setCheckoutState('selection')}
    />
  );

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`flex min-h-[100dvh] w-full flex-col overflow-hidden rounded-none bg-background shadow-xl sm:max-h-[90vh] sm:min-h-0 sm:max-w-4xl sm:rounded-[32px] ${className}`}
      >
        <div className="safe-area-pt border-b bg-muted/50 px-5 pb-4 pt-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="safe-area-pb flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:max-h-[calc(90vh-120px)] sm:p-6">
          <AnimatePresence mode="wait">
            {checkoutState === 'selection' ? renderTransactionSelection() : null}
            {checkoutState === 'checkout' ? renderCheckout() : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default CheckoutWrapper;
