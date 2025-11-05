# Fix: Agency & Advertiser Filters Now Show All Data

## Problem
When creating a new task in Daily Priorities, the Agency and Advertiser dropdown filters were empty or only showing manually entered values from previous tasks. This was because the filters were only querying the `daily_priorities` table, which had very few entries.

The 67,000+ campaign records with all agencies and advertisers were in the shared `campaign_data` table but weren't being used.

## Solution
Updated two hooks to query **both** data sources:

### Files Modified

1. **[src/hooks/useAgenciesList.ts](src/hooks/useAgenciesList.ts)**
   - Now queries `campaign_data` table (67k+ records)
   - Extracts agency names from campaign names using regex patterns
   - Also queries `daily_priorities` for manually entered agencies
   - Returns combined, deduplicated, sorted list

2. **[src/hooks/useAdvertisersList.ts](src/hooks/useAdvertisersList.ts)**
   - Now queries `campaign_data` table (67k+ records)
   - Extracts advertiser names from campaign names using regex patterns
   - Also queries `daily_priorities` for manually entered advertisers
   - Returns combined list + agency-to-advertiser mapping

## Technical Details

### Data Sources
Both hooks now query:
1. **`campaign_data` table** - Uses `CampaignFilterContext` regex patterns to parse campaign names like:
   - `"2001367: HRB: District Cannabis-241217"` → Agency: "Harvest Road Beverages", Advertiser: "District Cannabis"
   - `"2001569/2001963: MJ: Test Client-Campaign Name-250501"` → Agency: "Media Jel", Advertiser: "Test Client"

2. **`daily_priorities` table** - Gets manually entered values from existing tasks

### Benefits
- ✅ All agencies from 67k+ campaigns now appear in dropdown
- ✅ All advertisers from 67k+ campaigns now appear in dropdown
- ✅ Agency filter updates advertiser dropdown (existing functionality preserved)
- ✅ Can still create new agencies/advertisers by typing custom values
- ✅ Backward compatible with existing tasks
- ✅ Longer cache time (5 minutes vs 1 minute) since campaign data changes infrequently

## Components Affected
Both modals automatically benefit from this fix:
- [AddTaskModal.tsx](src/components/daily-priorities/AddTaskModal.tsx)
- [EditTaskModal.tsx](src/components/daily-priorities/EditTaskModal.tsx)

## Testing
To verify the fix works:

1. Start the dev server:
   ```bash
   cd "/Users/benmalone/Claude Projects/daily-priorities"
   npm run dev
   ```

2. Open the application at http://localhost:8081

3. Click "Add Task" in any priority section

4. Open the **Agency** dropdown - should now show all agencies from campaign data

5. Select an agency (e.g., "Media Jel")

6. Open the **Advertiser** dropdown - should show all advertisers for that agency

7. Console logs will show:
   ```
   [useAgenciesList] Found 15 unique agencies from 67000 campaigns + 5 tasks
   [useAdvertisersList] Found 200 unique advertisers from 67000 campaigns + 5 tasks
   ```

## Build Status
- ✅ TypeScript compilation: **PASSED**
- ✅ ESLint: **PASSED** (0 errors, 7 pre-existing warnings)
- ✅ Build: **SUCCESS** (dist created in 2.56s)

## Performance Notes
- **Initial Load**: First query processes 67k records but caches for 5 minutes
- **Subsequent Loads**: Uses React Query cache (instant)
- **Regex Parsing**: Uses existing optimized patterns from `CampaignFilterContext`
- **Memory**: Minimal - only stores unique strings in Set/Map structures

## Code Quality
- ✅ Added comprehensive JSDoc comments
- ✅ Error handling for both query sources
- ✅ Console logging for debugging
- ✅ Maintains existing functionality (agency filtering, custom values)
- ✅ Type-safe TypeScript throughout
