# Deploy to Vercel - Complete Guide

## Why Vercel?
- **Free tier is generous**: Includes 100GB bandwidth, unlimited sites
- **Built for Next.js**: Vercel created Next.js, so perfect compatibility
- **Easy deployment**: Connect GitHub and auto-deploy on push
- **Better performance**: Edge network optimized for Next.js

## Prerequisites
- GitHub account (to connect your repository)
- Vercel account (free - sign up at vercel.com)

---

## Step 1: Prepare Your Project

### 1.1 Create vercel.json (Optional but Recommended)
This file is already created for you with optimal settings.

### 1.2 Ensure .gitignore is Correct
Your `.gitignore` should already exclude:
- `.env.local` (local environment variables - never commit this!)
- `.vercel` (Vercel build cache)
- `node_modules`

---

## Step 2: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Log In to Vercel
1. Go to https://vercel.com
2. Click "Sign Up" (or "Log In" if you have an account)
3. Choose "Continue with GitHub" (easiest method)
4. Authorize Vercel to access your GitHub

### 3.2 Import Your Project
1. On Vercel dashboard, click **"Add New Project"**
2. Click **"Import Git Repository"**
3. Find your repository in the list and click **"Import"**

### 3.3 Configure Project Settings
Vercel will auto-detect Next.js. Configure these settings:

**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `./` (leave as default)
**Build Command:** `npm run build` (auto-filled)
**Output Directory:** `.next` (auto-filled)
**Install Command:** `npm install` (auto-filled)

### 3.4 Add Environment Variables
This is **CRITICAL**! Click "Environment Variables" and add these three variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: `https://ytmdnkghtnbotbnftlej.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWRua2dodG5ib3RibmZ0bGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzI1MDgsImV4cCI6MjA4MDUwODUwOH0.h4sz9BHDv51FTa6Lf6BvQ8V50LEfIHGHX3dWZYhCxwo`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWRua2dodG5ib3RibmZ0bGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzMjUwOCwiZXhwIjoyMDgwNTA4NTA4fQ.ffFifxIWdm3e4X07QupaKoNEd6hRV3xAjyUyGPRBO8Q`

**Important:** Make sure to select "All" (Production, Preview, and Development) for each environment variable.

### 3.5 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. You'll get a URL like: `https://your-project-name.vercel.app`

---

## Step 4: Configure Supabase for Vercel Domain

After deployment, you need to add your Vercel URL to Supabase's allowed redirect URLs:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/ytmdnkghtnbotbnftlej
2. Click **"Authentication"** in the left sidebar
3. Click **"URL Configuration"**
4. Add your Vercel URL to **"Site URL"**: `https://your-project-name.vercel.app`
5. Add to **"Redirect URLs"**:
   - `https://your-project-name.vercel.app/**`
   - `https://your-project-name.vercel.app/api/auth/callback`

---

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Try logging in with your admin account
3. Test creating a new admin user
4. Verify all features work

---

## Step 6: Set Up Automatic Deployments

Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push

# Vercel will automatically deploy the changes!
```

---

## Managing Your Vercel Project

### View Deployments
- Go to https://vercel.com/dashboard
- Click on your project
- See all deployments, logs, and analytics

### View Build Logs
If deployment fails:
1. Click on the failed deployment
2. Click "View Build Logs"
3. Check for errors

### Update Environment Variables
1. Go to your project on Vercel
2. Click "Settings"
3. Click "Environment Variables"
4. Add/Edit/Delete variables
5. **Important:** Redeploy after changing env vars

---

## Custom Domain (Optional)

Want to use your own domain instead of `.vercel.app`?

1. Go to your project settings on Vercel
2. Click **"Domains"**
3. Enter your domain (e.g., `liberialeague.com`)
4. Follow Vercel's DNS instructions
5. Update Supabase redirect URLs with your custom domain

---

## Troubleshooting

### Build Fails
- Check build logs on Vercel
- Make sure all dependencies are in `package.json`
- Verify no TypeScript errors locally: `npm run build`

### Environment Variables Not Working
- Make sure you selected "All" environments when adding them
- Redeploy after adding/changing env vars
- Check variable names exactly match (case-sensitive)

### Admin Creation Still Failing
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly on Vercel
- Check API route logs in Vercel dashboard
- Run the Supabase SQL fixes we created earlier

### 404 Errors
- Make sure you're using Next.js 13+ App Router (you are)
- Check that file names are correct in `app/` directory

---

## Cost Comparison

### Vercel Free Tier
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Unlimited team members
- ✅ Automatic HTTPS
- ✅ Edge Network (CDN)
- ✅ Analytics (basic)

### Netlify Free Tier
- 100GB bandwidth/month
- 300 build minutes/month (Vercel: unlimited)
- More restrictive for larger projects

**For hobby/small projects: Vercel Free is perfect!**

---

## Next Steps After Deployment

1. ✅ Test all admin features on production
2. ✅ Run the Supabase SQL migrations if you haven't:
   - `fix_profile_trigger_role_update.sql`
   - `debug_and_fix_admin.sql`
3. ✅ Create your admin accounts
4. ✅ Share the URL with your team

---

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Next.js Docs: https://nextjs.org/docs

---

## Security Notes

⚠️ **NEVER commit `.env.local` to GitHub!**
⚠️ **Always add sensitive keys via Vercel dashboard**
⚠️ **Service role key should only be in environment variables**

Your `.gitignore` already protects you, but double-check!
