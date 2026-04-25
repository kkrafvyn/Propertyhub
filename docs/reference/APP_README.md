# PropertyHub 🏡

A modern, full-featured Airbnb-style real estate marketplace platform built with React, TypeScript, and Supabase.

## 🚀 Features

### Core Functionality
- **Property Listings**: Browse houses, lands, and commercial shops
- **Advanced Search**: Intelligent search with filtering and recommendations  
- **Interactive Maps**: Property locations with geocoding integration
- **User Dashboards**: Manage rentals, bookings, and preferences
- **Admin Panel**: Comprehensive platform management tools

### User Roles & Permissions
- **User**: Browse and rent properties
- **Host**: List and manage properties
- **Manager**: Manage assigned property portfolios  
- **Admin**: Full platform oversight and control

### Real-time Features
- **Enhanced Chat System**: Direct messages and group chats
- **Live Notifications**: Real-time updates via WebSocket
- **Admin Oversight**: Monitor all conversations and activities
- **Notification Center**: Centralized notification management

### Payment Integration
- **Paystack Integration**: Support for card and mobile money payments
- **Secure Transactions**: PCI-compliant payment processing
- **Rental Tracking**: Monitor payment history and rental periods

### Mobile & PWA
- **Progressive Web App**: Installable mobile experience
- **Offline Support**: Continue browsing with cached data
- **Background Sync**: Sync data when connection restored
- **Push Notifications**: 15+ notification types across all user roles
- **Mobile-First Design**: Optimized for all screen sizes

### Analytics & Reporting  
- **Property Analytics**: Comprehensive performance dashboards
- **Search Analytics**: Track user behavior and preferences
- **Revenue Reports**: Financial insights and trends
- **User Engagement**: Activity tracking and analytics

### Technical Features
- **Backend Integration**: Full Supabase integration with 15+ API endpoints
- **3D Animations**: Modern UI with smooth transitions
- **Theme System**: Multiple color themes (light/dark/blue/green/purple/orange)
- **Error Boundary**: Robust error handling and recovery
- **Performance Optimized**: Lazy loading, virtualization, and caching

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS v4** for styling
- **Motion/React** for animations  
- **Recharts** for analytics visualizations
- **Lucide React** for icons
- **React Hook Form** for form handling
- **Sonner** for toast notifications

### Backend
- **Supabase** for database, auth, and storage
- **Hono** web server for API endpoints
- **WebSocket** for real-time features
- **Edge Functions** for serverless backend logic

### Maps & Location
- **Google Maps API** integration
- **Geocoding** for address resolution
- **Interactive map markers** with property details

### Payment
- **Paystack** for payment processing
- **Mobile Money** support
- **Card payments** with secure tokenization

## 🚦 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account
- Google Maps API key
- Paystack API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/propertyhub.git
   cd propertyhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Deploy Supabase functions**
   ```bash
   supabase functions deploy
   ```

## 📱 PWA Installation

PropertyHub can be installed as a Progressive Web App:

1. **Desktop**: Look for the install button in your browser's address bar
2. **Mobile**: Use "Add to Home Screen" option in your browser menu
3. **Features**: Works offline, push notifications, native app-like experience

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the database migrations
3. Set up authentication providers
4. Configure storage buckets
5. Deploy edge functions

### Payment Integration
1. Create Paystack account
2. Get API keys from dashboard  
3. Configure webhook endpoints
4. Test payment flows

### Maps Integration
1. Enable Google Maps JavaScript API
2. Enable Geocoding API
3. Set up API key restrictions
4. Configure allowed domains

## 🏗️ Architecture

### Frontend Structure
- **Components**: Reusable UI components
- **Hooks**: Custom React hooks for state management
- **Utils**: Utility functions and helpers
- **Types**: TypeScript type definitions
- **Styles**: Global CSS and theme configuration

### Backend Structure
- **Edge Functions**: Serverless API endpoints
- **Database**: PostgreSQL with row-level security
- **Storage**: File uploads and media management
- **Real-time**: WebSocket connections for live features

## 📊 Analytics Dashboard

The admin panel includes comprehensive analytics:
- Property performance metrics
- User engagement statistics  
- Revenue and booking trends
- Search behavior analysis
- Geographic distribution insights

## 💬 Chat System

Advanced real-time messaging features:
- **Private Messages**: Direct user-to-user communication
- **Group Chats**: Multi-user conversations
- **Admin Oversight**: Monitor all conversations
- **File Sharing**: Image and document uploads
- **Typing Indicators**: Real-time typing status
- **Message Status**: Delivery and read receipts
- **Offline Support**: Message queuing when offline

## 🔔 Notification System

Comprehensive push notification support:
- **Booking Updates**: Rental confirmations and changes
- **Payment Alerts**: Transaction notifications
- **Chat Messages**: New message alerts
- **System Updates**: Platform announcements
- **Property Alerts**: New listings matching preferences
- **Admin Notifications**: Platform management alerts

## 🎨 Theming

Multiple theme options available:
- **Light/Dark**: Classic light and dark modes
- **Color Themes**: Blue, Green, Purple, Orange variants
- **Custom Themes**: Easily add new color schemes
- **System Sync**: Automatic theme based on device settings

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker
```bash
docker build -t propertyhub .
docker run -p 3000:3000 propertyhub
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for the excellent backend platform
- **Tailwind CSS** for the utility-first CSS framework
- **React** community for the amazing ecosystem
- **Paystack** for seamless payment integration

## 📞 Support

For support, email support@propertyhub.com or join our Discord community.

## 🗺️ Roadmap

- [ ] AI-powered property recommendations
- [ ] Virtual reality property tours
- [ ] Blockchain integration for secure transactions
- [ ] Multi-language support
- [ ] Advanced property management tools
- [ ] IoT integration for smart properties

---

**PropertyHub** - Revolutionizing real estate with modern technology 🏡✨