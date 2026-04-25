#!/bin/bash

# PropertyHub Local Development Setup Script

set -e

echo "🏡 Setting up PropertyHub for local development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version must be 16 or higher. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Install dependencies
print_status "Installing npm dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local from template..."
    cp .env.example .env.local
    print_warning "Please edit .env.local with your actual API keys and configuration"
fi

# Install Supabase CLI if not present
if ! command -v supabase &> /dev/null; then
    print_status "Installing Supabase CLI..."
    npm install -g supabase
    print_success "Supabase CLI installed"
else
    print_success "Supabase CLI already installed"
fi

# Initialize Supabase (if not already done)
if [ ! -f "supabase/config.toml" ]; then
    print_status "Initializing Supabase project..."
    supabase init
else
    print_success "Supabase already initialized"
fi

# Make scripts executable
chmod +x scripts/*.sh

print_success "🎉 PropertyHub setup completed!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env.local with your API keys:"
echo "   • Supabase URL and keys"
echo "   • Google Maps API key"
echo "   • Paystack public key"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Start Supabase local development (optional):"
echo "   supabase start"
echo ""
echo "4. Deploy Supabase functions:"
echo "   npm run supabase:deploy"
echo ""
echo "🚀 Happy coding with PropertyHub!"