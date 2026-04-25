#!/bin/bash

# PropertyHub GitHub Push Script
# This script helps you quickly push your changes to GitHub

set -e

echo "🏡 PropertyHub GitHub Push Script"
echo "================================="

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

# Check if Git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized!"
fi

# Check if origin remote exists
if ! git remote | grep -q "origin"; then
    echo ""
    print_warning "No origin remote found!"
    echo "Please enter your GitHub repository URL:"
    echo "Example: https://github.com/yourusername/propertyhub.git"
    read -p "Repository URL: " repo_url
    
    if [ -z "$repo_url" ]; then
        print_error "Repository URL cannot be empty!"
        exit 1
    fi
    
    print_status "Adding origin remote..."
    git remote add origin "$repo_url"
    print_success "Origin remote added: $repo_url"
fi

# Show current status
print_status "Checking repository status..."
git status

echo ""
echo "Choose an option:"
echo "1. Quick commit and push (commits all changes)"
echo "2. Interactive commit (choose what to commit)"
echo "3. Push existing commits only"
echo "4. Create new branch and push"
echo "5. Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        read -p "Enter commit message: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update PropertyHub - $(date +'%Y-%m-%d %H:%M')"
        fi
        
        print_status "Adding all changes to staging..."
        git add .
        
        print_status "Committing changes..."
        git commit -m "$commit_msg"
        
        print_status "Pushing to GitHub..."
        git push -u origin main
        
        print_success "🎉 Changes pushed to GitHub successfully!"
        ;;
        
    2)
        print_status "Starting interactive staging..."
        git add -i
        
        echo ""
        read -p "Enter commit message: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update PropertyHub - $(date +'%Y-%m-%d %H:%M')"
        fi
        
        git commit -m "$commit_msg"
        git push -u origin main
        
        print_success "🎉 Changes pushed to GitHub successfully!"
        ;;
        
    3)
        print_status "Pushing existing commits..."
        git push -u origin main
        print_success "🎉 Commits pushed to GitHub successfully!"
        ;;
        
    4)
        echo ""
        read -p "Enter new branch name: " branch_name
        if [ -z "$branch_name" ]; then
            print_error "Branch name cannot be empty!"
            exit 1
        fi
        
        print_status "Creating and switching to new branch: $branch_name"
        git checkout -b "$branch_name"
        
        read -p "Enter commit message: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Feature: $branch_name - $(date +'%Y-%m-%d %H:%M')"
        fi
        
        git add .
        git commit -m "$commit_msg"
        git push -u origin "$branch_name"
        
        print_success "🎉 New branch '$branch_name' created and pushed!"
        print_status "Don't forget to create a Pull Request on GitHub!"
        ;;
        
    5)
        print_status "Goodbye! 👋"
        exit 0
        ;;
        
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
print_status "Repository URL: $(git remote get-url origin)"
print_status "Current branch: $(git branch --show-current)"
print_status "Latest commit: $(git log -1 --pretty=format:'%h - %s (%an, %ar)')"

echo ""
echo "🚀 Next steps:"
echo "• Visit your GitHub repository to see the changes"
echo "• Set up deployment on Vercel or Netlify"
echo "• Configure environment variables on your hosting platform"
echo "• Test your deployed application"

echo ""
print_success "Happy coding with PropertyHub! 🏡✨"