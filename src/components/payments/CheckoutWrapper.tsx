/**
 * CheckoutWrapper - Comprehensive Checkout Integration
 * 
 * This component provides a wrapper around the PropertyCheckout component
 * and integrates with the existing PropertyHub ecosystem including:
 * - Property selection and validation
 * - User authentication checks
 * - Payment integration with existing systems
 * - Mobile-optimized UI/UX
 * - Real-time notifications via WebSocket
 * 
 * @author PropertyHub Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Home, CreditCard, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Components
import { PropertyCheckout } from './PropertyCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

// Hooks
import { useMobile } from '../../hooks/useMobile';
import { useWebSocket } from '../realtime/WebSocketProvider';

// Types
import type { User, Property, AppState } from '../../types';

// Utils
import { formatPrice } from '../../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../../utils/location';
import { toast } from 'sonner';

/**
 * Transaction Types
 */
export type TransactionType = 'purchase' | 'rent' | 'lease' | 'booking';

/**
 * Checkout State Types
 */
type CheckoutState = 'selection' | 'checkout' | 'success' | 'error';

/**
 * CheckoutWrapper Props
 */
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

/**
 * Transaction Configuration
 */
const TRANSACTION_CONFIG = {
  purchase: {
    title: 'Purchase Property',
    description: 'Complete your property purchase',
    buttonText: 'Buy Now',
    icon: Home,
    color: 'blue'
  },
  rent: {
    title: 'Rent Property',
    description: 'Setup your rental agreement',
    buttonText: 'Rent Now',
    icon: Home,
    color: 'green'
  },
  lease: {
    title: 'Lease Property',
    description: 'Setup your lease agreement',
    buttonText: 'Lease Now',
    icon: Home,
    color: 'purple'
  },
  booking: {
    title: 'Book Property Tour',
    description: 'Schedule your property viewing',
    buttonText: 'Book Tour',
    icon: CreditCard,
    color: 'orange'
  }
} as const;

/**
 * Main CheckoutWrapper Component
 */
export function CheckoutWrapper({
  property,
  currentUser,
  transactionType = 'purchase',
  customAmount,
  isOpen,
  onClose,
  onSuccess,
  onNavigate,
  className = ''
}: CheckoutWrapperProps): React.ReactElement {
  const isMobile = useMobile();
  const { sendMessage } = useWebSocket();
  const propertyLocation = getLocationLabel(property.location);
  const propertyPrice = getPropertyPrice(property);
  const isAvailable = property.available ?? property.status === 'available';
  
  // ========================================
  // State Management
  // ========================================
  
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('selection');
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType>(transactionType);
  const [transactionAmount, setTransactionAmount] = useState<number>(customAmount || propertyPrice);
  const [lastTransactionId, setLastTransactionId] = useState<string>('');
  
  // ========================================
  // Computed Values
  // ========================================
  
  const config = TRANSACTION_CONFIG[selectedTransactionType];
  const IconComponent = config.icon;
  
  // Calculate transaction amount based on type
  useEffect(() => {
    if (!customAmount) {
      switch (selectedTransactionType) {
        case 'purchase':
          setTransactionAmount(propertyPrice);
          break;
        case 'rent':
          setTransactionAmount(propertyPrice * 0.08); // 8% of property value as monthly rent
          break;
        case 'lease':
          setTransactionAmount(propertyPrice * 0.12); // 12% of property value as annual lease
          break;
        case 'booking':
          setTransactionAmount(50000); // Fixed booking fee of ₦50,000
          break;
        default:
          setTransactionAmount(propertyPrice);
      }
    }
  }, [selectedTransactionType, propertyPrice, customAmount]);
  
  // ========================================
  // Event Handlers
  // ========================================
  
  const handleTransactionTypeChange = (type: TransactionType): void => {
    setSelectedTransactionType(type);
    console.log(`🔄 Transaction type changed to: ${type}`);
  };
  
  const handleProceedToCheckout = (): void => {
    // Validate user authentication
    if (!currentUser) {
      toast.error('Please log in to continue with your transaction');
      onNavigate?.('login');
      return;
    }
    
    // Validate property availability
    if (!isAvailable) {
      toast.error('This property is currently not available');
      return;
    }
    
    setCheckoutState('checkout');
    console.log(`🛒 Proceeding to checkout for ${selectedTransactionType}: ₦${formatPrice(transactionAmount)}`);
  };
  
  const handleCheckoutSuccess = (transactionId: string): void => {
    setLastTransactionId(transactionId);
    setCheckoutState('success');
    
    // Send real-time notification
    if (sendMessage) {
      sendMessage({
        type: 'transaction_completed',
        userId: currentUser.id,
        propertyId: property.id,
        transactionId,
        transactionType: selectedTransactionType,
        amount: transactionAmount,
        timestamp: new Date().toISOString()
      });
    }
    
    // Notify parent component
    onSuccess?.(transactionId, property);
    
    console.log(`✅ Transaction completed successfully: ${transactionId}`);
  };
  
  const handleCheckoutCancel = (): void => {
    setCheckoutState('selection');
    console.log('❌ Checkout cancelled by user');
  };
  
  const handleClose = (): void => {
    if (checkoutState === 'checkout') {
      // Confirm before closing during checkout
      if (window.confirm('Are you sure you want to cancel the checkout process?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };
  
  const handleStartNewTransaction = (): void => {
    setCheckoutState('selection');
    setLastTransactionId('');
  };
  
  // ========================================
  // Render Components
  // ========================================
  
  const renderTransactionSelection = (): React.ReactElement => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Property Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {property.images?.[0] && (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg line-clamp-2">{property.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{propertyLocation}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isAvailable ? 'default' : 'secondary'}>
                  {isAvailable ? 'Available' : 'Not Available'}
                </Badge>
                <Badge variant="outline">{property.type}</Badge>
              </div>
              <p className="font-semibold text-lg mt-2">₦{formatPrice(propertyPrice)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Transaction Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Transaction Type</CardTitle>
          <CardDescription>
            Choose how you would like to proceed with this property
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TRANSACTION_CONFIG).map(([type, config]) => {
            const IconComp = config.icon;
            const isSelected = selectedTransactionType === type;
            
            return (
              <div
                key={type}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleTransactionTypeChange(type as TransactionType)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{config.title}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ₦{formatPrice(
                        type === 'purchase' ? propertyPrice :
                        type === 'rent' ? propertyPrice * 0.08 :
                        type === 'lease' ? propertyPrice * 0.12 :
                        50000
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
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Important Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> All transactions are processed securely through Paystack. 
          You will receive a confirmation email and transaction receipt upon successful payment.
        </AlertDescription>
      </Alert>
      
      {/* Property Availability Check */}
      {!isAvailable && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This property is currently not available for {selectedTransactionType}. 
            Please contact the property owner for more information.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between space-x-4">
        <Button variant="outline" onClick={handleClose} size="lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleProceedToCheckout} 
          size="lg" 
          className="flex-1"
          disabled={!isAvailable}
        >
          <IconComponent className="w-4 h-4 mr-2" />
          {config.buttonText} - ₦{formatPrice(transactionAmount)}
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
      onSuccess={handleCheckoutSuccess}
      onCancel={handleCheckoutCancel}
    />
  );
  
  const renderSuccess = (): React.ReactElement => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-8"
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-green-600">Transaction Successful!</h2>
        <p className="text-muted-foreground">
          Your {selectedTransactionType} for <strong>{property.title}</strong> has been completed successfully.
        </p>
      </div>
      
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between">
            <span>Transaction ID:</span>
            <span className="font-mono text-sm">{lastTransactionId}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Paid:</span>
            <span className="font-semibold">₦{formatPrice(transactionAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transaction Type:</span>
            <span className="capitalize">{selectedTransactionType}</span>
          </div>
          <div className="flex justify-between">
            <span>Property:</span>
            <span className="truncate max-w-32" title={property.title}>{property.title}</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={handleStartNewTransaction}>
          Start New Transaction
        </Button>
        <Button onClick={handleClose}>
          Continue to Dashboard
        </Button>
      </div>
    </motion.div>
  );
  
  // ========================================
  // Main Render
  // ========================================
  
  if (!isOpen) return <></>;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="p-6 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              ×
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <AnimatePresence mode="wait">
            {checkoutState === 'selection' && renderTransactionSelection()}
            {checkoutState === 'checkout' && renderCheckout()}
            {checkoutState === 'success' && renderSuccess()}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default CheckoutWrapper;
