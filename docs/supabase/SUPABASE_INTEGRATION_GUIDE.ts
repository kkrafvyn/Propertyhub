/**
 * Supabase Integration Guide
 * 
 * This guide shows how to integrate Supabase backend with PropertyHub components
 * 
 * @author PropertyHub Team
 */

// ============================================
// AUTHENTICATION INTEGRATION
// ============================================

/**
 * Example: Login Component Integration
 * 
 * Update src/components/Login.tsx to use Supabase authentication:
 */

/*
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { signin, loading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signin(email, password);
      // Navigate to marketplace
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/marketplace" />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      {error && <p style={{color: 'red'}}>{error.message}</p>}
    </form>
  );
}
*/

// ============================================
// PROPERTY MANAGEMENT INTEGRATION
// ============================================

/**
 * Example: Marketplace Component Integration
 * 
 * Update src/components/Marketplace.tsx to fetch properties from Supabase:
 */

/*
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';

export default function Marketplace() {
  const { user } = useAuth();
  const { properties, loading, error, fetchProperties } = useProperties();
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchProperties({
      ...filters,
      limit: 20,
    });
  }, [filters]);

  return (
    <div>
      <h1>Property Listings</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <div className="property-grid">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}
*/

// ============================================
// PROPERTY MANAGEMENT PANEL INTEGRATION
// ============================================

/**
 * Example: PropertyManagement Component Integration
 * 
 * Update src/components/PropertyManagement.tsx for host property management:
 */

/*
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';

export default function PropertyManagement() {
  const { user } = useAuth();
  const { 
    properties, 
    loading, 
    createProperty, 
    updateProperty, 
    deleteProperty,
    getPropertiesByOwner 
  } = useProperties();

  useEffect(() => {
    if (user?.id) {
      getPropertiesByOwner(user.id);
    }
  }, [user?.id]);

  const handleCreateProperty = async (data) => {
    if (!user) return;
    try {
      await createProperty(data, user.id);
      // Show success message
    } catch (error) {
      // Show error message
    }
  };

  const handleUpdateProperty = async (propertyId, data) => {
    try {
      await updateProperty(propertyId, data);
      // Show success message
    } catch (error) {
      // Show error message
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      await deleteProperty(propertyId);
      // Show success message
    } catch (error) {
      // Show error message
    }
  };

  return (
    <div>
      <h1>My Properties</h1>
      {loading && <p>Loading...</p>}
      <List>
        {properties.map((property) => (
          <PropertyCard 
            key={property.id} 
            property={property}
            onUpdate={handleUpdateProperty}
            onDelete={handleDeleteProperty}
          />
        ))}
      </List>
    </div>
  );
}
*/

// ============================================
// CHAT INTEGRATION
// ============================================

/**
 * Example: ChatRoom Component Integration
 * 
 * Update src/components/ChatRoom.tsx for messaging:
 */

/*
import { messageService } from '@/services/supabaseApi';
import { useSupabaseSubscription } from '@/hooks/useSupabase';

export default function ChatRoom({ userId1, userId2 }) {
  const { sendMessage } = messageService;
  const [messageText, setMessageText] = useState('');
  
  // Subscribe to new messages
  const { data: messages } = useSupabaseSubscription({
    table: 'messages',
    event: 'INSERT',
    filter: `or(and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1}))`
  });

  const handleSendMessage = async () => {
    try {
      await sendMessage({
        sender_id: userId1,
        receiver_id: userId2,
        content: messageText,
      });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}
*/

// ============================================
// BOOKING INTEGRATION
// ============================================

/**
 * Example: PropertyBookingSystem Component Integration
 */

/*
import { bookingService } from '@/services/supabaseApi';
import { useAuth } from '@/hooks/useAuth';

export default function PropertyBookingSystem({ propertyId, propertyOwnerId }) {
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const handleBooking = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await bookingService.createBooking({
        property_id: propertyId,
        user_id: user.id,
        owner_id: propertyOwnerId,
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
        status: 'pending'
      });
      
      if (error) throw error;
      // Redirect to payment or show confirmation
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  return (
    <div>
      <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      <input type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
      <button onClick={handleBooking}>Book Now</button>
    </div>
  );
}
*/

// ============================================
// REVIEW INTEGRATION
// ============================================

/**
 * Example: Review Component Integration
 */

/*
import { reviewService } from '@/services/supabaseApi';
import { useAuth } from '@/hooks/useAuth';

export default function ReviewForm({ propertyId, bookingId, propertyOwnerId }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmitReview = async () => {
    if (!user) return;

    try {
      const { data, error } = await reviewService.createReview({
        property_id: propertyId,
        booking_id: bookingId,
        reviewer_id: user.id,
        owner_id: propertyOwnerId,
        rating,
        comment,
        verified_booking: true
      });

      if (error) throw error;
      // Show success message
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  return (
    <form>
      <input type="range" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your review..." />
      <button onClick={handleSubmitReview}>Submit Review</button>
    </form>
  );
}
*/

// ============================================
// BEST PRACTICES
// ============================================

/**
 * 1. Error Handling
 *    - Always handle errors from API calls
 *    - Show user-friendly error messages
 *    - Log errors for debugging
 */

/**
 * 2. Loading States
 *    - Show loading indicators while fetching data
 *    - Disable buttons during operations
 *    - Cache data where possible to reduce API calls
 */

/**
 * 3. Real-time Updates
 *    - Use useSupabaseSubscription for real-time changes
 *    - Unsubscribe when components unmount
 *    - Handle connection errors gracefully
 */

/**
 * 4. Authentication
 *    - Check isAuthenticated before showing protected content
 *    - Handle session expiry and token refresh
 *    - Clear sensitive data on logout
 */

/**
 * 5. Performance
 *    - Use pagination for large result sets
 *    - Implement search/filter to reduce data transfer
 *    - Use React Query or SWR for caching (optional)
 */

export default {
  guide: 'See comments in this file for integration examples',
};
