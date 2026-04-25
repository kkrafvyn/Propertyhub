/**
 * PropertyHub - Payment Webhooks Handler
 * 
 * Handles payment webhooks from Paystack and other payment providers.
 * Processes payment status updates, manages transaction state, and
 * sends real-time notifications to users.
 * 
 * Features:
 * - Secure webhook signature verification
 * - Payment status processing and updates
 * - Real-time WebSocket notifications
 * - Transaction logging and auditing
 * - Automatic refund processing
 * - Payment analytics data collection
 */

const crypto = require('crypto');
const winston = require('winston');

// Import production webhook security configuration
const webhookSecurity = require('../../utils/webhookSecurityConfig');

// WebSocket and database imports
const { io } = require('./server');
const { Message, Room, UserPresence } = require('./server');

// Environment configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

// Logger setup
const webhookLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/webhooks.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * Verify Paystack webhook signature using production security config
 */
function verifyPaystackSignature(payload, signature) {
  try {
    // Use production webhook security verification
    const verification = webhookSecurity.verifyPaystackWebhook(payload, signature, PAYSTACK_SECRET_KEY);
    
    if (!verification.isValid) {
      webhookSecurity.logWebhookSecurityEvent('verification_failed', {
        error: verification.error,
        webhookType: 'paystack'
      });
    }
    
    return verification.isValid;
  } catch (error) {
    webhookLogger.error('Paystack signature verification error:', error);
    return false;
  }
}

/**
 * Verify custom webhook signature using production security config
 */
function verifyWebhookSignature(payload, signature, timestamp, secret = WEBHOOK_SECRET) {
  try {
    // Use production webhook security verification
    const verification = webhookSecurity.verifyInternalWebhook(payload, signature, timestamp, secret);
    
    if (!verification.isValid) {
      webhookSecurity.logWebhookSecurityEvent('verification_failed', {
        error: verification.error,
        webhookType: 'internal',
        timestamp: verification.timestamp
      });
    } else {
      webhookSecurity.logWebhookSecurityEvent('verification_success', {
        webhookType: 'internal',
        timestamp: verification.timestamp
      });
    }
    
    return verification.isValid;
  } catch (error) {
    webhookLogger.error('Internal webhook signature verification error:', error);
    return false;
  }
}

/**
 * Process payment success webhook
 */
async function processPaymentSuccess(data) {
  try {
    const {
      reference,
      amount,
      currency,
      customer,
      metadata,
      status,
      gateway_response,
      paid_at,
      channel,
      authorization
    } = data;

    webhookLogger.info('Processing payment success', {
      reference,
      amount: amount / 100, // Convert from kobo/cents
      customer: customer.email,
      metadata: metadata.custom_fields || {}
    });

    // Update payment transaction in database
    const transaction = await updatePaymentTransaction(reference, {
      status: 'success',
      gateway_response,
      paid_at,
      channel,
      authorization_code: authorization?.authorization_code,
      card_type: authorization?.card_type,
      last4: authorization?.last4,
      exp_month: authorization?.exp_month,
      exp_year: authorization?.exp_year,
      bank: authorization?.bank
    });

    if (!transaction) {
      webhookLogger.error('Transaction not found for payment success', { reference });
      return;
    }

    // Extract metadata for notifications
    const paymentType = metadata.payment_type || 'property_purchase';
    const propertyId = metadata.property_id;
    const customerId = metadata.customer_id || customer.customer_code;
    const hostId = metadata.host_id;

    // Send real-time notification to customer
    await sendPaymentNotification(customerId, {
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of ${currency} ${(amount / 100).toLocaleString()} has been processed successfully.`,
      data: {
        reference,
        amount: amount / 100,
        currency,
        payment_type: paymentType,
        property_id: propertyId,
        transaction_id: transaction.id
      },
      priority: 'high'
    });

    // Send notification to host if applicable
    if (hostId && paymentType.includes('property')) {
      await sendPaymentNotification(hostId, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `You have received a payment of ${currency} ${(amount / 100).toLocaleString()} from ${customer.email}.`,
        data: {
          reference,
          amount: amount / 100,
          currency,
          payment_type: paymentType,
          property_id: propertyId,
          customer_email: customer.email,
          transaction_id: transaction.id
        },
        priority: 'high'
      });
    }

    // Create system message in property chat room if exists
    if (propertyId && customerId && hostId) {
      await createPaymentSystemMessage(propertyId, customerId, hostId, {
        type: 'payment_completed',
        amount: amount / 100,
        currency,
        reference,
        payment_type: paymentType
      });
    }

    // Trigger property-specific actions
    await handlePropertyPaymentSuccess(paymentType, {
      propertyId,
      customerId,
      hostId,
      amount: amount / 100,
      currency,
      reference,
      transaction
    });

    webhookLogger.info('Payment success processed successfully', { reference });

  } catch (error) {
    webhookLogger.error('Error processing payment success', {
      error: error.message,
      stack: error.stack,
      data
    });
    throw error;
  }
}

/**
 * Process payment failed webhook
 */
async function processPaymentFailed(data) {
  try {
    const {
      reference,
      amount,
      currency,
      customer,
      metadata,
      status,
      gateway_response
    } = data;

    webhookLogger.info('Processing payment failure', {
      reference,
      amount: amount / 100,
      customer: customer.email,
      reason: gateway_response
    });

    // Update payment transaction in database
    const transaction = await updatePaymentTransaction(reference, {
      status: 'failed',
      gateway_response,
      failed_at: new Date().toISOString()
    });

    if (!transaction) {
      webhookLogger.error('Transaction not found for payment failure', { reference });
      return;
    }

    const customerId = metadata.customer_id || customer.customer_code;

    // Send failure notification to customer
    await sendPaymentNotification(customerId, {
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment of ${currency} ${(amount / 100).toLocaleString()} could not be processed. ${gateway_response}`,
      data: {
        reference,
        amount: amount / 100,
        currency,
        reason: gateway_response,
        transaction_id: transaction.id
      },
      priority: 'high'
    });

    webhookLogger.info('Payment failure processed successfully', { reference });

  } catch (error) {
    webhookLogger.error('Error processing payment failure', {
      error: error.message,
      stack: error.stack,
      data
    });
    throw error;
  }
}

/**
 * Process refund webhook
 */
async function processRefund(data) {
  try {
    const {
      transaction,
      refund,
      status,
      gateway_response
    } = data;

    const reference = transaction.reference;
    const amount = refund.amount;
    const currency = refund.currency;

    webhookLogger.info('Processing refund', {
      reference,
      refund_amount: amount / 100,
      status
    });

    // Update refund status in database
    await updateRefundStatus(refund.id, {
      status: status === 'success' ? 'completed' : 'failed',
      gateway_response,
      processed_at: new Date().toISOString()
    });

    const customerId = transaction.metadata?.customer_id;
    
    if (customerId) {
      // Send refund notification to customer
      await sendPaymentNotification(customerId, {
        type: status === 'success' ? 'refund_completed' : 'refund_failed',
        title: status === 'success' ? 'Refund Processed' : 'Refund Failed',
        message: status === 'success' 
          ? `Your refund of ${currency} ${(amount / 100).toLocaleString()} has been processed successfully.`
          : `Your refund request could not be processed. ${gateway_response}`,
        data: {
          reference,
          refund_amount: amount / 100,
          currency,
          refund_id: refund.id,
          status
        },
        priority: 'high'
      });
    }

    webhookLogger.info('Refund processed successfully', { 
      reference, 
      refund_id: refund.id,
      status 
    });

  } catch (error) {
    webhookLogger.error('Error processing refund', {
      error: error.message,
      stack: error.stack,
      data
    });
    throw error;
  }
}

/**
 * Process dispute webhook
 */
async function processDispute(data) {
  try {
    const {
      transaction,
      dispute,
      status,
      reason,
      resolution
    } = data;

    const reference = transaction.reference;
    const amount = dispute.amount;
    const currency = dispute.currency;

    webhookLogger.info('Processing dispute', {
      reference,
      dispute_amount: amount / 100,
      status,
      reason
    });

    // Update dispute status in database
    await updateDisputeStatus(dispute.id, {
      status,
      reason,
      resolution,
      updated_at: new Date().toISOString()
    });

    const customerId = transaction.metadata?.customer_id;
    const hostId = transaction.metadata?.host_id;
    
    // Notify relevant parties
    if (customerId) {
      await sendPaymentNotification(customerId, {
        type: 'dispute_update',
        title: 'Dispute Update',
        message: `Your dispute for transaction ${reference} has been ${status}.`,
        data: {
          reference,
          dispute_amount: amount / 100,
          currency,
          dispute_id: dispute.id,
          status,
          reason,
          resolution
        },
        priority: 'high'
      });
    }

    if (hostId && hostId !== customerId) {
      await sendPaymentNotification(hostId, {
        type: 'dispute_update',
        title: 'Payment Dispute',
        message: `A dispute has been ${status} for transaction ${reference}.`,
        data: {
          reference,
          dispute_amount: amount / 100,
          currency,
          dispute_id: dispute.id,
          status,
          reason,
          resolution
        },
        priority: 'high'
      });
    }

    webhookLogger.info('Dispute processed successfully', { 
      reference, 
      dispute_id: dispute.id,
      status 
    });

  } catch (error) {
    webhookLogger.error('Error processing dispute', {
      error: error.message,
      stack: error.stack,
      data
    });
    throw error;
  }
}

/**
 * Send payment notification via WebSocket
 */
async function sendPaymentNotification(userId, notification) {
  try {
    // Check if user is online
    const presence = await UserPresence.findOne({ userId });
    
    if (presence && presence.socketId) {
      // Send real-time notification
      io.to(presence.socketId).emit('payment_notification', {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...notification,
        timestamp: new Date().toISOString()
      });
      
      webhookLogger.info('Real-time payment notification sent', {
        userId,
        type: notification.type,
        socketId: presence.socketId
      });
    }

    // Store notification for offline retrieval
    const notificationKey = `payment_notification:${userId}:${Date.now()}`;
    await require('redis').createClient().setex(
      notificationKey,
      7200, // 2 hours expiry
      JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString()
      })
    );

  } catch (error) {
    webhookLogger.error('Error sending payment notification', {
      error: error.message,
      userId,
      notification
    });
  }
}

/**
 * Create system message in chat room for payment events
 */
async function createPaymentSystemMessage(propertyId, customerId, hostId, paymentData) {
  try {
    // Find or create chat room for this property
    let room = await Room.findOne({
      type: 'property_inquiry',
      propertyId,
      $and: [
        { 'participants.userId': customerId },
        { 'participants.userId': hostId }
      ]
    });

    if (!room) {
      // Create new room if it doesn't exist
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      room = new Room({
        id: roomId,
        name: `Property Payment - ${propertyId}`,
        type: 'property_inquiry',
        participants: [
          {
            userId: customerId,
            role: 'member',
            permissions: {
              canSendMessages: true,
              canUploadFiles: true,
              canAddMembers: false
            }
          },
          {
            userId: hostId,
            role: 'owner',
            permissions: {
              canSendMessages: true,
              canUploadFiles: true,
              canAddMembers: true
            }
          }
        ],
        propertyId,
        createdBy: 'system'
      });
      
      await room.save();
    }

    // Create system message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const systemMessage = new Message({
      id: messageId,
      roomId: room.id,
      senderId: 'system',
      senderName: 'PropertyHub',
      content: generatePaymentSystemMessage(paymentData),
      type: 'system',
      metadata: {
        payment_type: paymentData.type,
        payment_reference: paymentData.reference,
        payment_amount: paymentData.amount,
        payment_currency: paymentData.currency
      },
      timestamp: new Date()
    });

    await systemMessage.save();

    // Update room's last message
    await Room.updateOne(
      { id: room.id },
      {
        $set: {
          'lastMessage.content': systemMessage.content,
          'lastMessage.timestamp': new Date(),
          'lastMessage.senderId': 'system'
        }
      }
    );

    // Emit to room participants
    io.to(room.id).emit('message_received', {
      ...systemMessage.toObject(),
      timestamp: systemMessage.timestamp.toISOString()
    });

    webhookLogger.info('Payment system message created', {
      roomId: room.id,
      messageId,
      paymentReference: paymentData.reference
    });

  } catch (error) {
    webhookLogger.error('Error creating payment system message', {
      error: error.message,
      propertyId,
      paymentData
    });
  }
}

/**
 * Generate human-readable system message for payment events
 */
function generatePaymentSystemMessage(paymentData) {
  const { type, amount, currency, reference, payment_type } = paymentData;
  const formattedAmount = `${currency} ${amount.toLocaleString()}`;

  switch (type) {
    case 'payment_completed':
      if (payment_type === 'property_purchase') {
        return `✅ Property purchase payment of ${formattedAmount} has been completed successfully. Reference: ${reference}`;
      } else if (payment_type === 'rental_payment') {
        return `✅ Rental payment of ${formattedAmount} has been processed successfully. Reference: ${reference}`;
      } else if (payment_type === 'booking_fee') {
        return `✅ Booking fee of ${formattedAmount} has been paid successfully. Reference: ${reference}`;
      } else {
        return `✅ Payment of ${formattedAmount} has been completed successfully. Reference: ${reference}`;
      }
    
    case 'payment_failed':
      return `❌ Payment of ${formattedAmount} failed to process. Please try again or contact support. Reference: ${reference}`;
    
    case 'refund_initiated':
      return `🔄 Refund of ${formattedAmount} has been initiated and will be processed within 3-5 business days. Reference: ${reference}`;
    
    default:
      return `💳 Payment transaction update: ${formattedAmount}. Reference: ${reference}`;
  }
}

/**
 * Handle property-specific payment success actions
 */
async function handlePropertyPaymentSuccess(paymentType, data) {
  const { propertyId, customerId, hostId, amount, currency, reference } = data;

  try {
    switch (paymentType) {
      case 'property_purchase':
        // Mark property as sold/reserved
        await updatePropertyStatus(propertyId, 'sold', {
          buyer_id: customerId,
          sale_amount: amount,
          sale_currency: currency,
          sale_reference: reference,
          sale_date: new Date().toISOString()
        });
        
        // Send congratulations notification
        await sendPaymentNotification(customerId, {
          type: 'property_purchased',
          title: 'Property Purchase Complete!',
          message: 'Congratulations! Your property purchase has been completed successfully.',
          data: { propertyId, amount, currency, reference },
          priority: 'high'
        });
        break;
      
      case 'rental_payment':
        // Update rental agreement status
        await updateRentalAgreement(propertyId, customerId, {
          payment_status: 'paid',
          payment_amount: amount,
          payment_reference: reference,
          payment_date: new Date().toISOString()
        });
        break;
      
      case 'booking_fee':
        // Confirm booking
        await confirmPropertyBooking(propertyId, customerId, {
          booking_amount: amount,
          booking_reference: reference,
          booking_confirmed_at: new Date().toISOString()
        });
        break;
    }

    webhookLogger.info('Property-specific payment actions completed', {
      paymentType,
      propertyId,
      reference
    });

  } catch (error) {
    webhookLogger.error('Error handling property payment success actions', {
      error: error.message,
      paymentType,
      data
    });
  }
}

// Database helper functions (these would integrate with your actual database)
async function updatePaymentTransaction(reference, updateData) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Updating payment transaction', { reference, updateData });
  return { id: `txn_${reference}`, reference, ...updateData };
}

async function updateRefundStatus(refundId, updateData) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Updating refund status', { refundId, updateData });
}

async function updateDisputeStatus(disputeId, updateData) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Updating dispute status', { disputeId, updateData });
}

async function updatePropertyStatus(propertyId, status, metadata) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Updating property status', { propertyId, status, metadata });
}

async function updateRentalAgreement(propertyId, customerId, updateData) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Updating rental agreement', { propertyId, customerId, updateData });
}

async function confirmPropertyBooking(propertyId, customerId, updateData) {
  // Mock implementation - replace with actual database update
  webhookLogger.info('Confirming property booking', { propertyId, customerId, updateData });
}

module.exports = {
  verifyPaystackSignature,
  verifyWebhookSignature,
  processPaymentSuccess,
  processPaymentFailed,
  processRefund,
  processDispute,
  sendPaymentNotification,
  createPaymentSystemMessage,
  handlePropertyPaymentSuccess
};