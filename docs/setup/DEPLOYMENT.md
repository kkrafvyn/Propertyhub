# PropertyHub Deployment Guide 🚀

This guide covers deploying your PropertyHub real estate marketplace to various platforms.

## Quick Deploy Options

### 1. Vercel (Recommended for React apps)

**One-click deploy:**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/propertyhub)

**Manual deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 2. Netlify

**One-click deploy:**
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/propertyhub)

**Manual deploy:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### 3. Manual Deployment

```bash
# Build the project
npm run build

# Upload the 'dist' folder to your web server
# Configure your web server to serve index.html for all routes
```

## Environment Variables Setup

### Required Environment Variables

Set these on your hosting platform:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
VITE_APP_NAME=PropertyHub
VITE_APP_VERSION=1.0.0
```

### Platform-Specific Instructions

#### Vercel Environment Variables
1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with its value
4. Redeploy the project

#### Netlify Environment Variables
1. Go to Site settings → Build & deploy → Environment variables
2. Add each variable
3. Trigger a new deploy

## Supabase Backend Deployment

### 1. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
cd supabase/functions
supabase functions deploy server --project-ref your-project-ref
```

### 2. Database Setup

Your Supabase project should have:
- Authentication enabled
- Row Level Security (RLS) configured
- Storage buckets for file uploads
- The `kv_store_8669f8c6` table for key-value storage

### 3. Authentication Providers

Configure social login providers in Supabase Dashboard:
1. Go to Authentication → Providers
2. Enable desired providers (Google, GitHub, etc.)
3. Configure OAuth apps and add credentials

## Domain Configuration

### Custom Domain Setup

#### Vercel
1. Go to project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificates are automatically provisioned

#### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Update DNS records
4. SSL is automatically configured

### DNS Configuration

```
# For apex domain (example.com)
A record: @ → 76.76.19.61 (Vercel) or 104.198.14.52 (Netlify)

# For www subdomain
CNAME record: www → your-app.vercel.app or your-app.netlify.app
```

## SSL/HTTPS Setup

Both Vercel and Netlify provide automatic SSL certificates. For manual deployments:

1. Use Let's Encrypt for free SSL certificates
2. Configure your web server (Nginx/Apache) to redirect HTTP to HTTPS
3. Update Supabase auth settings to use HTTPS URLs

## Performance Optimization

### 1. Build Optimization

The project is already configured with:
- Code splitting for optimal loading
- Automatic asset optimization
- Service worker for PWA functionality
- Compression and minification

### 2. CDN Configuration

Both Vercel and Netlify provide global CDN automatically. For manual deployment:
- Use Cloudflare for CDN and security
- Configure caching headers for static assets
- Enable gzip compression

### 3. Monitoring

Set up monitoring for your deployed app:

```bash
# Add analytics (optional)
VITE_GA_TRACKING_ID=your_google_analytics_id

# Add error tracking (optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

## PWA Deployment

### Mobile App Store Deployment

1. **Generate App Icons**
   - Use tools like PWA Builder or Capacitor
   - Create icons for iOS (1024x1024) and Android (512x512)

2. **Package as Native App**
   ```bash
   # Using Capacitor
   npm install @capacitor/core @capacitor/cli
   npx cap init PropertyHub com.propertyhub.app
   npx cap add ios
   npx cap add android
   npm run build
   npx cap sync
   ```

3. **Submit to App Stores**
   - iOS: Submit to Apple App Store
   - Android: Submit to Google Play Store

## Backup and Monitoring

### 1. Database Backups

Supabase provides automatic backups. For additional security:
- Set up daily database exports
- Store backups in separate cloud storage
- Test backup restoration regularly

### 2. Application Monitoring

```bash
# Health check endpoint
GET https://your-domain.com/api/health

# Monitor key metrics:
# - Response times
# - Error rates
# - User engagement
# - Performance metrics
```

### 3. Uptime Monitoring

Set up monitoring with services like:
- UptimeRobot
- Pingdom
- StatusCake

## Security Checklist

- [ ] Environment variables properly configured
- [ ] HTTPS enabled and enforced
- [ ] CSP headers configured
- [ ] Rate limiting implemented
- [ ] Authentication properly secured
- [ ] API keys restricted to domains
- [ ] Database RLS policies active
- [ ] Regular security updates

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Environment Variables Not Loading**
   - Ensure variables start with `VITE_`
   - Check spelling and casing
   - Restart development server

3. **Supabase Connection Issues**
   - Verify project URL and keys
   - Check network connectivity
   - Ensure functions are deployed

4. **PWA Installation Issues**
   - Verify manifest.json is accessible
   - Check service worker registration
   - Ensure HTTPS is enabled

### Support

For deployment issues:
1. Check the GitHub Issues page
2. Review deployment logs
3. Consult platform-specific documentation
4. Contact platform support if needed

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Supabase functions deployed
- [ ] Database properly set up
- [ ] Authentication providers configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] PWA functionality tested
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Monitoring set up
- [ ] Backup strategy implemented

🎉 **Congratulations!** Your PropertyHub marketplace is now live and ready for users!