# Apply Migration to Production Supabase

## CRITICAL: This must be done before carry-forward is re-enabled

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/kxggewdlaujmjyamfcik
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Copy and Run This SQL

```sql
-- Migration: Add unique constraint to prevent duplicate task instances
-- Description: Prevents the same task (identified by client_name + created_at)
--              from appearing multiple times on the same active_date

-- Add unique constraint on task identity per date
-- Task identity: (client_name, created_at) must be unique per active_date
-- This prevents carry-forward race conditions from creating duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_priorities_task_identity_per_date
ON daily_priorities(active_date, client_name, created_at);

-- Note: This allows NULL client_name to appear multiple times on same date
-- (NULL != NULL in SQL), but tasks with actual client names cannot duplicate

COMMENT ON INDEX idx_daily_priorities_task_identity_per_date IS
'Ensures each task (client_name + created_at) appears only once per active_date. Prevents carry-forward duplicates.';
```

### Step 3: Verify Success
You should see: "Success. No rows returned"

### Step 4: Clean Up Existing Duplicates on Tomorrow's Date
Run this to remove the 300 duplicates created earlier:

```sql
-- Remove duplicate tasks from tomorrow, keeping only the first instance
WITH ranked_tasks AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY active_date, client_name, created_at
    ORDER BY created_at ASC
  ) as rn
  FROM daily_priorities
  WHERE active_date > CURRENT_DATE
)
DELETE FROM daily_priorities
WHERE id IN (SELECT id FROM ranked_tasks WHERE rn > 1);
```

This will show how many duplicate rows were deleted (should be ~300).

### Step 5: Confirm
After running both queries, carry-forward will be safe to use automatically.
The unique constraint will prevent any duplicates from being created.
