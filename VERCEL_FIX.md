# Fix Vercel Deployment Issue

## Problem
Vercel is deploying but showing OLD code. The live site still has:
- Team count showing 0 (should be 32)
- Login/Dashboard buttons still visible
- Old footer with League Rules and Privacy Policy

## Root Cause
Vercel's auto-deployment is stuck or cached. Commits are pushed to GitHub but Vercel isn't building the latest code.

## Solution - Manual Steps Required

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your project (the one connected to www.liberialeagues.com)

### Step 2: Check Current Deployment
1. Click "Deployments" tab
2. Look at the latest deployment
3. Check the commit message - it should say "Force rebuild: Clean up debug logging and verify all changes"
4. If it shows an older commit, that's the problem

### Step 3: Force a Fresh Deployment (Choose ONE method)

**Method A: Redeploy with No Cache (RECOMMENDED)**
1. Click on the latest deployment
2. Click the 3 dots menu (...) in the top right
3. Select "Redeploy"
4. **IMPORTANT:** Check the box "Redeploy without using cache"
5. Click "Redeploy" button
6. Wait 2-3 minutes for build to complete

**Method B: Delete and Reconnect (If Method A doesn't work)**
1. Go to Settings → Git
2. Click "Disconnect" to disconnect the GitHub repo
3. Wait 10 seconds
4. Click "Connect Git Repository"
5. Select `Santos1134/localLeagues` (or `Santos1134/localleagues` - note the lowercase)
6. Select branch: `main`
7. Click "Deploy"

**Method C: Check Build Settings**
1. Go to Settings → General
2. Scroll to "Build & Development Settings"
3. Verify:
   - Framework Preset: Next.js
   - Build Command: `next build` (or leave blank for auto-detect)
   - Output Directory: `.next` (or leave blank)
   - Install Command: `npm install` (or leave blank)
4. If anything looks wrong, fix it and click "Save"
5. Go back to Deployments and trigger a redeploy

### Step 4: Verify Environment Variables
1. Go to Settings → Environment Variables
2. Make sure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. If missing, add them and redeploy

### Step 5: After Deployment Completes
1. Wait for "Ready" status with green checkmark ✅
2. Click on the deployment URL
3. You should now see:
   - ✅ Teams count: 32
   - ✅ No Login/Dashboard buttons
   - ✅ Footer without League Rules/Privacy Policy
   - ✅ Active cups section (if you have active cups)
4. Visit www.liberialeagues.com
5. Press Ctrl + Shift + R (hard refresh)
6. Verify the changes are live

## If Still Not Working

If none of the above works, the issue might be:
1. **GitHub webhook not configured** - Check Settings → Git → GitHub Integration
2. **Wrong branch selected** - Make sure it's deploying from `main` branch
3. **Build failing silently** - Check the build logs in the deployment details

## Alternative: Deploy via CLI
If dashboard methods don't work, you can deploy via CLI:

```bash
npx vercel --prod
```

This will deploy directly from your local code.
