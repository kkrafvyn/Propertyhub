/**
 * PropertyHub Mobile - Payment Screen Component
 * 
 * Mobile-optimized payment interface for property transactions.
 * Provides native payment flows with:
 * - Touch-friendly payment method selection
 * - Biometric authentication support
 * - Real-time payment status updates
 * - Receipt generation and sharing
 * - Payment history and management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  RadioButton,
  Checkbox,
  Surface,
  Portal,
  Modal,
  IconButton,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Services and Types
import { 
  mobilePaymentService, 
  PaymentMethod, 
  PaymentTransaction,
  PaymentType,
  PaymentResult 
} from '../services/PaymentService';

// Utils
import { formatPrice, formatDate } from '../utils/formatting';
import { useAuth } from '../providers/AuthProvider';

const { width, height } = Dimensions.get('window');

interface PaymentScreenProps {
  propertyId: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  description: string;
  onPaymentComplete?: (transaction: PaymentTransaction) => void;
}

type PaymentStep = 'details' | 'method' | 'processing' | 'success' | 'error';
type PaymentMethodType = 'card' | 'mobile_money' | 'bank_transfer' | 'saved';

export function PaymentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Parse parameters
  const {
    propertyId,
    amount: amountParam,
    currency = 'NGN',
    paymentType,
    description
  } = params as { [key: string]: string };

  const amount = parseFloat(amountParam || '0');

  // State management
  const [currentStep, setCurrentStep] = useState<PaymentStep>('details');
  const [selectedMethodType, setSelectedMethodType] = useState<PaymentMethodType>('card');
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [cardData, setCardData] = useState({
    email: user?.email || '',
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    phone: user?.phone || '',
  });

  const [mobileMoneyData, setMobileMoneyData] = useState({
    phone: user?.phone || '',
    provider: 'mtn' as 'mtn' | 'airtel' | 'glo' | '9mobile',
  });

  const [bankTransferData, setBankTransferData] = useState({
    email: user?.email || '',
  });

  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState<boolean>(true);

  // Load payment methods on mount
  useEffect(() => {
    if (user?.id) {
      loadPaymentMethods();
    }
  }, [user?.id]);

  // Load saved payment methods
  const loadPaymentMethods = async () => {
    try {
      if (!user?.id) return;
      
      const methods = await mobilePaymentService.getPaymentMethods(user.id);
      setPaymentMethods(methods);
      
      // Select default method if available
      const defaultMethod = methods.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedSavedMethod(defaultMethod.id);
        setSelectedMethodType('saved');
      }
    } catch (error) {
      console.error('❌ Failed to load payment methods:', error);
    }
  };

  // Handle payment processing
  const handlePayment = async () => {
    if (!user?.id || !agreeTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return;
    }

    try {
      setLoading(true);
      setCurrentStep('processing');
      setError(null);

      // Haptic feedback for payment start
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Create payment intent
      const paymentIntent = await mobilePaymentService.createPaymentIntent({
        amount,
        currency,
        type: paymentType as PaymentType,
        customerId: user.id,
        customerEmail: user.email,
        propertyId,
        description,
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
        }
      });

      let paymentResult: PaymentResult;

      // Process payment based on selected method
      switch (selectedMethodType) {
        case 'card':
          paymentResult = await mobilePaymentService.processCardPayment({
            email: cardData.email,
            amount,
            currency,
            reference: paymentIntent.reference,
            firstName: cardData.firstName,
            lastName: cardData.lastName,
            phone: cardData.phone,
            metadata: {
              propertyId,
              paymentType,
            }
          });
          break;

        case 'mobile_money':
          paymentResult = await mobilePaymentService.processMobileMoneyPayment({
            email: user.email,
            amount,
            currency,
            reference: paymentIntent.reference,
            phone: mobileMoneyData.phone,
            provider: mobileMoneyData.provider,
            metadata: {
              propertyId,
              paymentType,
            }
          });
          break;

        case 'bank_transfer':
          paymentResult = await mobilePaymentService.processBankTransferPayment({
            email: bankTransferData.email,
            amount,
            currency,
            reference: paymentIntent.reference,
            metadata: {
              propertyId,
              paymentType,
            }
          });
          break;

        case 'saved':
          // Process using saved payment method
          paymentResult = await mobilePaymentService.processCardPayment({
            email: user.email,
            amount,
            currency,
            reference: paymentIntent.reference,
            metadata: {
              propertyId,
              paymentType,
              savedMethodId: selectedSavedMethod,
            }
          });
          break;

        default:
          throw new Error('Invalid payment method selected');
      }

      if (paymentResult.success) {
        setTransaction(paymentResult.transaction || null);
        setCurrentStep('success');
        
        // Success haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          'Payment Successful!',
          'Your payment has been processed successfully.',
          [{ text: 'OK', onPress: () => {} }]
        );
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }

    } catch (error) {
      console.error('❌ Payment failed:', error);
      setError(error instanceof Error ? error.message : 'Payment failed');
      setCurrentStep('error');
      
      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'An error occurred while processing your payment.',
        [{ text: 'OK', onPress: () => setCurrentStep('method') }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle sharing receipt
  const handleShareReceipt = async () => {
    try {
      if (!transaction) return;

      const receiptText = `
PropertyHub Payment Receipt

Transaction ID: ${transaction.reference}
Amount: ${formatPrice(transaction.amount, transaction.currency)}
Date: ${formatDate(transaction.createdAt, { includeTime: true })}
Status: ${transaction.status.toUpperCase()}

Thank you for using PropertyHub!
      `.trim();

      await Sharing.shareAsync('data:text/plain;base64,' + btoa(receiptText));
    } catch (error) {
      console.error('❌ Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  // Calculate fees
  const fees = mobilePaymentService.calculateFees(amount, currency);
  const totalAmount = amount + fees.totalFees;

  // Render payment method selection
  const renderPaymentMethods = () => (
    <View style={styles.paymentMethods}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      <RadioButton.Group
        value={selectedMethodType}
        onValueChange={(value) => setSelectedMethodType(value as PaymentMethodType)}
      >
        {/* Saved Payment Methods */}
        {paymentMethods.length > 0 && (
          <Card style={styles.methodCard}>
            <Card.Content>
              <View style={styles.methodHeader}>
                <RadioButton value="saved" />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Saved Cards</Text>
                  <Text style={styles.methodDescription}>Use a previously saved card</Text>
                </View>
                <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
              </View>
              
              {selectedMethodType === 'saved' && (
                <View style={styles.savedMethods}>
                  <Divider style={styles.divider} />
                  {paymentMethods.map((method) => (
                    <View key={method.id} style={styles.savedMethodItem}>
                      <RadioButton.Item
                        label={`${method.brand} •••• ${method.last4}`}
                        value={method.id}
                        status={selectedSavedMethod === method.id ? 'checked' : 'unchecked'}
                        onPress={() => setSelectedSavedMethod(method.id)}
                      />
                      {method.isDefault && (
                        <Chip mode="outlined" compact>Default</Chip>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Card Payment */}
        <Card style={styles.methodCard}>
          <Card.Content>
            <View style={styles.methodHeader}>
              <RadioButton value="card" />
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Debit/Credit Card</Text>
                <Text style={styles.methodDescription}>Visa, Mastercard, Verve</Text>
              </View>
              <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
            </View>
            
            {selectedMethodType === 'card' && (
              <View style={styles.cardForm}>
                <Divider style={styles.divider} />
                <TextInput
                  label="Email"
                  value={cardData.email}
                  onChangeText={(text) => setCardData({...cardData, email: text})}
                  mode="outlined"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <View style={styles.nameRow}>
                  <TextInput
                    label="First Name"
                    value={cardData.firstName}
                    onChangeText={(text) => setCardData({...cardData, firstName: text})}
                    mode="outlined"
                    style={[styles.input, styles.nameInput]}
                  />
                  <TextInput
                    label="Last Name"
                    value={cardData.lastName}
                    onChangeText={(text) => setCardData({...cardData, lastName: text})}
                    mode="outlined"
                    style={[styles.input, styles.nameInput]}
                  />
                </View>
                <TextInput
                  label="Phone Number"
                  value={cardData.phone}
                  onChangeText={(text) => setCardData({...cardData, phone: text})}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Mobile Money */}
        <Card style={styles.methodCard}>
          <Card.Content>
            <View style={styles.methodHeader}>
              <RadioButton value="mobile_money" />
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Mobile Money</Text>
                <Text style={styles.methodDescription}>MTN, Airtel, Glo, 9mobile</Text>
              </View>
              <Ionicons name="phone-portrait-outline" size={24} color={theme.colors.primary} />
            </View>
            
            {selectedMethodType === 'mobile_money' && (
              <View style={styles.mobileMoneyForm}>
                <Divider style={styles.divider} />
                <TextInput
                  label="Phone Number"
                  value={mobileMoneyData.phone}
                  onChangeText={(text) => setMobileMoneyData({...mobileMoneyData, phone: text})}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                
                <Text style={styles.providerLabel}>Select Provider</Text>
                <View style={styles.providerChips}>
                  {['mtn', 'airtel', 'glo', '9mobile'].map((provider) => (
                    <Chip
                      key={provider}
                      mode={mobileMoneyData.provider === provider ? 'flat' : 'outlined'}
                      selected={mobileMoneyData.provider === provider}
                      onPress={() => setMobileMoneyData({...mobileMoneyData, provider: provider as any})}
                      style={styles.providerChip}
                    >
                      {provider.toUpperCase()}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Bank Transfer */}
        <Card style={styles.methodCard}>
          <Card.Content>
            <View style={styles.methodHeader}>
              <RadioButton value="bank_transfer" />
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Bank Transfer</Text>
                <Text style={styles.methodDescription}>Direct bank transfer</Text>
              </View>
              <Ionicons name="business-outline" size={24} color={theme.colors.primary} />
            </View>
            
            {selectedMethodType === 'bank_transfer' && (
              <View style={styles.bankTransferForm}>
                <Divider style={styles.divider} />
                <TextInput
                  label="Email"
                  value={bankTransferData.email}
                  onChangeText={(text) => setBankTransferData({...bankTransferData, email: text})}
                  mode="outlined"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Text style={styles.bankTransferNote}>
                  You will receive bank details to complete the transfer after clicking Pay.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </RadioButton.Group>
    </View>
  );

  // Render payment summary
  const renderPaymentSummary = () => (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text>Amount:</Text>
          <Text style={styles.summaryAmount}>{formatPrice(amount, currency)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text>Platform fee:</Text>
          <Text>{formatPrice(fees.platformFee, currency)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text>Processing fee:</Text>
          <Text>{formatPrice(fees.paystackFee + fees.vatFee, currency)}</Text>
        </View>
        
        <Divider style={styles.summaryDivider} />
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>{formatPrice(totalAmount, currency)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'details':
      case 'method':
        return (
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Surface style={styles.header} elevation={2}>
              <View style={styles.headerContent}>
                <IconButton
                  icon="arrow-left"
                  size={24}
                  onPress={() => router.back()}
                />
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={styles.headerSpacer} />
              </View>
            </Surface>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.pageTitle}>{description}</Text>
              
              {renderPaymentSummary()}
              {renderPaymentMethods()}
              
              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <Checkbox.Item
                  label="I agree to the Terms and Conditions"
                  status={agreeTerms ? 'checked' : 'unchecked'}
                  onPress={() => setAgreeTerms(!agreeTerms)}
                  labelStyle={styles.termsLabel}
                />
                
                {selectedMethodType === 'card' && (
                  <Checkbox.Item
                    label="Save payment method for future use"
                    status={savePaymentMethod ? 'checked' : 'unchecked'}
                    onPress={() => setSavePaymentMethod(!savePaymentMethod)}
                    labelStyle={styles.termsLabel}
                  />
                )}
              </View>
            </View>

            {/* Pay Button */}
            <View style={styles.payButtonContainer}>
              <Button
                mode="contained"
                onPress={handlePayment}
                disabled={!agreeTerms || loading}
                style={styles.payButton}
                contentStyle={styles.payButtonContent}
                labelStyle={styles.payButtonLabel}
              >
                {loading ? 'Processing...' : `Pay ${formatPrice(totalAmount, currency)}`}
              </Button>
            </View>
          </ScrollView>
        );

      case 'processing':
        return (
          <View style={styles.centeredContainer}>
            <View style={styles.processingContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.processingTitle}>Processing Payment</Text>
              <Text style={styles.processingSubtitle}>Please wait while we process your payment...</Text>
            </View>
          </View>
        );

      case 'success':
        return (
          <View style={styles.centeredContainer}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryContainer]}
              style={styles.successGradient}
            >
              <View style={styles.successContent}>
                <Ionicons name="checkmark-circle" size={80} color="white" />
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>
                  Your payment has been processed successfully.
                </Text>
                
                {transaction && (
                  <Card style={styles.receiptCard}>
                    <Card.Content>
                      <Text style={styles.receiptTitle}>Transaction Details</Text>
                      <View style={styles.receiptRow}>
                        <Text>Reference:</Text>
                        <Text style={styles.receiptValue}>{transaction.reference}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text>Amount:</Text>
                        <Text style={styles.receiptValue}>{formatPrice(transaction.amount, transaction.currency)}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text>Date:</Text>
                        <Text style={styles.receiptValue}>{formatDate(transaction.createdAt, { includeTime: true })}</Text>
                      </View>
                    </Card.Content>
                  </Card>
                )}
                
                <View style={styles.successActions}>
                  <Button
                    mode="contained"
                    onPress={handleShareReceipt}
                    style={styles.shareButton}
                    icon="share"
                  >
                    Share Receipt
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => router.back()}
                    style={styles.doneButton}
                  >
                    Done
                  </Button>
                </View>
              </View>
            </LinearGradient>
          </View>
        );

      case 'error':
        return (
          <View style={styles.centeredContainer}>
            <View style={styles.errorContent}>
              <Ionicons name="close-circle" size={80} color={theme.colors.error} />
              <Text style={styles.errorTitle}>Payment Failed</Text>
              <Text style={styles.errorSubtitle}>{error || 'An error occurred while processing your payment.'}</Text>
              
              <View style={styles.errorActions}>
                <Button
                  mode="contained"
                  onPress={() => setCurrentStep('method')}
                  style={styles.retryButton}
                >
                  Try Again
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => router.back()}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      {renderCurrentStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryAmount: {
    fontWeight: '500',
  },
  summaryDivider: {
    marginVertical: 12,
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentMethods: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodCard: {
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  cardForm: {
    paddingTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  savedMethods: {
    paddingTop: 8,
  },
  savedMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  mobileMoneyForm: {
    paddingTop: 8,
  },
  providerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 4,
  },
  providerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerChip: {
    marginBottom: 4,
  },
  bankTransferForm: {
    paddingTop: 8,
  },
  bankTransferNote: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: 8,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsLabel: {
    fontSize: 14,
  },
  payButtonContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  payButton: {
    borderRadius: 12,
  },
  payButtonContent: {
    height: 56,
  },
  payButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  successGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
  },
  receiptCard: {
    width: '100%',
    marginBottom: 24,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptValue: {
    fontWeight: '500',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  doneButton: {
    borderColor: 'white',
  },
  errorContent: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    borderColor: '#666',
  },
});