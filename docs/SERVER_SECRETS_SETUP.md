# Server Secrets Setup

PropertyHub keeps browser-safe configuration in `.env.local` and server-only secrets in Supabase Edge Function secrets or Vercel project environment variables.

## Keep In Client Env Files Only

These values are safe for Vite client builds:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_EDGE_FUNCTION_NAME=
VITE_API_URL=
VITE_WEBSOCKET_URL=
VITE_GOOGLE_MAPS_API_KEY=
VITE_MAPBOX_ACCESS_TOKEN=
VITE_MAP_DISPLAY_PROVIDER=
VITE_VAPID_PUBLIC_KEY=
VITE_PAYSTACK_PUBLIC_KEY=
VITE_FLUTTERWAVE_PUBLIC_KEY=
VITE_STRIPE_PUBLIC_KEY=
```

## Never Put These In `.env.local`

These are server-only values and should live in Supabase function secrets, Vercel envs, or another secure deployment secret store:

```env
SUPABASE_SERVICE_ROLE_KEY=
BACKEND_PAYSTACK_SECRET_KEY=
BACKEND_FLUTTERWAVE_SECRET_KEY=
BACKEND_FLUTTERWAVE_ENCRYPTION_KEY=
BACKEND_WEBHOOK_SECRET_PAYSTACK=
BACKEND_WEBHOOK_SECRET_FLUTTERWAVE=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

## Supabase Edge Function Secrets

Use these for the function in `supabase/functions/server/index.tsx`.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set BACKEND_PAYSTACK_SECRET_KEY="..."
supabase secrets set BACKEND_FLUTTERWAVE_SECRET_KEY="..."
supabase secrets set BACKEND_FLUTTERWAVE_ENCRYPTION_KEY="..."
supabase secrets set BACKEND_WEBHOOK_SECRET_PAYSTACK="..."
supabase secrets set BACKEND_WEBHOOK_SECRET_FLUTTERWAVE="..."
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:admin@example.com"
```

Redeploy the function after updating secrets:

```bash
supabase functions deploy server
```

## Vercel Project Environment Variables

If your Vercel deployment needs the same secrets for server-side routes, workers, or preview validation, add them to Vercel instead of the repo:

```bash
vercel env add BACKEND_PAYSTACK_SECRET_KEY production
vercel env add BACKEND_FLUTTERWAVE_SECRET_KEY production
vercel env add BACKEND_FLUTTERWAVE_ENCRYPTION_KEY production
vercel env add BACKEND_WEBHOOK_SECRET_PAYSTACK production
vercel env add BACKEND_WEBHOOK_SECRET_FLUTTERWAVE production
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env add VAPID_SUBJECT production
```

Then pull fresh local envs if needed:

```bash
vercel env pull .env.local --yes
```

## Mobile Notes

- Push notifications use the public VAPID key from the Supabase function endpoint when available, so the browser bundle does not need private VAPID data.
- Biometric support is native-only and now depends on `@aparajita/capacitor-biometric-auth`.
- iOS Face ID usage text is configured in `ios/App/App/Info.plist`.
- After installing native plugins, sync Capacitor:

```bash
npm run mobile:sync
```
