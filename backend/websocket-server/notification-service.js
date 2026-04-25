/**
 * Email & SMS Notification Service
 * 
 * Supports:
 * - Email via SMTP (Gmail, SendGrid, custom)
 * - SMS via Vonage/Nexmo
 * - Notification queuing
 * - Template system
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// EMAIL SERVICE
// ============================================================================

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp';
    this.initializeTransport();
  }

  /**
   * Initialize email transport
   */
  initializeTransport() {
    const emailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your_app_password_here',
      },
    };

    // For SendGrid
    if (this.provider === 'sendgrid') {
      this.sendgridApiKey = process.env.SENDGRID_API_KEY || 'SG.your_api_key_here';
    }

    this.transport = nodemailer.createTransport(emailConfig);
    this.senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@propertyhub.com';
    this.senderName = process.env.EMAIL_FROM_NAME || 'PropertyHub';
  }

  /**
   * Send email
   */
  async sendEmail(recipient, subject, htmlContent, textContent = '') {
    try {
      const mailOptions = {
        from: `${this.senderName} <${this.senderEmail}>`,
        to: recipient,
        subject,
        html: htmlContent,
        text: textContent,
      };

      let result;

      if (this.provider === 'sendgrid') {
        result = await this.sendViasendGrid(recipient, subject, htmlContent);
      } else {
        result = await this.transport.sendMail(mailOptions);
      }

      // Store email in database
      await supabase.from('email_logs').insert({
        recipient,
        subject,
        status: 'sent',
        provider: this.provider,
        message_id: result.messageId || result.id,
        sent_at: new Date().toISOString(),
      });

      return {
        success: true,
        messageId: result.messageId || result.id,
        status: 'sent',
      };
    } catch (error) {
      console.error('Email send error:', error.message);

      // Log failed email
      await supabase.from('email_logs').insert({
        recipient,
        subject,
        status: 'failed',
        provider: this.provider,
        error: error.message,
        sent_at: new Date().toISOString(),
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send via SendGrid API
   */
  async sendViasendGrid(recipient, subject, htmlContent) {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [
          {
            to: [{ email: recipient }],
            subject,
          },
        ],
        from: {
          email: this.senderEmail,
          name: this.senderName,
        },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { id: response.headers['x-message-id'] };
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, subject, htmlContent) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient, subject, htmlContent);
        results.push({
          email: recipient,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          email: recipient,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(recipient, templateName, data = {}) {
    const template = this.getEmailTemplate(templateName);
    const htmlContent = this.renderTemplate(template.html, data);
    const textContent = this.renderTemplate(template.text, data);

    return this.sendEmail(recipient, template.subject, htmlContent, textContent);
  }

  /**
   * Get email template
   */
  getEmailTemplate(templateName) {
    const templates = {
      payment_confirmation: {
        subject: 'Payment Confirmation - PropertyHub',
        html: `
          <h2>Payment Confirmation</h2>
          <p>Your payment of <strong>{{amount}} {{currency}}</strong> has been received.</p>
          <p>Reference: {{reference}}</p>
          <p>Date: {{date}}</p>
          <p>Thank you for using PropertyHub!</p>
        `,
        text: 'Your payment has been received.',
      },
      payment_failed: {
        subject: 'Payment Failed - PropertyHub',
        html: `
          <h2>Payment Failed</h2>
          <p>Unfortunately, your payment failed.</p>
          <p>Reason: {{reason}}</p>
          <p>Please try again or contact support.</p>
        `,
        text: 'Your payment failed.',
      },
      verification_approved: {
        subject: 'Verification Approved - PropertyHub',
        html: `
          <h2>Identity Verified!</h2>
          <p>Congratulations! Your identity has been verified.</p>
          <p>Your account is now fully verified.</p>
        `,
        text: 'Your verification has been approved.',
      },
      verification_rejected: {
        subject: 'Verification Rejected - PropertyHub',
        html: `
          <h2>Verification Rejected</h2>
          <p>Unfortunately, your verification could not be completed.</p>
          <p>Reason: {{reason}}</p>
          <p>Please try again with new documents.</p>
        `,
        text: 'Your verification was rejected.',
      },
      property_alert: {
        subject: 'Property Alert - {{propertyName}}',
        html: `
          <h2>Property Alert</h2>
          <p><strong>{{alertType}}</strong> on {{propertyName}}</p>
          <p>{{details}}</p>
        `,
        text: 'You have a property alert.',
      },
      new_message: {
        subject: 'New Message from {{senderName}} - PropertyHub',
        html: `
          <h2>New Message</h2>
          <p>You have a new message from <strong>{{senderName}}</strong></p>
          <p>{{preview}}</p>
          <a href="{{messageLink}}">View Full Message</a>
        `,
        text: 'You have a new message.',
      },
      welcome: {
        subject: 'Welcome to PropertyHub!',
        html: `
          <h2>Welcome {{name}}!</h2>
          <p>Thank you for joining PropertyHub.</p>
          <p>Complete your profile to get started.</p>
        `,
        text: 'Welcome to PropertyHub!',
      },
      password_reset: {
        subject: 'Password Reset - PropertyHub',
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetLink}}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
        `,
        text: 'Password reset requested.',
      },
    };

    return templates[templateName] || templates.welcome;
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let rendered = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key]);
    });
    return rendered;
  }
}

// ============================================================================
// SMS SERVICE
// ============================================================================

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'vonage';
    this.initializeProvider();
  }

  /**
   * Initialize SMS provider
   */
  initializeProvider() {
    if (this.provider === 'vonage') {
      this.apiKey = process.env.VONAGE_API_KEY || 'your_api_key_here';
      this.apiSecret = process.env.VONAGE_API_SECRET || 'your_api_secret_here';
      this.baseUrl = 'https://rest.nexmo.com';
    } else if (this.provider === 'twilio') {
      this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      this.authToken = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here';
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
      this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(recipientPhone, message) {
    try {
      let result;

      if (this.provider === 'vonage') {
        result = await this.sendViaVonage(recipientPhone, message);
      } else if (this.provider === 'twilio') {
        result = await this.sendViaTwilio(recipientPhone, message);
      } else {
        throw new Error('Unknown SMS provider');
      }

      // Store SMS in database
      await supabase.from('sms_logs').insert({
        recipient_phone: recipientPhone,
        message,
        status: 'sent',
        provider: this.provider,
        message_id: result.messageId,
        sent_at: new Date().toISOString(),
      });

      return {
        success: true,
        messageId: result.messageId,
        status: 'sent',
      };
    } catch (error) {
      console.error('SMS send error:', error.message);

      await supabase.from('sms_logs').insert({
        recipient_phone: recipientPhone,
        message,
        status: 'failed',
        provider: this.provider,
        error: error.message,
        sent_at: new Date().toISOString(),
      });

      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send via Vonage (Nexmo)
   */
  async sendViaVonage(recipientPhone, message) {
    const response = await axios.post(
      `${this.baseUrl}/sms/json`,
      {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        to: recipientPhone,
        from: 'PropertyHub',
        text: message,
      }
    );

    if (response.data.messages[0].status !== '0') {
      throw new Error(response.data.messages[0]['error-text']);
    }

    return {
      messageId: response.data.messages[0]['message-id'],
    };
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(recipientPhone, message) {
    const response = await axios.post(
      `${this.baseUrl}/Messages.json`,
      new URLSearchParams({
        From: this.fromNumber,
        To: recipientPhone,
        Body: message,
      }),
      {
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      messageId: response.data.sid,
    };
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(recipients, message) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient, message);
        results.push({
          phone: recipient,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          phone: recipient,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Send OTP
   */
  async sendOTP(recipientPhone, otp) {
    const message = `Your PropertyHub verification code is: ${otp}. Valid for 10 minutes.`;
    return this.sendSMS(recipientPhone, message);
  }
}

// ============================================================================
// NOTIFICATION QUEUE SERVICE
// ============================================================================

class NotificationQueue {
  /**
   * Queue notification for delivery
   */
  static async queueNotification(userId, type, channel, data = {}) {
    try {
      await supabase.from('notification_queue').insert({
        user_id: userId,
        type,
        channel, // 'email', 'sms', 'whatsapp', 'in_app'
        data,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      });

      return { success: true };
    } catch (error) {
      console.error('Error queuing notification:', error.message);
      throw error;
    }
  }

  /**
   * Process queued notifications
   */
  static async processQueue() {
    try {
      const { data: pendingNotifications } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(100);

      const emailService = new EmailService();
      const smsService = new SMSService();

      for (const notification of pendingNotifications) {
        try {
          const { data: user } = await supabase
            .from('users')
            .select('email, phone')
            .eq('id', notification.user_id)
            .single();

          if (!user) continue;

          switch (notification.channel) {
            case 'email':
              await emailService.sendTemplatedEmail(user.email, notification.type, notification.data);
              break;
            case 'sms':
              if (user.phone) {
                await smsService.sendSMS(user.phone, notification.data.message);
              }
              break;
            case 'in_app':
              await supabase.from('notifications').insert({
                user_id: notification.user_id,
                type: notification.type,
                title: notification.data.title,
                description: notification.data.description,
              });
              break;
          }

          // Mark as sent
          await supabase
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', notification.id);
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error.message);

          // Increment retry count
          await supabase
            .from('notification_queue')
            .update({
              retry_count: notification.retry_count + 1,
              status: notification.retry_count + 1 >= 3 ? 'failed' : 'pending',
            })
            .eq('id', notification.id);
        }
      }

      return { processed: pendingNotifications.length };
    } catch (error) {
      console.error('Queue processing error:', error.message);
      throw error;
    }
  }

  /**
   * Get notification history
   */
  static async getHistory(userId, limit = 50) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// ============================================================================
// NOTIFICATION MANAGER
// ============================================================================

class NotificationManager {
  static emailService = new EmailService();
  static smsService = new SMSService();

  /**
   * Notify payment received
   */
  static async notifyPaymentReceived(userId, amount, reference) {
    return NotificationQueue.queueNotification(userId, 'payment_confirmation', 'email', {
      amount,
      reference,
      date: new Date().toLocaleString(),
      currency: 'NGN',
    });
  }

  /**
   * Notify payment failed
   */
  static async notifyPaymentFailed(userId, reason) {
    return NotificationQueue.queueNotification(userId, 'payment_failed', 'email', {
      reason,
    });
  }

  /**
   * Notify verification approved
   */
  static async notifyVerificationApproved(userId) {
    return NotificationQueue.queueNotification(userId, 'verification_approved', 'email', {});
  }

  /**
   * Notify verification rejected
   */
  static async notifyVerificationRejected(userId, reason) {
    return NotificationQueue.queueNotification(userId, 'verification_rejected', 'email', {
      reason,
    });
  }

  /**
   * Notify property alert
   */
  static async notifyPropertyAlert(userId, propertyName, alertType, details) {
    return NotificationQueue.queueNotification(userId, 'property_alert', 'sms', {
      message: `PropertyHub Alert: ${alertType} on ${propertyName}. ${details}`,
    });
  }

  /**
   * Notify new message
   */
  static async notifyNewMessage(userId, senderName, preview, messageLink) {
    return NotificationQueue.queueNotification(userId, 'new_message', 'email', {
      senderName,
      preview,
      messageLink,
    });
  }

  /**
   * Notify welcome
   */
  static async notifyWelcome(userId, name) {
    return NotificationQueue.queueNotification(userId, 'welcome', 'email', {
      name,
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  EmailService,
  SMSService,
  NotificationQueue,
  NotificationManager,
};
