/**
 * WhatsApp Integration Service
 * 
 * Supports multiple WhatsApp providers:
 * - Twilio
 * - Meta Business (WhatsApp Cloud API)
 * - MessageBird
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// TWILIO SERVICE
// ============================================================================

class TwilioWhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here';
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+1234567890';
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(toPhoneNumber, message, mediaUrl = null) {
    try {
      const body = {
        From: this.whatsappNumber,
        To: `whatsapp:${toPhoneNumber}`,
        Body: message,
      };

      if (mediaUrl) {
        body.MediaUrl = mediaUrl;
      }

      const response = await axios.post(
        `${this.baseUrl}/Messages.json`,
        new URLSearchParams(body),
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

      const messageData = response.data;

      // Store message in database
      await supabase.from('whatsapp_messages').insert({
        phone_number: toPhoneNumber,
        message,
        direction: 'outbound',
        status: 'sent',
        provider: 'twilio',
        external_id: messageData.sid,
        metadata: {
          dateCreated: messageData.dateCreated,
          dateUpdated: messageData.dateUpdated,
        },
      });

      return {
        success: true,
        messageId: messageData.sid,
        status: 'sent',
      };
    } catch (error) {
      console.error('Twilio WhatsApp send error:', error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(toPhoneNumber, templateName, parameters = []) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/Messages.json`,
        new URLSearchParams({
          From: this.whatsappNumber,
          To: `whatsapp:${toPhoneNumber}`,
          ContentSid: templateName, // Template SID
          ContentVariables: JSON.stringify({ parameters }),
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
        success: true,
        messageId: response.data.sid,
        status: 'sent',
      };
    } catch (error) {
      console.error('Twilio template message error:', error.message);
      throw error;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid) {
    try {
      const response = await axios.get(`${this.baseUrl}/Messages/${messageSid}.json`, {
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
      });

      return {
        messageId: response.data.sid,
        status: response.data.status,
        dateCreated: response.data.dateCreated,
        dateSent: response.data.dateSent,
        errorCode: response.data.errorCode,
        errorMessage: response.data.errorMessage,
      };
    } catch (error) {
      console.error('Error fetching message status:', error.message);
      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleIncomingMessage(data) {
    const { From, Body, NumMedia, MediaUrl0 } = data;
    const phoneNumber = From.replace('whatsapp:', '');

    try {
      // Store incoming message
      const { data: message } = await supabase
        .from('whatsapp_messages')
        .insert({
          phone_number: phoneNumber,
          message: Body,
          direction: 'inbound',
          status: 'received',
          provider: 'twilio',
          media_url: NumMedia > 0 ? MediaUrl0 : null,
        })
        .select()
        .single();

      // Find associated user
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .single();

      if (user) {
        // Create notification for matched user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'whatsapp_message',
          title: 'New WhatsApp Message',
          description: Body.substring(0, 100),
          read: false,
        });
      }

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Error handling incoming message:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// META BUSINESS WHATSAPP SERVICE
// ============================================================================

class MetaWhatsAppService {
  constructor() {
    this.accessToken = process.env.META_BUSINESS_TOKEN || 'your_access_token_here';
    this.phoneNumberId = process.env.META_WHATSAPP_PHONE_ID || 'your_phone_number_id_here';
    this.businessAccountId = process.env.META_BUSINESS_ACCOUNT_ID || 'your_business_account_id_here';
    this.baseUrl = 'https://graph.instagram.com/v18.0';
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(recipientPhoneNumber, message, mediaUrl = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhoneNumber,
        type: mediaUrl ? 'image' : 'text',
      };

      if (mediaUrl) {
        payload.image = {
          link: mediaUrl,
        };
      } else {
        payload.text = {
          preview_url: true,
          body: message,
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const messageData = response.data;

      // Store message
      await supabase.from('whatsapp_messages').insert({
        phone_number: recipientPhoneNumber,
        message,
        direction: 'outbound',
        status: 'sent',
        provider: 'meta',
        external_id: messageData.messages[0].id,
      });

      return {
        success: true,
        messageId: messageData.messages[0].id,
        status: 'sent',
      };
    } catch (error) {
      console.error('Meta WhatsApp send error:', error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(recipientPhoneNumber, templateName, parameters = []) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientPhoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US',
            },
            components: [
              {
                type: 'body',
                parameters: parameters.map(p => ({ type: 'text', text: p })),
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent',
      };
    } catch (error) {
      console.error('Meta template message error:', error.message);
      throw error;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/${messageId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return {
        messageId: response.data.id,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error fetching message status:', error.message);
      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleIncomingMessage(data) {
    try {
      const message = data.entry[0].changes[0].value.messages[0];
      const contact = data.entry[0].changes[0].value.contacts[0];

      const phoneNumber = message.from;
      const messageText = message.text?.body || '';
      const mediaUrl = message.image?.link || null;

      // Store incoming message
      const { data: storedMessage } = await supabase
        .from('whatsapp_messages')
        .insert({
          phone_number: phoneNumber,
          message: messageText,
          direction: 'inbound',
          status: 'received',
          provider: 'meta',
          external_id: message.id,
          media_url: mediaUrl,
        })
        .select()
        .single();

      // Find associated user
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .single();

      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'whatsapp_message',
          title: `Message from ${contact.profile.name}`,
          description: messageText.substring(0, 100),
          read: false,
          data: {
            messageId: storedMessage.id,
            senderPhone: phoneNumber,
          },
        });
      }

      // Send read receipt
      await this.markMessageAsRead(message.id);

      return { success: true, messageId: storedMessage.id };
    } catch (error) {
      console.error('Error handling incoming message:', error.message);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId) {
    try {
      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/mark_seen`,
        {
          messaging_product: 'whatsapp',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// MESSAGEBIRD SERVICE
// ============================================================================

class MessageBirdWhatsAppService {
  constructor() {
    this.apiKey = process.env.MESSAGEBIRD_API_KEY || 'your_api_key_here';
    this.baseUrl = 'https://rest.messagebird.com/whatsapp';
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(recipientPhoneNumber, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/message/send`,
        {
          to: recipientPhoneNumber,
          text: message,
        },
        {
          headers: {
            Authorization: `AccessKey ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store message
      await supabase.from('whatsapp_messages').insert({
        phone_number: recipientPhoneNumber,
        message,
        direction: 'outbound',
        status: 'sent',
        provider: 'messagebird',
        external_id: response.data.id,
      });

      return {
        success: true,
        messageId: response.data.id,
        status: 'sent',
      };
    } catch (error) {
      console.error('MessageBird send error:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// WHATSAPP MANAGER (Multi-provider)
// ============================================================================

class WhatsAppManager {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'twilio';
    this.twilioService = new TwilioWhatsAppService();
    this.metaService = new MetaWhatsAppService();
    this.messageBirdService = new MessageBirdWhatsAppService();
  }

  /**
   * Get active service
   */
  getService() {
    switch (this.provider) {
      case 'meta':
        return this.metaService;
      case 'messagebird':
        return this.messageBirdService;
      case 'twilio':
      default:
        return this.twilioService;
    }
  }

  /**
   * Send message
   */
  async sendMessage(recipientPhoneNumber, message, mediaUrl = null) {
    const service = this.getService();
    return service.sendMessage(recipientPhoneNumber, message, mediaUrl);
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(recipientPhoneNumber, templateName, parameters = []) {
    const service = this.getService();
    if (service.sendTemplateMessage) {
      return service.sendTemplateMessage(recipientPhoneNumber, templateName, parameters);
    }
    throw new Error('Template messages not supported by current provider');
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(recipients, message, mediaUrl = null) {
    const results = [];
    const service = this.getService();

    for (const recipient of recipients) {
      try {
        const result = await service.sendMessage(recipient, message, mediaUrl);
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
   * Send notification to user
   */
  async notifyUser(userId, message, mediaUrl = null) {
    try {
      // Get user phone
      const { data: user } = await supabase
        .from('users')
        .select('phone')
        .eq('id', userId)
        .single();

      if (!user?.phone) {
        throw new Error('User phone number not found');
      }

      return await this.sendMessage(user.phone, message, mediaUrl);
    } catch (error) {
      console.error('Error notifying user:', error.message);
      throw error;
    }
  }

  /**
   * Send payment notification
   */
  async notifyPayment(userId, amount, status, details = '') {
    const message = `Your PropertyHub payment of ${amount} ${status}. ${details}`;
    return this.notifyUser(userId, message);
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber, code) {
    const message = `Your PropertyHub verification code is: ${code}. Valid for 10 minutes.`;
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send property alert
   */
  async notifyPropertyAlert(userId, propertyName, alertType, details = '') {
    const message = `PropertyHub Alert: ${alertType} on ${propertyName}. ${details}`;
    return this.notifyUser(userId, message);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  TwilioWhatsAppService,
  MetaWhatsAppService,
  MessageBirdWhatsAppService,
  WhatsAppManager,
};
