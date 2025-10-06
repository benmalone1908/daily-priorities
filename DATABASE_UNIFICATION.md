# Database Unification Guide

This document describes how campaign-trends and display-forecaster now share a unified Supabase database.

## Overview

Both `campaign-trends` and `display-forecaster` can now use the **same Supabase database** to store campaign performance data. This means:

- ✅ **Upload once, use everywhere** - CSV data uploaded to either app is available in both
- ✅ **No data duplication** - Single source of truth for all campaign data
- ✅ **Enhanced tracking** - Metadata fields track data source, upload time, and user sessions
- ✅ **Backwards compatible** - Existing features continue to work

## Setup Instructions

### 1. Run the Database Migration

First, apply the schema migration to add the new metadata fields:

```sql
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kxggewdlaujmjyamfcik/sql

-- Or run the migration file directly:
-- supabase/migrations/20250106000000_add_metadata_fields.sql
```

The migration adds these new fields to the `campaign_data` table:
- `ctr`, `cpm`, `cpc`, `roas` - Calculated performance metrics
- `data_source` - Tracks where data came from ('csv_upload', etc.)
- `user_session_id` - Groups uploads by session
- `uploaded_at` - Timestamp of when data was uploaded
- `orangellow_corrected` - Flag for corrected spend data
- `original_spend` - Original spend before correction

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Use the SAME credentials from display-forecaster
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Use the **exact same credentials** from your `display-forecaster/.env.local` to ensure both projects connect to the same database.

### 3. Test the Setup

1. Start the dev server: `npm run dev`
2. Log in to the application
3. Upload a campaign CSV file
4. Verify data appears in both projects
5. Check that the new metadata fields are populated

## Schema Changes

### New Fields Added

| Field | Type | Purpose |
|-------|------|---------|
| `ctr` | NUMERIC(10,4) | Click-through rate (optional) |
| `cpm` | NUMERIC(10,2) | Cost per mille/thousand (optional) |
| `cpc` | NUMERIC(10,2) | Cost per click (optional) |
| `roas` | NUMERIC(10,2) | Return on ad spend (optional) |
| `data_source` | TEXT | Source of data (default: 'csv_upload') |
| `user_session_id` | TEXT | Session ID for grouping uploads |
| `uploaded_at` | TIMESTAMPTZ | When data was uploaded |
| `orangellow_corrected` | BOOLEAN | Whether spend was corrected |
| `original_spend` | NUMERIC(12,2) | Original spend before correction |

### Updated Constraints

The unique constraint now includes metadata fields to prevent exact duplicates:

```sql
UNIQUE (date, campaign_order_name, data_source, uploaded_at)
```

This allows the same campaign/date to have multiple entries if they came from different sources or upload sessions.

## How It Works

### Upload Process

1. User uploads CSV file in either app
2. System generates `uploaded_at` timestamp and `user_session_id` for the batch
3. Each row is tagged with these metadata fields
4. Data is upserted to the shared `campaign_data` table
5. Both apps can now access this data

### Data Retrieval

When either app queries the database:
- Uses standard filters (date range, campaign name, etc.)
- Can optionally filter by `data_source` or `user_session_id`
- Metadata fields are available for tracking and auditing

## Benefits

### Single Upload Workflow
Upload your campaign performance CSV **once** and access it from:
- Campaign Trends (performance monitoring, anomaly detection)
- Display Forecaster (forecasting, budget analysis)

### Enhanced Data Tracking
- See when data was last uploaded
- Track which app uploaded the data
- Group uploads by session for better organization
- Audit trail for data corrections

### Consistent Data
- No risk of data drift between applications
- Same metrics, same numbers, everywhere
- Easier to maintain and debug

## Troubleshooting

### "Supabase credentials not configured"

**Solution:** Make sure `.env.local` exists and contains valid credentials:

```bash
# Check if file exists
ls -la .env.local

# Verify contents (don't commit this file!)
cat .env.local
```

### "Table does not exist" errors

**Solution:** Run the migration SQL script in Supabase dashboard:
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Paste the contents of `supabase/migrations/20250106000000_add_metadata_fields.sql`
3. Click "Run"

### Data not appearing in other app

**Solution:** Verify both apps use the same Supabase credentials:

```bash
# campaign-trends/.env.local
cat .env.local | grep SUPABASE

# display-forecaster/.env.local
cat ../display-forecaster/.env.local | grep SUPABASE
```

URLs and keys should match exactly.

## Migration Status

- ✅ Schema updated with metadata fields
- ✅ TypeScript types updated
- ✅ SupabaseContext handles new fields
- ✅ Environment-based configuration
- ✅ Backwards compatible with existing data
- ✅ Ready for unified database usage

## Next Steps

1. Apply the SQL migration to your Supabase database
2. Update both projects' `.env.local` files with matching credentials
3. Test uploading data in one app and viewing in the other
4. Enjoy single-upload workflow! 🎉

## Support

If you encounter issues:
1. Check the browser console for Supabase connection errors
2. Verify environment variables are loaded (check the console logs)
3. Confirm the migration was applied successfully
4. Review the Supabase logs in your dashboard
