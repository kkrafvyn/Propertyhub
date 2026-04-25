/**
 * Webhook Handlers for External Services
 * 
 * Handles incoming webhooks from:
 * - Payment providers (Paystack, Flutterwave)
 * - WhatsApp providers (Twilio, Meta, MessageBird)
 * - Verification callbacks
 */

const { PaystackService, FlutterwaveService } = require('./payment-provider-service');
const { TwilioWhatsAppService, MetaWhatsAppService } = require('./whatsapp-service');
const { NotificationManager } = require('./notification-service');

// ============================================================================
// PAYSTACK WEBHOOK HANDLER
// ============================================================================

class PaystackWebhookHandler {
  static async handle(req, res) {
    try {
      const paystackService = new PaystackService();

      // Verify signature
      if (!paystackService.verifyWebhookSignature(req.body, req.headers['x-paystack-signature'])) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }

      const event = req.body;
      console.log('Paystack webhook event:', event.event);

      // Handle event
      const result = await paystackService.handleWebhookEvent(event);

      // Send notifications
      if (result.action === 'payment_completed') {
        const reference = event.data.reference;
        const payment = await this.getPaymentByReference(reference);

        if (payment) {
          await NotificationManager.notifyPaymentReceived(
            payment.user_id,
            payment.amount,
            reference
          );
        }
      }

      res.json({ success: true, handled: true });
    } catch (error) {
      console.error('Paystack webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getPaymentByReference(reference) {
    const { data } = await require('@supabase/supabase-js')
      .createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      .from('payments')
      .select('*')
      .eq('reference_id', reference)
      .single();

    return data;
  }
}

// ============================================================================
// FLUTTERWAVE WEBHOOK HANDLER
// ============================================================================

class FlutterwaveWebhookHandler {
  static async handle(req, res) {
    try {
      const flutterwaveService = new FlutterwaveService();

      // Verify signature
      if (!flutterwaveService.verifyWebhookSignature(req.body, req.headers['verifyHash'])) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }

      const event = req.body;
      console.log('Flutterwave webhook event:', event.event);

      // Handle event
      const result = await flutterwaveService.handleWebhookEvent(event);

      // Send notifications
      if (result.action === 'payment_completed') {
        const transactionId = event.data.id;
        const payment = await this.getPaymentByTransactionId(transactionId);

        if (payment) {
          await NotificationManager.notifyPaymentReceived(
            payment.user_id,
            payment.amount,
            transactionId
          );
        }
      }

      res.json({ success: true, handled: true });
    } catch (error) {
      console.error('Flutterwave webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getPaymentByTransactionId(transactionId) {
    const { data } = await require('@supabase/supabase-js')
      .createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      .from('payments')
      .select('*')
      .eq('reference_id', transactionId)
      .single();

    return data;
  }
}

// ============================================================================
// TWILIO WHATSAPP WEBHOOK HANDLER
// ============================================================================

class TwilioWhatsAppWebhookHandler {
  static async handle(req, res) {
    try {
      const twilioService = new TwilioWhatsAppService();

      // Verify sender
      if (req.body.From !== twilioService.whatsappNumber) {
        // This is an incoming message
        const result = await twilioService.handleIncomingMessage(req.body);
        return res.json({ success: true, messageId: result.messageId });
      }

      // Handle status updates
      if (req.body.MessageStatus) {
        await this.handleStatusUpdate(req.body);
      }

      res.json({ success: true, handled: true });
    } catch (error) {
      console.error('Twilio WhatsApp webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleStatusUpdate(data) {
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase
      .from('whatsapp_messages')
      .update({
        status: data.MessageStatus.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('external_id', data.MessageSid);
  }
}

// ============================================================================
// META WHATSAPP WEBHOOK HANDLER
// ============================================================================

class MetaWhatsAppWebhookHandler {
  static async handle(req, res) {
    try {
      // Verify webhook token
      const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'verify_token_here';

      if (req.query['hub.verify_token'] === verifyToken) {
        // Webhook verification
        return res.send(req.query['hub.challenge']);
      }

      const event = req.body;

      if (event.entry && event.entry.length > 0) {
        for (const entry of event.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                const metaService = new MetaWhatsAppService();
                const result = await metaService.handleIncomingMessage(event);

                console.log('Meta WhatsApp message handled:', result);
              }

              if (change.field === 'message_template_status_update') {
                await this.handleTemplateStatusUpdate(change.value);
              }
            }
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Meta WhatsApp webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleTemplateStatusUpdate(data) {
    console.log('Template status update:', data);
    // Handle template approval/rejection
  }
}

// ============================================================================
// MESSAGEBIRD WEBHOOK HANDLER
// ============================================================================

class MessageBirdWebhookHandler {
  static async handle(req, res) {
    try {
      const supabase = require('@supabase/supabase-js').createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Update message status
      if (req.body.type === 'whatsapp_message_status') {
        await supabase
          .from('whatsapp_messages')
          .update({
            status: req.body.status,
            updated_at: new Date().toISOString(),
          })
          .eq('external_id', req.body.messageId);
      }

      // Handle incoming message
      if (req.body.type === 'whatsapp_message_received') {
        await supabase.from('whatsapp_messages').insert({
          phone_number: req.body.originator,
          message: req.body.body,
          direction: 'inbound',
          status: 'received',
          provider: 'messagebird',
          external_id: req.body.messageId,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('MessageBird webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// ============================================================================
// VERIFICATION WEBHOOK HANDLER
// ============================================================================

class VerificationWebhookHandler {
  static async handle(req, res) {
    try {
      const supabase = require('@supabase/supabase-js').createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      const { verificationId, status, approved } = req.body;

      if (!verificationId) {
        return res.status(400).json({ success: false, error: 'Missing verificationId' });
      }

      // Get verification details
      const { data: verification } = await supabase
        .from('verification_requests')
        .select('user_id')
        .eq('id', verificationId)
        .single();

      if (!verification) {
        return res.status(404).json({ success: false, error: 'Verification not found' });
      }

      // Update verification status
      await supabase
        .from('verification_requests')
        .update({ status: approved ? 'verified' : 'rejected' })
        .eq('id', verificationId);

      // Update user verification status
      await supabase
        .from('user_verification_status')
        .upsert({
          user_id: verification.user_id,
          verified: approved,
          verification_level: approved ? 'level_1' : 'unverified',
          verified_at: approved ? new Date().toISOString() : null,
          badges: approved ? ['id_verified'] : [],
        })
        .eq('user_id', verification.user_id);

      // Send notification
      if (approved) {
        await NotificationManager.notifyVerificationApproved(verification.user_id);
      } else {
        await NotificationManager.notifyVerificationRejected(
          verification.user_id,
          'Document verification failed. Please resubmit.'
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Verification webhook error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// ============================================================================
// WEBHOOK ROUTER
// ============================================================================

class WebhookRouter {
  static getHandler(provider) {
    const handlers = {
      paystack: PaystackWebhookHandler,
      flutterwave: FlutterwaveWebhookHandler,
      twilio_whatsapp: TwilioWhatsAppWebhookHandler,
      meta_whatsapp: MetaWhatsAppWebhookHandler,
      messagebird_whatsapp: MessageBirdWebhookHandler,
      verification: VerificationWebhookHandler,
    };

    return handlers[provider];
  }

  static async route(req, res, provider) {
    const Handler = this.getHandler(provider);

    if (!Handler) {
      return res.status(404).json({ success: false, error: 'Unknown provider' });
    }

    return Handler.handle(req, res);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  PaystackWebhookHandler,
  FlutterwaveWebhookHandler,
  TwilioWhatsAppWebhookHandler,
  MetaWhatsAppWebhookHandler,
  MessageBirdWebhookHandler,
  VerificationWebhookHandler,
  WebhookRouter,
};
