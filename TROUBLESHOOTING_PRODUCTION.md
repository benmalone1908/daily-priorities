# 🔧 Troubleshooting: Production Not Loading Data

## ❌ Problem: Production shows upload screen instead of loading data

This means Supabase environment variables aren't being read in production.

---

## 🔍 Root Cause

Vite environment variables have specific requirements:
- ✅ Must start with `VITE_` prefix
- ⚠️ Must be set in Vercel **before** build
- ⚠️ Vercel needs **redeployment** after adding env vars

---

## ✅ Solution Steps

### 1. Verify Environment Variables in Vercel

Go to: https://vercel.com/[your-account]/campaign-trends/settings/environment-variables

Check that these exist:
```
VITE_SUPABASE_URL=https://znommdezzgrqbmpluukt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important checks:**
- [ ] Variable names are EXACTLY `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] No extra spaces before/after values
- [ ] Applied to "Production" environment
- [ ] Values are complete (the key is very long ~200 characters)

### 2. Trigger a New Deployment

Environment variables are only loaded during **build time**, not runtime!

**Option A: Redeploy in Vercel Dashboard**
1. Go to: https://vercel.com/[your-account]/campaign-trends/deployments
2. Click the "..." menu on latest deployment
3. Click "Redeploy"
4. Check "Use existing Build Cache" = **OFF** (important!)
5. Click "Redeploy"

**Option B: Push a Dummy Commit**
```bash
cd "/Users/benmalone/Claude Projects/campaign-trends"
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push origin main
```

### 3. Verify After Deployment

Once redeployed:
1. Open https://campaign-trends.vercel.app/
2. Open browser console (F12)
3. Look for these logs:

**✅ Success:**
```
🔍 Supabase environment check: { urlExists: true, keyExists: true, ... }
✅ Supabase client initialized successfully
Loading all campaign data...
```

**❌ Still failing:**
```
ℹ️ Supabase credentials not configured - running in CSV-only mode
```

---

## 🐛 Common Mistakes

### Mistake 1: Env vars added AFTER deployment
**Problem**: Vercel builds the app first, THEN you add env vars
**Fix**: Redeploy after adding env vars (see step 2 above)

### Mistake 2: Wrong environment selected
**Problem**: Env vars only set for "Preview" or "Development"
**Fix**: Make sure they're set for "Production" environment

### Mistake 3: Typo in variable names
**Problem**: `VITE_SUPABASE_URL` vs `VITE_SUPABASE_URI` (wrong!)
**Fix**: Double-check spelling exactly matches code

### Mistake 4: Missing `VITE_` prefix
**Problem**: `SUPABASE_URL` instead of `VITE_SUPABASE_URL`
**Fix**: Must start with `VITE_` for Vite to expose them

---

## 📸 Screenshots to Check

### In Vercel Dashboard → Settings → Environment Variables:

Should look like:
```
VITE_SUPABASE_URL
  Production: https://znommdezzgrqbmpluukt.supabase.co

VITE_SUPABASE_ANON_KEY
  Production: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi... (long string)

VITE_AUTH_USERNAME
  Production: admin

VITE_AUTH_PASSWORD
  Production: [your password]

VITE_ADMIN_PASSWORD
  Production: [your admin password]
```

---

## 🔍 Debug: Check Build Logs

To see if env vars are being read:

1. Go to: https://vercel.com/[your-account]/campaign-trends/deployments
2. Click on latest deployment
3. Click "Build Logs"
4. Search for "Supabase" or "environment"

You should see the build process, and Vite will inline the env vars during build.

---

## ⚠️ Important: Vite Env Var Behavior

Vite **inlines** environment variables at **build time**:

```javascript
// Your code:
const url = import.meta.env.VITE_SUPABASE_URL

// After build (if env var exists):
const url = "https://znommdezzgrqbmpluukt.supabase.co"

// After build (if env var missing):
const url = undefined
```

This means:
- ✅ Env vars must exist BEFORE build
- ✅ Must redeploy after adding/changing env vars
- ❌ Can't change env vars without rebuilding

---

## 🎯 Quick Test

To verify env vars are set correctly:

1. Add a temporary console.log to your code:
```javascript
// In src/lib/supabase.ts (temporarily)
console.log('ENV CHECK:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length
})
```

2. Commit and push
3. After deployment, check console
4. Should show: `ENV CHECK: { url: 'https://...', keyLength: 200+ }`

---

## 💡 Alternative: Check Vercel's Environment

You can also verify via Vercel CLI:

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Check production env vars
vercel env pull .env.production

# View the file
cat .env.production
```

This downloads the actual production env vars to verify they're set.

---

## ✅ Success Checklist

After fixing:

- [ ] Environment variables visible in Vercel dashboard
- [ ] Variables applied to "Production" environment
- [ ] Full redeployment triggered (no cache)
- [ ] Browser console shows "✅ Supabase client initialized"
- [ ] App loads 67k+ records automatically
- [ ] No upload screen on first load

---

## 🆘 Still Not Working?

If you've tried everything above and it's still not working:

1. **Double-check the values themselves**
   - Copy from `/Users/benmalone/Claude Projects/campaign-trends/.env.local`
   - Paste directly into Vercel (no manual typing)

2. **Check for hidden characters**
   - Sometimes copy/paste adds invisible characters
   - Re-type the values manually in Vercel

3. **Try a clean deployment**
   - Delete the project from Vercel
   - Re-import from GitHub
   - Set env vars BEFORE first deployment

4. **Verify Supabase URL is correct**
   - Should be: `https://znommdezzgrqbmpluukt.supabase.co`
   - NOT: `kxggewdlaujmjyamfcik` (old database)

---

**Next Step**: Check your Vercel environment variables and trigger a redeploy!
