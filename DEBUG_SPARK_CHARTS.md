# 🔍 Debug Spark Charts - Production Issue

## Issue: Spark charts are empty on production

**Other charts work fine:**
- ✅ Combo chart shows data
- ✅ Weekly comparison table shows data
- ❌ Spark charts are empty

## Quick Console Tests

Run these in the browser console on production (https://campaign-trends.vercel.app/):

### Test 1: Check if data exists
```javascript
// Open React DevTools and find the Index component state
// Or check localStorage
localStorage.getItem('campaign-trends-data') !== null
```

### Test 2: Check campaign names in Network tab
1. Open DevTools → Network tab
2. Refresh page
3. Find request to `znommdezzgrqbmpluukt.supabase.co/rest/v1/campaign_data`
4. Click it → Preview tab
5. Look at first few rows
6. Check the `campaign_order_name` field - what do they look like?

### Test 3: Check date format
In same Network request Preview:
- What format is the `date` field?
- Should be: `"7/15/2024"` or `"2024-07-15"`

### Test 4: Check for console errors
Look for any warnings/errors that mention:
- "parseDateString"
- "extractAdvertiserName"
- "extractAgencyInfo"
- "spark"
- "filter"

## Potential Issues

### Issue 1: Campaign Name Parsing
If campaign names don't match the expected format, the agency/advertiser extraction fails, and all data gets filtered out.

**Expected formats:**
- `"2001367: HRB: District Cannabis-241217"`
- `"2001569/2001963: MJ: Test Client-250501"`
- `"Awaiting IO: PRP: Advertiser-Campaign-250501"`

**If names are different**, spark charts won't group them properly.

### Issue 2: Date Parsing
If dates from Supabase are in a format the app doesn't recognize, they'll be filtered out.

### Issue 3: Test Campaign Filter
If campaigns are being incorrectly identified as "test campaigns", they'll be filtered out.

**Test keywords:** 'test', 'demo', 'draft', 'TST' agency code

### Issue 4: Empty Filter State
Some filter might be defaulting to "show nothing" instead of "show everything".

## What to Check on Production

1. **Scroll to spark charts section**
   - Are there any dropdowns/filters above the charts?
   - What are they set to?
   - Try changing them

2. **Check the tabs**
   - There might be Campaign/Advertiser/Agency tabs
   - Try switching between them

3. **Take a screenshot**
   - Show the spark charts section
   - Include any filters/controls
   - Include browser console if there are errors

## Likely Fix

Based on the symptoms, most likely one of these:

1. **Campaign names from migration don't match regex patterns**
   - Need to update `extractAgencyInfo()` or `extractAdvertiserName()`

2. **Default filter state is wrong**
   - Need to initialize filters to "show all" not "show none"

3. **Test campaign detection is too aggressive**
   - Marking real campaigns as test campaigns

---

**Next:** Share screenshot or results from console tests above!
