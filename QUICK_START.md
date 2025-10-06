# Quick Start: Shared Database Setup

## TL;DR - Get Started in 3 Steps

### Step 1: Run the Setup Script

```bash
./setup-shared-database.sh
```

This will automatically copy Supabase credentials from `display-forecaster` to `campaign-trends`.

### Step 2: Apply Database Migration

Go to your Supabase SQL Editor:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

Copy and run the migration:
```bash
cat supabase/migrations/20250106000000_add_metadata_fields.sql
```

Paste and execute in Supabase dashboard.

### Step 3: Restart Dev Server

```bash
npm run dev
```

**Done!** Both apps now share the same database. 🎉

---

## What Changed?

### Before
- ❌ Upload CSV to `campaign-trends` → data only in campaign-trends
- ❌ Upload CSV to `display-forecaster` → data only in display-forecaster
- ❌ Need to upload the same file twice

### After
- ✅ Upload CSV to **either app** → data available in **both apps**
- ✅ Single source of truth
- ✅ Upload once, use everywhere

## Verify It's Working

1. **Check Environment Variables:**
   ```bash
   grep SUPABASE .env.local
   ```
   Should show valid URL and key (not placeholder values)

2. **Check Console Logs:**
   Open browser dev tools, look for:
   ```
   ✅ Supabase client initialized successfully
   ```

3. **Upload Test:**
   - Upload CSV in campaign-trends
   - Open display-forecaster
   - Data should appear in both

## Troubleshooting

### "Supabase credentials not configured"

**Fix:** Create/update `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### "Invalid API key"

**Fix:** Ensure both projects use **exact same** credentials:
```bash
# Compare credentials
diff .env.local ../display-forecaster/.env.local
```

### Migration errors

**Fix:** Make sure you're running the SQL in the correct Supabase project:
1. Check project ID in URL
2. Verify you're logged in
3. Run migration again

## Need More Info?

See [DATABASE_UNIFICATION.md](./DATABASE_UNIFICATION.md) for full details.
