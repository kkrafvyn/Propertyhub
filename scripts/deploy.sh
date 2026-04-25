#!/bin/bash

# PropertyHub Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🏡 Starting PropertyHub deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    print_warning "No .env.local file found. Please create one from .env.example"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Type checking
print_status "Running TypeScript type checking..."
npm run type-check

# Linting
print_status "Running ESLint..."
npm run lint

# Build the project
print_status "Building PropertyHub for production..."
npm run build

# Deploy Supabase functions
print_status "Deploying Supabase Edge Functions..."
if command -v supabase &> /dev/null; then
    cd supabase/functions
    supabase functions deploy server
    cd ../..
    print_success "Supabase functions deployed successfully!"
else
    print_warning "Supabase CLI not found. Skipping function deployment."
fi

print_success "🎉 PropertyHub deployment completed successfully!"
print_status "Your app is ready to be deployed to your hosting platform."

# Platform-specific deployment instructions
echo ""
echo "📚 Next steps:"
echo "• For Vercel: Run 'vercel --prod'"
echo "• For Netlify: Run 'netlify deploy --prod --dir=dist'"
echo "• For manual deployment: Upload the 'dist' folder to your web server"
echo ""
echo "Don't forget to:"
echo "• Set up environment variables on your hosting platform"
echo "• Configure your custom domain"
echo "• Set up SSL/TLS certificates"
echo "• Test all functionality in production"