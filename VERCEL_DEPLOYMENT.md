# Vercel Deployment Guide

This guide will help you deploy your wedding website to Vercel.

## 📋 Pre-Deployment Checklist

### Files Created/Modified for Vercel

- ✅ `vercel.json` - Vercel configuration for routing and headers
- ✅ `api/index.ts` - Serverless function for API endpoints
- ✅ `.env.example` - Template showing required environment variables
- ✅ `client/utils/supabase.ts` - Updated to use environment variables
- ✅ `package.json` - Added `vercel-build` script
- ✅ `vite.config.ts` - Optimized build configuration

## 🔧 Environment Variables Setup

You'll need to configure these environment variables in your Vercel project dashboard:

### Required Variables

1. **VITE_SUPABASE_URL**
   - Description: Your Supabase project URL
   - Example: `https://hgxwtwdvklcytmtsckpa.supabase.co`
   - Where to find: Supabase Dashboard → Settings → API → Project URL
   - Scope: Client-side (will be embedded in build)

2. **VITE_SUPABASE_ANON_KEY**
   - Description: Supabase anonymous/public key
   - Where to find: Supabase Dashboard → Settings → API → Project API keys → anon public
   - Scope: Client-side (safe to expose)

3. **SUPABASE_URL**
   - Description: Your Supabase project URL (server-side)
   - Same value as VITE_SUPABASE_URL
   - Scope: Server-side only

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Description: Supabase service role key (has admin privileges)
   - Where to find: Supabase Dashboard → Settings → API → Project API keys → service_role
   - ⚠️ **CRITICAL**: Never expose this in client code!
   - Scope: Server-side only (for API routes)

### Optional Variables

5. **PING_MESSAGE**
   - Description: Test message for `/api/ping` endpoint
   - Default: `"ping"`
   - Example: `"pong"`

6. **VITE_PUBLIC_BUILDER_KEY**
   - Description: Builder.io API key (if using)
   - Only needed if you're using Builder.io

## 🚀 Deployment Steps

### 1. Push Code to Git Repository

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect the framework as **Vite**

### 3. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run vercel-build` (or it will use the `build` field in vercel.json)
- **Output Directory**: `dist/spa`
- **Install Command**: `npm install`

### 4. Add Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add each variable from the list above:
   - Variable name (e.g., `VITE_SUPABASE_URL`)
   - Value (get from Supabase dashboard)
   - Select which environments: **Production**, **Preview**, **Development** (select all)
3. Click "Save"

### 5. Deploy!

Click **"Deploy"** and Vercel will:
1. Install dependencies
2. Run the build command
3. Deploy your static files to their CDN
4. Deploy your API functions as serverless functions
5. Give you a URL like: `https://your-project-name.vercel.app`

## ✅ Post-Deployment Verification

### Test the Deployment

1. **Homepage**
   - Visit: `https://your-project.vercel.app`
   - Should load the landing page
   - Check browser console for errors

2. **Client-Side Routing**
   - Visit: `https://your-project.vercel.app/login`
   - Should load the login page (not 404)
   - Refresh the page - should still work

3. **API Endpoints**
   - Test ping: `https://your-project.vercel.app/api/ping`
   - Should return: `{"message":"pong"}` (or your PING_MESSAGE)

4. **Authentication**
   - Try logging in with test credentials
   - Should connect to Supabase successfully
   - Check that session persists on page refresh

5. **Admin Routes**
   - Visit: `https://your-project.vercel.app/admin/login`
   - Should load admin login page
   - Try logging in as admin
   - Check admin dashboard loads

6. **Protected Routes**
   - Try accessing `/dashboard` without logging in
   - Should redirect to `/login`

7. **Create Invitation API**
   - Log in as admin
   - Try creating a test invitation
   - Should successfully call `/api/admin/invitations/create`

### Check for Common Issues

- [ ] **404 on refresh**: Ensure `vercel.json` routes configuration is correct
- [ ] **API 500 errors**: Check Vercel Function Logs for errors
- [ ] **Blank pages**: Check browser console for JavaScript errors
- [ ] **Supabase connection errors**: Verify environment variables are set correctly
- [ ] **CORS errors**: Check API headers configuration in `vercel.json`

## 🔍 Debugging

### View Logs

1. Go to your Vercel project dashboard
2. Click on the deployment
3. Navigate to **Functions** tab to see serverless function logs
4. Check for any errors in the logs

### View Build Logs

1. Click on a deployment
2. View the **Build Logs** tab
3. Look for any build errors or warnings

### Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Verify all required variables are set
3. Click "Redeploy" after changing variables

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only in server-side environment variables
- [ ] `.env` file is in `.gitignore` (not committed to git)
- [ ] Production environment variables are set in Vercel dashboard
- [ ] Supabase RLS policies are configured properly
- [ ] Admin routes require authentication

## 🎯 Performance Optimization

The build is configured to:
- ✅ Code splitting (vendor chunks for React, UI libraries, Supabase)
- ✅ Minification with esbuild
- ✅ No source maps in production (smaller bundle)
- ✅ Static asset optimization by Vercel CDN
- ✅ Serverless functions for API routes

## 📱 Custom Domain (Optional)

To add a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `wedding.example.com`)
3. Configure DNS records as instructed by Vercel
4. Vercel will auto-provision SSL certificate

## 🔄 Continuous Deployment

Every time you push to your repository:
- Vercel automatically builds and deploys
- Preview deployments for pull requests
- Production deployments for the main branch

## 🆘 Troubleshooting

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API routes return 404
- Check `api/index.ts` exports the serverless function correctly
- Verify `vercel.json` routes configuration
- Check deployment logs for function deployment success

### Environment variables not working
- Ensure variable names start with `VITE_` for client-side
- Redeploy after adding environment variables
- Check that variables are selected for the right environment (Production/Preview/Development)

### Supabase connection timeout
- Verify Supabase project is not paused
- Check environment variables match your Supabase project
- Test Supabase connection from Supabase dashboard

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
- **Supabase Docs**: https://supabase.com/docs

---

## Summary

Your wedding website is now configured for Vercel deployment with:

- ✅ Serverless API functions
- ✅ Client-side routing (SPA)
- ✅ Environment variable management
- ✅ Optimized production build
- ✅ CORS configured for API routes
- ✅ Secure Supabase integration

**Ready to deploy!** 🚀
