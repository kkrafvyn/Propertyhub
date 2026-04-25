# External Services Integration Checklist

Complete checklist for integrating all external services into PropertyHub.

## 🎯 Overview

This checklist helps you integrate 8 external services:
1. Paystack (payments)
2. Flutterwave (payments)
3. Twilio/Meta/MessageBird (WhatsApp)
4. Google Vision/AWS Textract (OCR)
5. SMTP/SendGrid (Email)
6. Vonage/Twilio (SMS)
7. Webhooks (payment/notification callbacks)
8. Cron jobs (scheduled tasks)

---

## 1️⃣ PAYMENT PROVIDERS

### Paystack Integration

- [ ] Create Paystack account at https://paystack.com
- [ ] Go to Settings → API Keys & Webhooks
- [ ] Copy Secret Key (starts with `sk_`)
- [ ] Copy Public Key (starts with `pk_`)
- [ ] Generate webhook secret
- [ ] Add to `.env`:
  ```
  PAYSTACK_SECRET_KEY=sk_test_xxxxx
  PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
  PAYSTACK_WEBHOOK_SECRET=whsec_xxxxx
  ```
- [ ] Configure webhook URL in dashboard:
  - URL: `https://yourdomain.com/webhooks/paystack`
  - Events: `charge.success`, `charge.failed`, `charge.dispute.create`
- [ ] Test webhook in sandbox mode
- [ ] Implement payment endpoint: `/api/v1/payments/initialize`
- [ ] Test payment flow end-to-end
- [ ] Monitor payment reconciliation cron job
- [ ] Check database for payment records

**Test Payment Details (Sandbox):**
- Card: 4084084084084081
- Expiry: 12/25
- CVV: 408
- OTP: 000000

### Flutterwave Integration

- [ ] Create Flutterwave account at https://flutterwave.com
- [ ] Go to Settings → API Keys
- [ ] Copy Test Secret Key
- [ ] Copy Test Public Key
- [ ] Generate webhook secret
- [ ] Add to `.env`:
  ```
  FLUTTERWAVE_SECRET_KEY=FLWAVE_SECRET_xxxxx
  FLUTTERWAVE_PUBLIC_KEY=FLWAVE_PUBLIC_xxxxx
  FLUTTERWAVE_WEBHOOK_SECRET=whsec_xxxxx
  ```
- [ ] Configure webhook URL:
  - URL: `https://yourdomain.com/webhooks/flutterwave`
  - Events: `charge.completed`, `charge.failed`
- [ ] Test webhook delivery
- [ ] Implement payment endpoint for Flutterwave
- [ ] Test full payment flow
- [ ] Verify refund functionality

### Payment System Setup

- [ ] Create `payments` table in database
- [ ] Create `rent_payments` table
- [ ] Create `refunds` table
- [ ] Create `payment_reconciliation_logs` table
- [ ] Add payment webhook endpoints to Express server
- [ ] Setup payment reconciliation cron job (every 5 minutes)
- [ ] Test payment status updates via webhooks
- [ ] Implement payment history retrieval
- [ ] Test refund process
- [ ] Verify payment notifications are sent

---

## 2️⃣ WHATSAPP INTEGRATION

### Choose Your Provider

Choose ONE provider (Twilio recommended for development):
- [ ] Twilio (easiest, free credits)
- [ ] Meta Business (best for production)
- [ ] MessageBird (alternative)

### Twilio WhatsApp Setup

- [ ] Create Twilio account at https://twilio.com
- [ ] Verify phone number
- [ ] Enable WhatsApp Sandbox:
  - Go to Messaging → WhatsApp Sandbox
  - Follow setup instructions
- [ ] Get Account SID and Auth Token
- [ ] Get WhatsApp Sandbox Number (e.g., whatsapp:+14155238886)
- [ ] Add to `.env`:
  ```
  WHATSAPP_PROVIDER=twilio
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=xxxxx
  TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
  ```
- [ ] Configure webhook URL in Twilio console:
  - Messaging → WhatsApp Sandbox → Webhook URL
  - URL: `https://yourdomain.com/webhooks/whatsapp/twilio`
  - Method: POST
- [ ] Test incoming webhook delivery
- [ ] Join sandbox by messaging to sandbox number
- [ ] Test sending messages to your phone
- [ ] Implement WhatsApp SDK in frontend
- [ ] Test message sending from app

### Meta Business WhatsApp Setup (Production)

- [ ] Create Facebook Developer account
- [ ] Create new app at https://developer.facebook.com
- [ ] Add WhatsApp product
- [ ] Create WhatsApp Business Account
- [ ] Get Phone Number ID and Business Account ID
- [ ] Generate Business Account Token
- [ ] Add to `.env`:
  ```
  WHATSAPP_PROVIDER=meta
  META_BUSINESS_TOKEN=xxx
  META_WHATSAPP_PHONE_ID=xxx
  META_BUSINESS_ACCOUNT_ID=xxx
  META_WEBHOOK_VERIFY_TOKEN=yourtoken
  ```
- [ ] Configure webhook in Meta App Dashboard:
  - Webhook URL: `https://yourdomain.com/webhooks/whatsapp/meta`
  - Verify token: Match `META_WEBHOOK_VERIFY_TOKEN`
  - Subscribe to: messages, message_template_status_update
- [ ] Test webhook verification
- [ ] Create message templates for:
  - Payment notifications
  - Verification codes
  - Property alerts
- [ ] Test template message sending
- [ ] Get WhatsApp approval for templates

### WhatsApp Implementation

- [ ] Create `whatsapp_messages` table in database
- [ ] Implement message sending endpoint
- [ ] Add message status tracking
- [ ] Create WhatsApp webhook handler
- [ ] Implement incoming message handling
- [ ] Test sending verification codes
- [ ] Test sending payment notifications
- [ ] Test sending property alerts
- [ ] Monitor message delivery rates
- [ ] Handle failed messages with retry logic

---

## 3️⃣ DOCUMENT VERIFICATION & OCR

### Google Vision API Setup

- [ ] Create GCP project at https://console.cloud.google.com
- [ ] Enable Vision API:
  - APIs & Services → Library → Search "Vision"
  - Click "Enable"
- [ ] Create Service Account:
  - APIs & Services → Credentials
  - Create Credentials → Service Account
  - Download JSON key
- [ ] Extract API Key from JSON file
- [ ] Add to `.env`:
  ```
  OCR_PROVIDER=google_vision
  GOOGLE_VISION_API_KEY=xxxxx
  ```
- [ ] Test Vision API with sample document
- [ ] Verify text extraction accuracy
- [ ] Test document type detection

### AWS Textract Setup (Alternative)

- [ ] Create AWS account
- [ ] Go to IAM → Create new user
- [ ] Attach policy: AmazonTextractFullAccess
- [ ] Generate access keys
- [ ] Add to `.env`:
  ```
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=xxx
  AWS_REGION=us-east-1
  ```
- [ ] Install AWS SDK v3: `npm install @aws-sdk/client-textract`
- [ ] Test document extraction

### Verification System Implementation

- [ ] Create `verification_requests` table
- [ ] Create `verification_documents` table
- [ ] Create `user_verification_status` table
- [ ] Implement document upload endpoint
- [ ] Implement OCR text extraction
- [ ] Implement fraud detection scoring
- [ ] Create fraud flags detection logic
- [ ] Implement document validation rules
- [ ] Create verification status endpoint
- [ ] Implement verification completion endpoint
- [ ] Test with sample documents:
  - [ ] National ID
  - [ ] Passport
  - [ ] Driver's License
  - [ ] Utility bill
- [ ] Train fraud detection with more examples
- [ ] Setup manual review queue for edge cases
- [ ] Implement notification on verification approval/rejection

---

## 4️⃣ EMAIL SERVICE

### Gmail/SMTP Setup

- [ ] Create Gmail account (or use existing)
- [ ] Enable 2-Factor Authentication
- [ ] Go to https://myaccount.google.com/apppasswords
- [ ] Select "Mail" and "Windows Computer" (or your OS)
- [ ] Generate app password (16 characters)
- [ ] Add to `.env`:
  ```
  EMAIL_PROVIDER=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@gmail.com
  SMTP_PASSWORD=your-16-char-password
  EMAIL_FROM=your-email@gmail.com
  EMAIL_FROM_NAME=PropertyHub
  ```
- [ ] Test SMTP connection
- [ ] Send test email
- [ ] Verify email delivery

### SendGrid Setup (Alternative)

- [ ] Create SendGrid account at https://sendgrid.com
- [ ] Go to Settings → API Keys
- [ ] Create new full access API key
- [ ] Add to `.env`:
  ```
  EMAIL_PROVIDER=sendgrid
  SENDGRID_API_KEY=SG.xxxxx
  EMAIL_FROM=noreply@propertyhub.com
  EMAIL_FROM_NAME=PropertyHub
  ```
- [ ] Test SendGrid API
- [ ] Send test email

### Email Implementation

- [ ] Create `email_logs` table
- [ ] Create email template system
- [ ] Implement templates:
  - [ ] Payment confirmation
  - [ ] Payment failed
  - [ ] Verification approved
  - [ ] Verification rejected
  - [ ] Property alert
  - [ ] New message notification
  - [ ] Welcome email
  - [ ] Password reset
- [ ] Implement email sending endpoint
- [ ] Test all email templates
- [ ] Setup email logging
- [ ] Monitor email delivery rates
- [ ] Implement bulk email sending
- [ ] Add unsubscribe link to emails

---

## 5️⃣ SMS SERVICE

### Vonage/Nexmo Setup

- [ ] Create Vonage account at https://dashboard.nexmo.com
- [ ] Go to Settings → API credentials
- [ ] Copy API Key and API Secret
- [ ] Add to `.env`:
  ```
  SMS_PROVIDER=vonage
  VONAGE_API_KEY=xxxxx
  VONAGE_API_SECRET=xxxxx
  ```
- [ ] Test Vonage API
- [ ] Send test SMS
- [ ] Verify delivery

### Twilio SMS Setup (Alternative)

- [ ] Get Twilio account (already created for WhatsApp)
- [ ] Get SMS phone number from Twilio
- [ ] Add to `.env`:
  ```
  SMS_PROVIDER=twilio
  TWILIO_ACCOUNT_SID=ACxxxxx
  TWILIO_AUTH_TOKEN=xxxxx
  TWILIO_SMS_PHONE=+1234567890
  ```
- [ ] Test SMS sending

### SMS Implementation

- [ ] Create `sms_logs` table
- [ ] Implement SMS sending endpoint
- [ ] Create SMS templates:
  - [ ] OTP verification code
  - [ ] Payment notification
  - [ ] Property alert
  - [ ] Appointment reminder
- [ ] Test SMS delivery
- [ ] Monitor SMS costs
- [ ] Implement retry logic for failed SMS
- [ ] Setup SMS delivery tracking

---

## 6️⃣ NOTIFICATION QUEUE SYSTEM

- [ ] Create `notification_queue` table
- [ ] Create `notifications` table (in-app)
- [ ] Implement queue processing logic
- [ ] Setup cron job to process queue (every minute)
- [ ] Test queuing notifications
- [ ] Test multi-channel notifications:
  - [ ] Email
  - [ ] SMS
  - [ ] WhatsApp
  - [ ] In-app
- [ ] Implement retry logic
- [ ] Monitor queue processing
- [ ] Setup notification history tracking

---

## 7️⃣ WEBHOOK HANDLING

- [ ] Create webhook route: `/webhooks/paystack`
- [ ] Create webhook route: `/webhooks/flutterwave`
- [ ] Create webhook route: `/webhooks/whatsapp/twilio`
- [ ] Create webhook route: `/webhooks/whatsapp/meta`
- [ ] Create webhook route: `/webhooks/verification`
- [ ] Implement signature verification for each webhook
- [ ] Create webhook event logging
- [ ] Test webhook delivery from providers
- [ ] Test webhook signature verification
- [ ] Implement webhook error handling
- [ ] Setup webhook retry mechanism
- [ ] Monitor webhook failures
- [ ] Create webhook test utility

---

## 8️⃣ SCHEDULED JOBS (CRON)

- [ ] Install `node-cron`: `npm install node-cron`
- [ ] Setup payment reconciliation job (every 5 min):
  - [ ] Fetch pending payments
  - [ ] Verify with payment providers
  - [ ] Update payment status
  - [ ] Save reconciliation logs
- [ ] Setup notification queue processor (every minute):
  - [ ] Get pending notifications
  - [ ] Send via appropriate channel
  - [ ] Update notification status
  - [ ] Implement retry logic
- [ ] Setup payment statistics job (daily 1 AM):
  - [ ] Calculate daily/weekly/monthly stats
  - [ ] Store statistics
  - [ ] Send admin report
- [ ] Setup webhook retry job (every 30 min):
  - [ ] Fetch failed webhooks
  - [ ] Retry with backoff
- [ ] Monitor cron job execution
- [ ] Add cron job logging
- [ ] Test all cron jobs

---

## 9️⃣ DATABASE TABLES

Create these tables in Supabase:

- [ ] `payments` - Payment records
- [ ] `rent_payments` - Rent payment history
- [ ] `refunds` - Refund records
- [ ] `whatsapp_messages` - WhatsApp message log
- [ ] `email_logs` - Email delivery logs
- [ ] `sms_logs` - SMS delivery logs
- [ ] `notification_queue` - Queued notifications
- [ ] `notifications` - In-app notifications
- [ ] `verification_requests` - Verification processes
- [ ] `verification_documents` - Uploaded documents
- [ ] `user_verification_status` - User verification status

---

## 🔟 TESTING

- [ ] Test payment flow end-to-end:
  - [ ] Create payment
  - [ ] Get payment link
  - [ ] Complete payment
  - [ ] Verify payment via webhook
  - [ ] Check payment status in app
- [ ] Test WhatsApp integration:
  - [ ] Send message
  - [ ] Receive message (if enabled)
  - [ ] Check message status
  - [ ] Test template messages
- [ ] Test verification flow:
  - [ ] Upload document
  - [ ] Extract text with OCR
  - [ ] Get fraud analysis
  - [ ] Approve/reject verification
  - [ ] Check verification status
- [ ] Test email notifications:
  - [ ] Send payment confirmation
  - [ ] Send verification result
  - [ ] Check email delivery
  - [ ] Test template rendering
- [ ] Test SMS notifications:
  - [ ] Send OTP
  - [ ] Send payment notification
  - [ ] Check SMS delivery
- [ ] Run load tests for all services
- [ ] Test error scenarios:
  - [ ] Payment failure
  - [ ] WhatsApp failure
  - [ ] OCR failure
  - [ ] Email failure
  - [ ] SMS failure
- [ ] Test retry logic
- [ ] Monitor service health

---

## 🚀 DEPLOYMENT CHECKLIST

Before going to production:

- [ ] All environment variables configured with LIVE keys
- [ ] SSL certificate installed
- [ ] Database backups enabled
- [ ] Rate limiting configured appropriately
- [ ] Error tracking (Sentry) enabled
- [ ] Monitoring/alerting setup (Datadog/New Relic)
- [ ] Logs aggregation setup (CloudWatch/ELK)
- [ ] All webhooks updated to production URLs
- [ ] All services tested in staging environment
- [ ] Fallback mechanisms for service failures
- [ ] All feature flags reviewed
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] On-call schedule established

---

## 📋 Services Status Checklist

Use this to track which services are active:

- [ ] **Payments**: Paystack __ | Flutterwave __ | Both __
- [ ] **WhatsApp**: Twilio __ | Meta __ | MessageBird __ | None __
- [ ] **OCR**: Google Vision __ | AWS Textract __ | Tesseract __ | None __
- [ ] **Email**: SMTP __ | SendGrid __ | None __
- [ ] **SMS**: Vonage __ | Twilio __ | None __
- [ ] **Webhooks**: Active __ | Inactive __
- [ ] **Cron Jobs**: Active __ | Inactive __

---

## 🔗 Useful Links

- **Paystack Docs**: https://paystack.com/docs
- **Flutterwave Docs**: https://developer.flutterwave.com
- **Twilio Docs**: https://www.twilio.com/docs
- **Meta Business Docs**: https://developers.facebook.com/docs/whatsapp
- **Google Vision**: https://cloud.google.com/vision/docs
- **AWS Textract**: https://docs.aws.amazon.com/textract
- **SendGrid Docs**: https://sendgrid.com/docs
- **Vonage Docs**: https://developer.vonage.com/

---

## 📞 Support & Troubleshooting

**Payment Issues:**
- Check PAYSTACK_SECRET_KEY vs PUBLIC_KEY
- Verify webhook signature matches
- Check payment status in Paystack/Flutterwave dashboard
- Enable debug logging: `LOG_LEVEL=debug`

**WhatsApp Issues:**
- Verify phone number is in correct format
- Check WHATSAPP_PROVIDER setting
- Verify API keys are correct
- Check webhook delivery in Twilio/Meta console
- Check phone is registered in WhatsApp

**OCR Issues:**
- Verify Google Vision API key is valid
- Check image quality (not too blurry)
- Test with different document types
- Check Google Cloud quota usage

**Email Issues:**
- Verify SMTP credentials
- Check App Password (Gmail) or API key (SendGrid)
- Review spam folder
- Check email headers for issues
- Verify sender email is authenticated

**SMS Issues:**
- Verify phone number format (+country code)
- Check SMS credits/balance
- Verify API credentials
- Check phone carrier support

---

## 📈 Monitoring & Analytics

Track these metrics:

- Payment success rate
- Payment average processing time
- WhatsApp delivery rate
- Email delivery rate
- SMS delivery rate
- OCR accuracy rate
- Webhook success rate
- Notification queue backlog
- Error rates by service

---

**Status**: [ ] Complete | In Progress

**Last Updated**: [Date]

**Maintained By**: [Team Name]
