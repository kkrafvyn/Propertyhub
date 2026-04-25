
  # Real Estate Marketplace Platform (Copy)

  This is a code bundle for Real Estate Marketplace Platform (Copy). The original project is available at https://www.figma.com/design/2p7F8P7lIdQIWMOyALCsFc/Real-Estate-Marketplace-Platform--Copy-.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend wiring

  The web app now prefers backend API endpoints under `VITE_API_URL` (for example, `http://localhost:8080`) for:
  - messaging (`/api/v1/messages/*`)
  - verification (`/api/v1/verification/*`)
  - landlord analytics (`/api/v1/landlord/*`)
  - utilities (`/api/v1/utilities/*`)

  Services gracefully fall back to direct Supabase queries if a backend endpoint is unavailable.

  ## Capacitor mobile build

  This PWA is configured for Capacitor using `capacitor.config.json`.

  1. Build and sync web assets:
     - `npm run mobile:sync`
  2. Add native platforms (first time only):
     - `npm run mobile:add:android`
     - `npm run mobile:add:ios`
  3. Open native projects:
     - `npm run mobile:open:android`
     - `npm run mobile:open:ios`
  
