# PropertyHub Supabase Quick Reference

## 🔑 KEY ENVIRONMENT VARIABLES

Add these to your `.env.local` file:

```
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your_key_here...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_key_here...

# Payment Providers
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...

# Email Service
SENDGRID_API_KEY=SG.xxx...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Service
VONAGE_API_KEY=xxx
VONAGE_API_SECRET=xxx
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp (optional)
TWILIO_WHATSAPP_NUMBER=+1234567890
META_BUSINESS_ACCOUNT_ID=xxx
META_WHATSAPP_TOKEN=xxx
```

---

## 🗄️ FREQUENTLY USED TABLE OPERATIONS

### Authentication & Users

```sql
-- Get user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Get user profile
SELECT id, name, email, role, avatar, rating FROM users WHERE id = auth.uid();

-- Update user profile
UPDATE users 
SET name = 'New Name', bio = 'New bio', updated_at = NOW()
WHERE id = auth.uid();

-- Get all hosts/landlords
SELECT * FROM users WHERE role = 'host' ORDER BY rating DESC;

-- Get user verification status
SELECT verification_type, status FROM verifications WHERE user_id = auth.uid();
```

### Properties

```sql
-- List all available properties
SELECT * FROM properties WHERE status = 'available' ORDER BY created_at DESC LIMIT 20;

-- Search properties by location and price
SELECT * FROM properties 
WHERE location ILIKE '%Accra%' 
  AND price BETWEEN 1000 AND 5000 
  AND status = 'available'
ORDER BY rating DESC;

-- Get properties by owner
SELECT * FROM properties WHERE owner_id = auth.uid() ORDER BY created_at DESC;

-- Get featured properties
SELECT * FROM properties WHERE featured = TRUE AND featured_until > NOW();

-- Update property
UPDATE properties 
SET title = 'New Title', price = 6000, updated_at = NOW()
WHERE id = $1 AND owner_id = auth.uid();

-- Delete property (owner only)
DELETE FROM properties WHERE id = $1 AND owner_id = auth.uid();
```

### Bookings

```sql
-- Get all bookings for a user
SELECT b.*, p.title, u.name 
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.owner_id = u.id
WHERE b.user_id = auth.uid()
ORDER BY b.check_in DESC;

-- Get bookings for a property owner
SELECT b.*, p.title, u.name as tenant_name
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.user_id = u.id
WHERE p.owner_id = auth.uid()
ORDER BY b.check_in DESC;

-- Get upcoming bookings
SELECT * FROM bookings 
WHERE status = 'confirmed' 
  AND check_in > NOW()
ORDER BY check_in ASC;

-- Cancel booking
UPDATE bookings 
SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = 'User requested'
WHERE id = $1 AND user_id = auth.uid();
```

### Payments

```sql
-- Get payment history for user
SELECT * FROM payments 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Get completed payments
SELECT * FROM payments 
WHERE user_id = auth.uid() 
  AND status = 'completed'
ORDER BY completed_at DESC;

-- Get pending payments
SELECT * FROM payments 
WHERE user_id = auth.uid() 
  AND status = 'pending'
ORDER BY created_at DESC;

-- Transaction summary
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total,
  AVG(amount) as average
FROM transactions
WHERE user_id = auth.uid()
GROUP BY type;

-- Income from bookings
SELECT 
  DATE_TRUNC('month', p.completed_at) as month,
  SUM(p.amount) as monthly_income
FROM payments p
JOIN bookings b ON p.booking_id = b.id
WHERE b.owner_id = auth.uid() AND p.status = 'completed'
GROUP BY DATE_TRUNC('month', p.completed_at)
ORDER BY month DESC;
```

### Messages & Chat

```sql
-- Get all conversations for user
SELECT * FROM chat_threads 
WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
ORDER BY last_message_at DESC;

-- Get messages in thread
SELECT * FROM messages 
WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND (sender_id = $participant_id OR receiver_id = $participant_id)
ORDER BY created_at DESC
LIMIT 50;

-- Get unread messages count
SELECT COUNT(*) as unread_count FROM messages
WHERE receiver_id = auth.uid() AND read = FALSE;

-- Mark messages as read
UPDATE messages 
SET read = TRUE, read_at = NOW()
WHERE receiver_id = auth.uid() AND read = FALSE;

-- Get conversation with specific user
SELECT * FROM chat_threads 
WHERE (participant_1 = auth.uid() AND participant_2 = $user_id)
   OR (participant_1 = $user_id AND participant_2 = auth.uid());
```

### Reviews

```sql
-- Get reviews for property
SELECT r.*, u.name, u.avatar
FROM reviews r
JOIN users u ON r.reviewer_id = u.id
WHERE r.property_id = $property_id
ORDER BY r.created_at DESC;

-- Get average rating for property
SELECT 
  AVG(rating) as avg_rating,
  COUNT(*) as total_reviews,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating
FROM reviews WHERE property_id = $property_id;

-- Get reviews by user
SELECT * FROM reviews 
WHERE reviewer_id = auth.uid()
ORDER BY created_at DESC;

-- Create review
INSERT INTO reviews (property_id, booking_id, reviewer_id, owner_id, rating, title, comment)
VALUES ($property_id, $booking_id, auth.uid(), $owner_id, 5, 'Great place!', 'Very clean and cozy');
```

### Utilities

```sql
-- Get all services for property
SELECT * FROM property_services 
WHERE property_id = (
  SELECT id FROM properties WHERE owner_id = auth.uid() LIMIT 1
)
ORDER BY next_renewal_date;

-- Get services needing renewal
SELECT * FROM property_services 
WHERE property_id = $property_id
  AND next_renewal_date <= NOW() + INTERVAL '7 days'
  AND status = 'active';

-- Track utility consumption
SELECT 
  meter_type,
  current_reading,
  previous_reading,
  consumption,
  last_reading_date
FROM smart_meters
WHERE property_id = $property_id
ORDER BY meter_type;

-- Service payment history
SELECT sp.*, ps.service_type, ps.provider
FROM service_payments sp
JOIN property_services ps ON sp.service_id = ps.id
WHERE ps.property_id = $property_id
ORDER BY sp.payment_date DESC;
```

### Verification

```sql
-- Get user verification status
SELECT * FROM verifications WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- Get verified users
SELECT u.* FROM users u
JOIN verifications v ON u.id = v.user_id
WHERE v.verification_type = 'id_document' AND v.status = 'verified';

-- Fraud flags
SELECT * FROM fraud_flags 
WHERE user_id = auth.uid() OR 
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid());

-- Check for suspicious activity
SELECT * FROM fraud_flags 
WHERE status = 'confirmed' 
  AND severity IN ('high', 'critical')
ORDER BY created_at DESC;
```

### Dashboard & Analytics

```sql
-- Daily metrics for landlord
SELECT * FROM dashboard_metrics
WHERE user_id = auth.uid()
ORDER BY metric_date DESC
LIMIT 30;

-- Monthly income summary
SELECT 
  DATE_TRUNC('month', metric_date) as month,
  SUM(total_income) as monthly_income,
  SUM(total_expenses) as monthly_expenses,
  AVG(occupancy_rate) as avg_occupancy
FROM dashboard_metrics
WHERE user_id = auth.uid()
GROUP BY DATE_TRUNC('month', metric_date)
ORDER BY month DESC;

-- Get analytics events
SELECT event_type, COUNT(*) as count
FROM analytics_events
WHERE user_id = auth.uid()
GROUP BY event_type;

-- Generate report
INSERT INTO reports (user_id, report_type, period_start, period_end, report_data)
VALUES (
  auth.uid(),
  'income',
  NOW() - INTERVAL '1 month',
  NOW(),
  '{"summary": "Monthly income report"}'::jsonb
);
```

---

## 🔌 COMMON API INTEGRATION PATTERNS

### From React Components

```typescript
// In your React component
import { supabase } from '@/services/supabaseClient';

// Example: Fetch properties
const { data: properties, error } = await supabase
  .from('properties')
  .select('*')
  .eq('status', 'available')
  .limit(20);

// Example: Subscribe to messages in real-time
const subscription = supabase
  .from('messages')
  .on('*', (payload) => {
    console.log('New message:', payload);
  })
  .subscribe();

// Example: Insert booking
const { data, error } = await supabase
  .from('bookings')
  .insert([{
    property_id: propertyId,
    user_id: userId,
    check_in: checkInDate,
    check_out: checkOutDate,
    guests: guestCount,
    total_price: totalPrice
  }]);

// Example: Update user profile
const { data, error } = await supabase
  .from('users')
  .update({ bio: 'New bio', avatar: avatarUrl })
  .eq('id', userId);
```

---

## 🚨 IMPORTANT NOTES

⚠️ **Never expose Secret Keys** in frontend code  
⚠️ **Always validate user input** before sending to database  
⚠️ **Use RLS Policies** - they're already configured  
⚠️ **Handle errors** gracefully in your components  
⚠️ **Test RLS** before going to production  
⚠️ **Monitor Supabase Logs** for errors and performance issues  

---

## 📊 MONITORING & MAINTENANCE

### Check database size
```sql
SELECT 
  sum(pg_total_relation_size(schemaname||'.'||tablename)) / 1024 / 1024 as size_mb
FROM pg_tables
WHERE schemaname = 'public';
```

### Check slow queries
Visit: Supabase Dashboard → Logs → Database Logs

### Optimize table
```sql
VACUUM ANALYZE table_name;
REINDEX TABLE table_name;
```

### Check table size
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🆘 SUPPORT RESOURCES

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **PropertyHub GitHub:** [Your repo link]
- **Supabase Discord:** https://discord.supabase.io

---

**Created:** April 20, 2026  
**Last Updated:** April 20, 2026
