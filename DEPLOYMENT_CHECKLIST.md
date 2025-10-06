# 🚀 Deployment Checklist - Unified Database

## ✅ Pre-Deployment Checklist

### 1. **Code Changes** ✅
- [x] Updated `.env.example` with Supabase configuration
- [x] Modified `src/lib/supabase.ts` to use environment variables
- [x] Updated `src/contexts/SupabaseContext.tsx` to handle metadata fields
- [x] Created database migration SQL
- [x] `.env.local` is gitignored (credentials won't be committed)

### 2. **Database Migration** ✅
- [x] Migration SQL created: `supabase/migrations/20250106000000_add_metadata_fields.sql`
- [x] Applied to development database
- [x] Verified 67k+ records loaded correctly
- [x] No duplicates confirmed

### 3. **Testing** ✅
- [x] Dev server running successfully
- [x] Data loads from Supabase on startup
- [x] Historical data (67k records) accessible
- [x] Both apps connected to same database

---

## 🔧 Production Deployment Steps

### **Step 1: Commit Code Changes**

```bash
cd "/Users/benmalone/Claude Projects/campaign-trends"

# Add code changes (NOT .env.local!)
git add .env.example
git add src/lib/supabase.ts
git add src/contexts/SupabaseContext.tsx
git add supabase/migrations/

# Add documentation
git add DATABASE_UNIFICATION.md
git add QUICK_START.md
git add SETUP_COMPLETE.md
git add DEPLOYMENT_CHECKLIST.md

# Commit
git commit -m "feat: unified database with display-forecaster

- Add metadata fields to campaign_data table
- Configure Supabase via environment variables
- Migrate to shared database (67k+ records)
- Update data upload to include tracking metadata
- Add comprehensive documentation

🤖 Generated with Claude Code"

# Push to remote
git push origin main
```

### **Step 2: Configure Production Environment Variables**

In your production hosting (Vercel/Netlify/etc), add these environment variables:

```env
VITE_SUPABASE_URL=https://znommdezzgrqbmpluukt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpub21tZGV6emdycWJtcGx1dWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NDg4OTMsImV4cCI6MjA3MzIyNDg5M30.9a_uMi6o0kIP4ALGJf_H71viL680KJRtQvYqBsTpl24

# Also set your auth credentials
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=your-production-password
VITE_ADMIN_PASSWORD=your-admin-password
```

**⚠️ IMPORTANT:** Use the **SAME** credentials for both campaign-trends and display-forecaster production deployments!

### **Step 3: Database Migration** ⚠️

**CRITICAL:** The production database needs the migration applied!

#### Option A: Apply via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/znommdezzgrqbmpluukt/sql
2. Copy SQL from: `supabase/migrations/20250106000000_add_metadata_fields.sql`
3. Paste and run in SQL Editor
4. Verify: Check that columns exist in campaign_data table

#### Option B: Use Supabase CLI
```bash
# Login to Supabase
supabase login

# Link to production project
supabase link --project-ref znommdezzgrqbmpluukt

# Push migration
supabase db push
```

### **Step 4: Deploy Applications**

#### For Vercel:
```bash
# campaign-trends
cd "/Users/benmalone/Claude Projects/campaign-trends"
vercel --prod

# display-forecaster (if not auto-deployed)
cd "/Users/benmalone/Claude Projects/display-forecaster"
vercel --prod
```

#### For Other Platforms:
- Trigger production build/deploy
- Ensure environment variables are set
- Wait for build to complete

### **Step 5: Verify Production**

After deployment:

1. **Open production campaign-trends**
   - Should load 67k+ records automatically
   - Check browser console for Supabase connection
   - Look for: `✅ Supabase client initialized successfully`

2. **Open production display-forecaster**
   - Should show same 67k+ records
   - Verify data matches campaign-trends

3. **Test upload workflow**
   - Upload CSV in one app
   - Refresh other app
   - Verify data appears in both

---

## ⚠️ Important Notes

### **DO NOT Commit:**
- ❌ `.env.local` - Contains credentials
- ❌ `*.html` files - Development/migration tools only
- ❌ `*.sh` scripts with credentials

### **Migration Safety:**
The migration SQL is **safe** and **idempotent**:
- Uses `IF NOT EXISTS` - won't break if re-run
- Only adds columns - doesn't delete data
- Updates existing records safely

### **Rollback Plan:**
If something goes wrong:
1. Old database still exists at `kxggewdlaujmjyamfcik.supabase.co`
2. Can revert `src/lib/supabase.ts` to hardcoded values
3. Data is NOT lost - still in Supabase

---

## 📊 Production Expectations

### After Deployment:
- ✅ Both apps use same database
- ✅ 67k+ records available immediately
- ✅ Upload once, available everywhere
- ✅ No duplicate uploads needed

### Performance:
- Initial load: ~5-10 seconds for 67k records
- Subsequent loads: Cached in browser
- Upload time: Same as before

---

## 🐛 Troubleshooting Production

### "Supabase credentials not configured"
**Fix:** Check production environment variables are set

### "No data loading"
**Fix:** Verify migration was applied to production database

### "Different record counts in each app"
**Fix:** Hard refresh both apps (Cmd+Shift+R)

### "Upload doesn't appear in other app"
**Fix:** Refresh the other app (Cmd+R)

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Both production apps load data
- [ ] Record count matches development (67k+)
- [ ] Upload test works (CSV → both apps)
- [ ] Console shows Supabase connected
- [ ] No errors in browser console
- [ ] Historical data accessible (July 2024+)

---

## 🎉 Ready to Deploy!

All code changes are ready. Just need to:
1. Commit & push changes
2. Set production environment variables
3. Apply database migration
4. Deploy both apps

**Estimated time:** 15-20 minutes

Good luck! 🚀
