# GitHub Upload - Quick Reference

## 🚀 One-Command Upload

```bash
./upload-to-github.sh
```

## 📝 Manual Upload (5 Steps)

### 1. Set Git Identity
```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

### 2. Commit Files
```bash
git add .
git commit -m "Initial commit: AI Interview Assistant"
```

### 3. Create GitHub Repo
→ https://github.com/new
- Name: `ai-interview-assistant`
- Don't check any initialization boxes
- Click "Create repository"

### 4. Link Repository
```bash
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
```

### 5. Push
```bash
git push -u origin main
```

## 🔑 Personal Access Token (if 2FA enabled)

1. → https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Select scope: **repo**
4. Copy token
5. Use as password when pushing

## ⚡ Future Updates

```bash
git add .
git commit -m "Your change description"
git push
```

## 🆘 Common Fixes

**Authentication failed:**
```bash
# Use Personal Access Token as password
```

**Origin already exists:**
```bash
git remote remove origin
git remote add origin https://github.com/USER/REPO.git
```

**Push rejected:**
```bash
git pull origin main --rebase
git push origin main
```

## 📦 What's Included

✅ All source code  
✅ Documentation  
✅ Configuration  
❌ .env files (secrets)  
❌ node_modules  
❌ Database files  
❌ Build artifacts  

## 📖 Full Guides

- **UPLOAD_GUIDE.md** - Detailed instructions
- **GITHUB_SETUP.md** - Step-by-step setup
- **PRE_UPLOAD_CHECKLIST.md** - Security checks

---

**Ready? Run:** `./upload-to-github.sh`
