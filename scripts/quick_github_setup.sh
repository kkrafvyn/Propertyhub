#!/bin/bash

# PropertyHub Quick GitHub Setup Script
# This script handles the complete GitHub setup process

set -e

echo "🏡 PropertyHub Quick GitHub Setup"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_header() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Step 1: Check prerequisites
print_header "1. Checking Prerequisites"

if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first: https://git-scm.com/"
    exit 1
fi

print_success "Git is installed: $(git --version)"

# Check if we're in the right directory
if [ ! -f "App.tsx" ] || [ ! -f "package.json" ]; then
    print_error "This doesn't appear to be the PropertyHub project directory."
    print_status "Make sure you're running this script from the PropertyHub root folder."
    exit 1
fi

print_success "PropertyHub project directory confirmed"

# Step 2: Repository URL input
print_header "2. GitHub Repository Setup"

echo ""
echo "First, create a new repository on GitHub:"
echo "1. Go to https://github.com/new"
echo "2. Repository name: 'propertyhub' (or your preferred name)"
echo "3. Description: 'Modern Airbnb-style real estate marketplace'"
echo "4. Choose Public or Private"
echo "5. Do NOT initialize with README, .gitignore, or license"
echo "6. Click 'Create repository'"
echo ""

read -p "Have you created the GitHub repository? (y/n): " repo_created

if [[ $repo_created != "y" && $repo_created != "Y" ]]; then
    print_warning "Please create the repository on GitHub first, then run this script again."
    exit 0
fi

echo ""
echo "Enter your GitHub repository URL:"
echo "Example: https://github.com/yourusername/propertyhub.git"
read -p "Repository URL: " repo_url

if [ -z "$repo_url" ]; then
    print_error "Repository URL cannot be empty!"
    exit 1
fi

# Validate URL format
if [[ ! $repo_url =~ ^https://github\.com/.+/.+\.git$ ]]; then
    print_warning "URL format seems incorrect. Expected: https://github.com/username/repo.git"
    read -p "Continue anyway? (y/n): " continue_anyway
    if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
        exit 0
    fi
fi

# Step 3: Git initialization
print_header "3. Initializing Git Repository"

if [ -d ".git" ]; then
    print_status "Git repository already initialized"
else
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized"
fi

# Step 4: Configure Git (if needed)
print_header "4. Git Configuration Check"

git_name=$(git config --global user.name 2>/dev/null || echo "")
git_email=$(git config --global user.email 2>/dev/null || echo "")

if [ -z "$git_name" ] || [ -z "$git_email" ]; then
    print_warning "Git user configuration needed"
    
    if [ -z "$git_name" ]; then
        read -p "Enter your name: " user_name
        git config --global user.name "$user_name"
    fi
    
    if [ -z "$git_email" ]; then
        read -p "Enter your email: " user_email
        git config --global user.email "$user_email"
    fi
    
    print_success "Git configuration updated"
else
    print_success "Git configured as: $git_name <$git_email>"
fi

# Step 5: Add remote origin
print_header "5. Adding Remote Repository"

if git remote | grep -q "origin"; then
    print_status "Removing existing origin remote..."
    git remote remove origin
fi

print_status "Adding GitHub repository as origin..."
git remote add origin "$repo_url"
print_success "Remote origin added: $repo_url"

# Step 6: Prepare files
print_header "6. Preparing Files for Commit"

# Make scripts executable
if [ -d "scripts" ]; then
    chmod +x scripts/*.sh
    chmod +x *.sh
    print_status "Made scripts executable"
fi

# Check for .env files and warn
if [ -f ".env" ] || [ -f ".env.local" ]; then
    print_warning "Environment files detected. Make sure they're in .gitignore!"
fi

# Step 7: Stage and commit files
print_header "7. Creating Initial Commit"

print_status "Staging all files..."
git add .

# Check if there are any changes to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit. Repository might already be up to date."
else
    print_status "Creating initial commit..."
    git commit -m "🏡 Initial commit: PropertyHub Real Estate Marketplace

✨ Complete feature set:
- Modern React/TypeScript frontend with Tailwind CSS v4
- Supabase backend with 15+ API endpoints
- Real-time chat system with WebSocket support
- PWA capabilities with offline functionality
- Interactive maps with Google Maps integration
- Paystack payment processing integration
- Advanced analytics dashboard with charts
- Multi-theme support (light/dark/colored)
- Mobile-first responsive design
- Role-based access control system
- Enhanced search with intelligent filtering
- Push notification system
- Error tracking and performance monitoring

🛠️ Tech stack:
- Frontend: React 18, TypeScript, Tailwind CSS v4, Motion
- Backend: Supabase, Hono, Edge Functions
- UI: Shadcn/ui components, Lucide icons
- Maps: Google Maps API with geocoding
- Payment: Paystack integration
- Real-time: WebSocket connections
- Build: Vite, ESLint, Prettier
- Deployment: Vercel/Netlify ready

🚀 Production ready with comprehensive documentation"

    print_success "Initial commit created"
fi

# Step 8: Push to GitHub
print_header "8. Pushing to GitHub"

print_status "Setting main branch as default..."
git branch -M main

print_status "Pushing to GitHub..."
git push -u origin main

print_success "🎉 PropertyHub successfully pushed to GitHub!"

# Step 9: Final information
print_header "9. Setup Complete!"

echo ""
echo "🔗 Repository URL: $repo_url"
echo "🌟 Your PropertyHub project is now on GitHub!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your repository: ${repo_url%.git}"
echo "2. Set up automatic deployment:"
echo "   • Vercel: https://vercel.com/new/clone?repository-url=$repo_url"
echo "   • Netlify: https://app.netlify.com/start/deploy?repository=$repo_url"
echo "3. Configure environment variables on your hosting platform"
echo "4. Test your deployed application"
echo ""
echo "📚 Documentation:"
echo "• README.md - Project overview and features"
echo "• DEPLOYMENT.md - Detailed deployment guide"
echo "• GITHUB_SETUP.md - GitHub workflow instructions"
echo ""
echo "🛠️ Development workflow:"
echo "• Make changes to your code"
echo "• Run: ./push_to_github.sh (for quick updates)"
echo "• Or use standard Git commands"
echo ""

print_success "🎉 Happy coding with PropertyHub! 🏡✨"

# Optional: Open repository in browser
echo ""
read -p "Open repository in browser? (y/n): " open_browser
if [[ $open_browser == "y" || $open_browser == "Y" ]]; then
    repo_web_url=${repo_url%.git}
    if command -v xdg-open &> /dev/null; then
        xdg-open "$repo_web_url"
    elif command -v open &> /dev/null; then
        open "$repo_web_url"
    else
        echo "Please visit: $repo_web_url"
    fi
fi