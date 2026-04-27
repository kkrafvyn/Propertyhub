/**
 * MobileCheckoutButton - Mobile-Optimized Checkout Trigger
 * 
 * A responsive checkout button component that:
 * - Adapts to mobile and desktop interfaces
 * - Integrates with the checkout system
 * - Provides quick access to payment methods
 * - Shows payment method icons and options
 * - Handles authentication requirements
 * 
 * @author PropertyHub Team
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  ShoppingCart, 
  Home, 
  Calendar,
  User as UserIcon,
  Lock,
  ChevronDown,
  Zap
} from 'lucide-react';

// Components
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

// Hooks
import { useMobile } from '../../hooks/useMobile';

// Types
import type { Property, User as AppUser } from '../../types';
import type { TransactionType } from './CheckoutWrapper';

// Utils
import { formatPrice } from '../../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../../utils/location';
import { toast } from 'sonner';

/**
 * Quick Action Configuration
 */
const QUICK_ACTIONS = {
  purchase: {
    label: 'Buy Now',
    icon: Home,
    color: 'btn-primary',
    textColor: '',
    description: 'Purchase this property'
  },
  rent: {
    label: 'Rent',
    icon: Calendar,
    color: 'theme-success-badge hover:brightness-105',
    textColor: '',
    description: 'Setup monthly rental'
  },
  lease: {
    label: 'Lease',
    icon: Home,
    color: 'theme-info-badge hover:brightness-105',
    textColor: '',
    description: 'Setup annual lease'
  },
  booking: {
    label: 'Book Tour',
    icon: Calendar,
    color: 'theme-warning-badge hover:brightness-105',
    textColor: '',
    description: 'Schedule property viewing'
  }
} as const;

/**
 * Payment Method Configuration
 */
const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Card Payment',
    icon: CreditCard,
    description: 'Credit/Debit Card',
    popular: true
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    icon: Smartphone,
    description: 'MTN, Airtel, Tigo, Vodafone',
    popular: false
  }
] as const;

/**
 * MobileCheckoutButton Props
 */
interface MobileCheckoutButtonProps {
  property: Property;
  currentUser: AppUser | null;
  defaultTransactionType?: TransactionType;
  onCheckoutOpen: (transactionType: TransactionType) => void;
  onLoginRequired: () => void;
  variant?: 'default' | 'compact' | 'expanded';
  showPaymentMethods?: boolean;
  className?: string;
}

/**
 * Main MobileCheckoutButton Component
 */
export function MobileCheckoutButton({
  property,
  currentUser,
  defaultTransactionType = 'purchase',
  onCheckoutOpen,
  onLoginRequired,
  variant = 'default',
  showPaymentMethods = true,
  className = ''
}: MobileCheckoutButtonProps): React.ReactElement {
  const isMobile = useMobile();
  const propertyLocation = getLocationLabel(property.location);
  const propertyPrice = getPropertyPrice(property);
  const currencyLabel = property.pricing?.currency || property.currency || 'GHS';
  const isAvailable = property.available ?? property.status === 'available';
  
  // ========================================
  // State Management
  // ========================================
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  
  // ========================================
  // Computed Values
  // ========================================
  
  const primaryAction = QUICK_ACTIONS[defaultTransactionType];
  const PrimaryIcon = primaryAction.icon;
  
  const getTransactionAmount = (type: TransactionType): number => {
    switch (type) {
      case 'purchase':
        return propertyPrice;
      case 'rent':
        return propertyPrice * 0.08; // 8% monthly
      case 'lease':
        return propertyPrice * 0.12; // 12% annually
      case 'booking':
        return 50000; // Fixed booking fee
      default:
        return propertyPrice;
    }
  };
  
  // ========================================
  // Event Handlers
  // ========================================
  
  const handleCheckoutClick = (transactionType: TransactionType): void => {
    // Check authentication
    if (!currentUser) {
      toast.error('Please log in to continue');
      onLoginRequired();
      return;
    }
    
    // Check property availability
    if (!isAvailable) {
      toast.error('This property is currently not available');
      return;
    }
    
    onCheckoutOpen(transactionType);
    setIsDropdownOpen(false);
  };
  
  const handleQuickPayment = (): void => {
    if (!currentUser) {
      toast.info('Please log in to proceed with quick payment');
      onLoginRequired();
      return;
    }
    
    toast.success(`Quick ${selectedPaymentMethod === 'card' ? 'card' : 'mobile money'} payment initiated!`);
    handleCheckoutClick(defaultTransactionType);
  };
  
  // ========================================
  // Render Variants
  // ========================================
  
  const renderCompactButton = (): React.ReactElement => (
    <Button
      onClick={() => handleCheckoutClick(defaultTransactionType)}
      className={`${primaryAction.color} ${primaryAction.textColor} touch-target rounded-full border-0`}
      size={isMobile ? 'lg' : 'default'}
      disabled={!isAvailable}
    >
      <PrimaryIcon className="w-4 h-4 mr-2" />
      {primaryAction.label}
    </Button>
  );
  
  const renderDefaultButton = (): React.ReactElement => (
    <div className="space-y-3">
      {/* Primary Action Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleCheckoutClick(defaultTransactionType)}
          className={`${primaryAction.color} ${primaryAction.textColor} touch-target flex-1 rounded-full border-0`}
          size={isMobile ? 'lg' : 'default'}
          disabled={!isAvailable}
        >
          <PrimaryIcon className="w-4 h-4 mr-2" />
          {primaryAction.label} - {currencyLabel} {formatPrice(getTransactionAmount(defaultTransactionType))}
        </Button>
        
        {/* More Options Dropdown */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={isMobile ? 'lg' : 'default'}
              className="touch-target"
              disabled={!isAvailable}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-2">
              <p className="font-medium text-sm">Transaction Options</p>
              <p className="text-xs text-muted-foreground">Choose your preferred option</p>
            </div>
            <DropdownMenuSeparator />
            
            {Object.entries(QUICK_ACTIONS).map(([type, config]) => {
              const IconComp = config.icon;
              const amount = getTransactionAmount(type as TransactionType);
              
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleCheckoutClick(type as TransactionType)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{currencyLabel} {formatPrice(amount)}</p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Payment Methods (if enabled) */}
      {showPaymentMethods && (
        <div className="flex items-center justify-center space-x-4 py-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Pay with:</span>
            {PAYMENT_METHODS.map((method) => {
              const IconComp = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-2 rounded border transition-colors ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          {PAYMENT_METHODS.find(m => m.popular && m.id === selectedPaymentMethod) && (
            <Badge variant="secondary" className="text-xs">Popular</Badge>
          )}
        </div>
      )}
    </div>
  );
  
  const renderExpandedButton = (): React.ReactElement => (
    <div className="space-y-4">
      {/* Property Quick Info */}
      <div className="air-surface-muted rounded-[24px] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium line-clamp-1">{property.title}</p>
            <p className="text-sm text-muted-foreground">{propertyLocation}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{currencyLabel} {formatPrice(propertyPrice)}</p>
            <Badge variant={isAvailable ? 'default' : 'secondary'} className="text-xs">
              {isAvailable ? 'Available' : 'Not Available'}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Payment Methods Grid */}
      {showPaymentMethods && (
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((method) => {
            const IconComp = method.icon;
            const isSelected = selectedPaymentMethod === method.id;
            
            return (
              <button
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{method.name}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                    {method.popular && (
                      <Badge variant="secondary" className="text-xs mt-1">Popular</Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Quick Payment Actions */}
      <div className="space-y-2">
        <Button
          onClick={handleQuickPayment}
          className="btn-primary touch-target w-full rounded-full"
          size="lg"
          disabled={!isAvailable}
        >
          <Zap className="w-4 h-4 mr-2" />
          Quick pay with {selectedPaymentMethod === 'card' ? 'card' : 'mobile money'}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="touch-target w-full rounded-full" 
              size="lg"
              disabled={!isAvailable}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              More Payment Options
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {Object.entries(QUICK_ACTIONS).map(([type, config]) => {
              const IconComp = config.icon;
              const amount = getTransactionAmount(type as TransactionType);
              
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleCheckoutClick(type as TransactionType)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center space-x-3">
                    <IconComp className="w-4 h-4" />
                    <span>{config.label}</span>
                  </div>
                  <span className="font-semibold">{currencyLabel} {formatPrice(amount)}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Security Notice */}
      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Secured checkout with encrypted payment processing</span>
      </div>
    </div>
  );
  
  // ========================================
  // Authentication Required State
  // ========================================
  
  if (!currentUser) {
    return (
      <Button
        onClick={onLoginRequired}
        variant="outline"
        className="touch-target w-full rounded-full"
        size={isMobile ? 'lg' : 'default'}
      >
        <UserIcon className="w-4 h-4 mr-2" />
        Log in to continue
      </Button>
    );
  }
  
  // ========================================
  // Main Render
  // ========================================
  
  return (
    <div className={className}>
      {variant === 'compact' && renderCompactButton()}
      {variant === 'default' && renderDefaultButton()}
      {variant === 'expanded' && renderExpandedButton()}
    </div>
  );
}

export default MobileCheckoutButton;
