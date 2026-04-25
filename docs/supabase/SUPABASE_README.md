# Supabase Backend Setup Guide

## Overview

PropertyHub now has a complete Supabase backend integration with:
- ✅ Client initialization
- ✅ API service layer
- ✅ React hooks for authentication, properties, and subscriptions
- ✅ Database type definitions
- ✅ SQL schema for all tables
- ✅ Row Level Security (RLS) policies
- ✅ Real-time subscriptions

## Quick Start

### 1. Environment Variables

Your `.env.local` file is already configured with:
```
VITE_SUPABASE_URL=https://biknfagzdkfqdpqhdwhc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_t_JEC_PC7YxfTLlSw9gZGw_zisnAeRx
```

### 2. Database Setup

Run the SQL schema in your Supabase SQL Editor:

1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy SQL from `src/SUPABASE_SCHEMA.sql`
5. Run the queries to create all tables

**Important**: The schema includes:
- 11 main tables (users, properties, bookings, reviews, messages, etc.)
- Automatic timestamp updates
- Full-text search indexes
- Real-time subscriptions support
- Row Level Security policies

### 3. Install Dependencies

The Supabase client is already in `package.json`. Install if needed:

```bash
npm install @supabase/supabase-js
```

## File Structure

```
src/
├── services/
│   ├── supabaseClient.ts       # Client initialization
│   ├── supabaseApi.ts          # API service layer
│   └── MobileBackendService.ts # Existing backend service
├── hooks/
│   ├── useAuth.ts              # Authentication hook
│   ├── useSupabase.ts          # Real-time subscriptions
│   ├── useProperties.ts        # Property management
│   └── index.ts                # Hooks export
├── types/
│   ├── database.ts             # Supabase table types
│   └── index.ts                # Existing types
├── SUPABASE_INTEGRATION_GUIDE.ts    # Component integration examples
├── SUPABASE_SCHEMA.sql              # Database schema
└── .env.local                  # Configuration (created)
```

## Available Services & Hooks

### Authentication (`authService`)

```typescript
import { authService } from '@/services/supabaseApi';

// Sign up
await authService.signup(email, password, userData);

// Sign in
await authService.signin(email, password);

// Sign out
await authService.signout();

// Get session/user
await authService.getSession();
await authService.getUser();
```

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

const { 
  user, 
  session, 
  isAuthenticated, 
  signin, 
  signup, 
  signout, 
  loading, 
  error 
} = useAuth();
```

### Properties (`propertyService`)

```typescript
import { propertyService } from '@/services/supabaseApi';

// Fetch properties with filters
await propertyService.getProperties({
  location: 'Accra',
  priceMin: 1000,
  priceMax: 5000,
  limit: 20
});

// Get single property
await propertyService.getProperty(propertyId);

// Create property
await propertyService.createProperty(userId, propertyData);

// Update property
await propertyService.updateProperty(propertyId, updates);

// Delete property
await propertyService.deleteProperty(propertyId);

// Get owner's properties
await propertyService.getPropertiesByOwner(userId);
```

### useProperties Hook

```typescript
import { useProperties } from '@/hooks/useProperties';

const {
  properties,
  property,
  loading,
  error,
  total,
  fetchProperties,
  fetchProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByOwner
} = useProperties();
```

### Bookings (`bookingService`)

```typescript
import { bookingService } from '@/services/supabaseApi';

// Create booking
await bookingService.createBooking(bookingData);

// Get booking
await bookingService.getBooking(bookingId);

// Get user's bookings
await bookingService.getUserBookings(userId);

// Update booking status
await bookingService.updateBookingStatus(bookingId, status);
```

### Reviews (`reviewService`)

```typescript
import { reviewService } from '@/services/supabaseApi';

// Create review
await reviewService.createReview(reviewData);

// Get property reviews
await reviewService.getPropertyReviews(propertyId);

// Get user's reviews
await reviewService.getUserReviews(userId);
```

### Messages (`messageService`)

```typescript
import { messageService } from '@/services/supabaseApi';

// Send message
await messageService.sendMessage(messageData);

// Get conversation
await messageService.getConversationMessages(userId1, userId2);

// Get user's conversations
await messageService.getUserConversations(userId);

// Mark as read
await messageService.markAsRead(messageId);
```

### Real-time Subscriptions (`useSupabase`)

```typescript
import { useSupabaseSubscription } from '@/hooks/useSupabase';

const { data, loading, error, isSubscribed } = useSupabaseSubscription({
  table: 'messages',
  event: 'INSERT',
  filter: 'property_id.eq.123'
});
```

## Integration Examples

See `src/SUPABASE_INTEGRATION_GUIDE.ts` for detailed examples of integrating Supabase with components:

- Login Component
- Marketplace Component
- Property Management Component
- Chat Room Component
- Property Booking System
- Review Component

## Database Tables

### Users
- Profile information
- Role-based access (user, host, manager, admin)
- Verification status
- Rating and statistics

### Properties
- Property details (bedrooms, bathrooms, area, etc.)
- Pricing and availability
- Amenities and features
- Images and media
- Owner and status tracking

### Bookings
- Check-in/check-out dates
- Guest count
- Booking and payment status
- Cancellation tracking

### Reviews
- Rating (1-5 stars)
- Comments and media
- Component ratings (cleanliness, accuracy, etc.)
- Verified booking flag

### Messages
- Two-way messaging
- Property/booking context
- Read status
- Reply threading

### Additional Tables
- Payments (Paystack integration)
- Favorites (Wishlist)
- Search History
- Notifications
- Property Images

## Best Practices

### 1. Error Handling

```typescript
try {
  const { data, error } = await propertyService.getProperties();
  if (error) throw error;
  // Use data
} catch (error) {
  console.error('Failed to fetch properties:', error);
  // Show user-friendly error
}
```

### 2. Loading States

```typescript
{loading && <LoadingSpinner />}
{error && <ErrorMessage error={error} />}
{!loading && !error && <Content data={data} />}
```

### 3. Real-time Updates

```typescript
// Subscribe to new messages
const { data: messages } = useSupabaseSubscription({
  table: 'messages',
  event: 'INSERT'
});

// Always unsubscribe on unmount (handled by hook)
```

### 4. Authentication Flow

```typescript
// Check if authenticated
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}

// protected component
```

### 5. Performance

- Use pagination for large result sets
- Implement search/filter to reduce data transfer
- Cache data using React Query (optional upgrade)
- Unsubscribe from real-time events when not needed

## Troubleshooting

### "Supabase URL or Publishable Key not configured"

- Check `.env.local` file exists with correct credentials
- Restart dev server after updating .env

### "Cannot create property" / Permission Denied

- User must be logged in
- Check Row Level Security policies in Supabase Console
- Verify user role in database

### Messages not updating in real-time

- Ensure Realtime is enabled for messages table
- Check subscription filter syntax
- Verify LISTEN permissions in RLS policies

### Authentication not persisting

- Browser localStorage must be enabled
- Check session in browser DevTools Application tab
- Clear localStorage and login again

## Next Steps

1. ✅ **Database Setup**: Run the SQL schema in Supabase
2. ✅ **RLS Policies**: Enable Row Level Security for data protection
3. ✅ **Integration**: Update components to use Supabase hooks
4. ✅ **Testing**: Test authentication and data operations
5. **Edge Functions** (Optional): Create server-side functions for complex operations
6. **Backups**: Set up automated database backups
7. **Monitoring**: Enable database performance monitoring

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Updates](https://supabase.com/docs/guides/realtime)

## Support

For issues or questions:
1. Check the Supabase Console for errors
2. Review RLS policies for permission issues
3. Check browser console for client errors
4. Review `src/SUPABASE_INTEGRATION_GUIDE.ts` for examples

---

**Last Updated**: April 18, 2026
**Version**: 2.0.0
