# PR Review Recommendations: Launch & Renewals Status Feature

## Critical Issues (Must Fix)

### 1. Silent Failure Loading Campaign Data
**File:** `src/pages/RenewalsStatusPage.tsx` (lines 52-73)

**Problem:** The `loadCampaignData` function catches errors and only logs to console. Users see "No upcoming renewals available" when the real issue is a data load failure.

**Fix:** Add toast notification and error state:
```typescript
} catch (error) {
  console.error('Failed to load campaign data:', error);
  toast.error('Could not load upcoming renewals. Please refresh and try again.');
}
```

---

## Important Issues (Should Fix)

### 2. Unused Imports in PrioritySection.tsx
**File:** `src/components/daily-priorities/PrioritySection.tsx` (line 9)

**Problem:** `TableHead`, `TableHeader`, `TableRow` are imported but never used.

**Fix:** Change import to:
```typescript
import { Table, TableBody } from '@/components/ui/table';
```

### 3. Missing Sorting for Records
**Files:**
- `src/pages/RenewalsStatusPage.tsx` (lines 87-88)
- `src/pages/LaunchStatusPage.tsx` (lines 56-57)

**Problem:** Records are filtered but not sorted, causing inconsistent ordering.

**Fix:** Add sorting by renewal_date:
```typescript
const openRecords = trackingRecords
  .filter(r => !r.completed)
  .sort((a, b) => {
    if (!a.renewal_date && !b.renewal_date) return 0;
    if (!a.renewal_date) return 1;
    if (!b.renewal_date) return -1;
    return new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime();
  });
```

### 4. Generic Error Messages on Update/Delete
**File:** `src/hooks/createStatusTrackingHook.ts` (lines 167-171, 189-192)

**Problem:** Update and delete failures show generic messages with no context.

**Fix:** Include error details in toast:
```typescript
onError: (error: unknown) => {
  console.error('Error updating tracking record:', error);
  const errorMessage = (error as { message?: string })?.message || 'Unknown error';
  toast.error(`Failed to update: ${errorMessage}`, {
    duration: 5000,
    description: 'Please try again. If the problem persists, refresh the page.'
  });
}
```

### 5. No Error Boundary
**Files:** `src/pages/LaunchStatusPage.tsx`, `src/pages/RenewalsStatusPage.tsx`

**Problem:** If any child component throws during render, the entire page crashes.

**Fix:** Add error boundary wrapper around main content (consider using `react-error-boundary` package).

---

## Medium Priority (Nice to Have)

### 6. Silent Date Parsing Failure
**File:** `src/pages/RenewalsStatusPage.tsx` (lines 118-128)

**Problem:** When date parsing fails, the error is logged but user isn't notified.

**Fix:** Add toast.warning when date can't be parsed.

### 7. Dialog Closes Before Async Completes
**Files:** Both page components in `handleAddManual` functions

**Problem:** Dialog closes immediately when creating a record, even if the mutation fails.

**Fix:** Await the mutation before closing dialog and clearing form.

### 8. Coupled Fields Not Enforced
**File:** `src/types/daily-priorities.ts`

**Problem:** `completed`/`completed_at` and `notes`/`notes_updated_at` relationships are implicit and can become inconsistent.

**Suggestion:** Consider using discriminated unions or runtime validation to enforce relationships.

---

## Type Design Notes

The type design is functional but could be improved:
- Consider branded types for IDs to distinguish from other strings
- The `completed` field could be derived from `status === 'Completed'` to avoid inconsistency
- Workflow step order is only expressed in UI code, not in types

---

## Files Changed in This Feature

### New Files
- `src/components/status-tracking/StatusTrackingCard.tsx` - Shared card component
- `src/hooks/createStatusTrackingHook.ts` - Hook factory
- `src/hooks/useLaunchStatusTracking.ts` - Launch tracking hook
- `src/pages/LaunchStatusPage.tsx` - Launch status page
- `supabase/migrations/20260127000000_create_launch_status_tracking.sql`
- `supabase/migrations/20260127000001_fix_launch_status_tracking_rls.sql`
- `supabase/migrations/20260127000002_match_renewal_rls_policy.sql`
- `supabase/migrations/20260127000003_add_notes_to_launch_status_tracking.sql`
- `supabase/migrations/20260127000004_add_dsp_creative_setup.sql`

### Modified Files
- `src/App.tsx` - Added LaunchStatusPage route
- `src/components/daily-priorities/PrioritySection.tsx` - Added navigation
- `src/hooks/useRenewalStatusTracking.ts` - Now uses hook factory
- `src/pages/RenewalsStatusPage.tsx` - Uses shared StatusTrackingCard, notes disabled
- `src/types/daily-priorities.ts` - Added dsp_creative_setup field

---

## Feature Summary

- **Launch Status Page**: 3x3 grid layout, 9 checkboxes including DSP Creative Setup, launch-specific labels
- **Renewals Status Page**: 4x2 grid layout, 8 checkboxes, renewal-specific labels, notes disabled
- **Shared Components**: StatusTrackingCard with configurable layout via `useLaunchLabels` prop
