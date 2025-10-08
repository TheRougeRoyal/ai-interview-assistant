#!/bin/bash

# Git Upload Script for AI Interview Assistant
# This script will help you upload your project to GitHub

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   AI Interview Assistant - GitHub Upload Helper               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Configure Git User
echo "Step 1: Configure Git Identity"
echo "================================"
read -p "Enter your email (for GitHub): " user_email
read -p "Enter your name: " user_name

git config user.email "$user_email"
git config user.name "$user_name"

echo "✓ Git identity configured"
echo ""

# Step 2: Create commit
echo "Step 2: Creating Initial Commit"
echo "================================"
git add .
git commit -m "Initial commit: AI Interview Assistant - Full-stack interview platform with AI-powered question generation, scoring, and dual-tab interface"

echo "✓ Initial commit created"
echo ""

# Step 3: Get GitHub repository URL
echo "Step 3: Link to GitHub Repository"
echo "=================================="
echo ""
echo "First, create a new repository on GitHub:"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: ai-interview-assistant (or your choice)"
echo "3. Choose Public or Private"
echo "4. DO NOT initialize with README, .gitignore, or license"
echo "5. Click 'Create repository'"
echo ""
read -p "Enter your GitHub username: " github_user
read -p "Enter repository name (e.g., ai-interview-assistant): " repo_name

github_url="https://github.com/$github_user/$repo_name.git"

# Check if remote exists and remove it
if git remote | grep -q "^origin$"; then
    echo "Removing existing origin..."
    git remote remove origin
fi

git remote add origin "$github_url"

echo "✓ Repository linked to: $github_url"
echo ""

# Step 4: Push to GitHub
echo "Step 4: Pushing to GitHub"
echo "========================="
echo ""
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   ✓ SUCCESS! Your project is now on GitHub!                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "View your repository at:"
    echo "https://github.com/$github_user/$repo_name"
    echo ""
    echo "Next steps:"
    echo "1. Add a LICENSE file"
    echo "2. Update repository description and topics on GitHub"
    echo "3. Enable GitHub Pages (optional)"
    echo "4. Set up GitHub Actions for CI/CD (optional)"
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   ⚠ Upload failed. Check the error message above.             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Common issues:"
    echo "1. Authentication failed - You may need a Personal Access Token"
    echo "2. Repository doesn't exist - Create it on GitHub first"
    echo "3. Network issues - Check your internet connection"
    echo ""
    echo "For Personal Access Token:"
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Generate new token (classic)"
    echo "3. Select 'repo' scope"
    echo "4. Use token as password when prompted"
fi
