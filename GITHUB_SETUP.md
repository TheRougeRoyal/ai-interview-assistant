# GitHub Setup Guide

Follow these steps to upload your AI Interview Assistant project to GitHub.

## Prerequisites

1. Create a GitHub account if you don't have one: https://github.com/signup
2. Install Git on your system if not already installed

## Step-by-Step Instructions

### 1. Initialize Git Repository (if not already initialized)

```bash
cd /home/aakashr/Downloads/sqipe-internship
git init
```

### 2. Configure Git (First Time Only)

Replace with your GitHub email and name:

```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### 3. Check What Will Be Committed

```bash
git status
```

This shows you all files that will be tracked. Verify that sensitive files (.env, .env.local, *.db) are NOT listed.

### 4. Add All Files to Git

```bash
git add .
```

### 5. Create Initial Commit

```bash
git commit -m "Initial commit: AI Interview Assistant platform"
```

### 6. Create a New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `ai-interview-assistant` (or your preferred name)
3. Description: "AI-powered interview platform with dual-tab interface for interviewees and interviewers"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 7. Link Your Local Repository to GitHub

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

Example:
```bash
git remote add origin https://github.com/johndoe/ai-interview-assistant.git
```

### 8. Push to GitHub

For the first push:

```bash
git branch -M main
git push -u origin main
```

You'll be prompted for your GitHub credentials. If you have 2FA enabled, you'll need to use a Personal Access Token instead of your password.

### 9. Create a Personal Access Token (if needed)

If GitHub asks for authentication:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "AI Interview Assistant"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)
7. Use this token as your password when pushing

### 10. Verify Upload

Visit your repository on GitHub to confirm all files are uploaded:
```
https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
```

## Important Security Notes

✅ **Files that SHOULD be uploaded:**
- Source code (*.ts, *.tsx, *.js, *.jsx)
- Configuration files (package.json, tsconfig.json, etc.)
- Documentation (README.md, docs/*)
- Example environment file (env.example)

❌ **Files that should NOT be uploaded:**
- .env, .env.local (contains API keys)
- node_modules/ (dependencies)
- .next/ (build output)
- *.db (database files)
- *.log (log files)

These are already excluded via .gitignore.

## Future Updates

After the initial setup, to push new changes:

```bash
# Check what changed
git status

# Add changed files
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## Troubleshooting

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### Error: "failed to push some refs"
```bash
git pull origin main --rebase
git push origin main
```

### Large file errors
If you accidentally added large files:
```bash
git rm --cached path/to/large/file
echo "path/to/large/file" >> .gitignore
git commit -m "Remove large file"
```

## Alternative: Using GitHub Desktop

If you prefer a GUI:
1. Download GitHub Desktop: https://desktop.github.com/
2. Open GitHub Desktop
3. File → Add Local Repository → Select your project folder
4. Publish repository to GitHub
5. Choose public/private and click "Publish"

## Next Steps

After uploading:
1. Add a LICENSE file (MIT, Apache 2.0, etc.)
2. Set up GitHub Actions for CI/CD (optional)
3. Enable GitHub Pages for documentation (optional)
4. Add repository topics/tags for discoverability
5. Create a .github/CONTRIBUTING.md for contributors

---

**Need help?** Check the GitHub documentation: https://docs.github.com/en/get-started
