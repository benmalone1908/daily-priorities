-- Fix status CHECK constraint to match TypeScript enum values
-- The original constraint used old values that don't match the application code

-- Drop the existing CHECK constraint on status
ALTER TABLE renewal_status_tracking DROP CONSTRAINT IF EXISTS renewal_status_tracking_status_check;

-- Add the new CHECK constraint with correct values
ALTER TABLE renewal_status_tracking ADD CONSTRAINT renewal_status_tracking_status_check
  CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Completed'));

-- Update the default value to match the new enum
ALTER TABLE renewal_status_tracking ALTER COLUMN status SET DEFAULT 'Not Started';

-- Update any existing rows with old values to new values (if any exist)
UPDATE renewal_status_tracking SET status = 'Not Started' WHERE status = 'Renewal Pending';
UPDATE renewal_status_tracking SET status = 'Completed' WHERE status = 'Recently Renewed';
UPDATE renewal_status_tracking SET status = 'In Progress' WHERE status = 'Live';
UPDATE renewal_status_tracking SET status = 'Not Started' WHERE status = 'Queued';
UPDATE renewal_status_tracking SET status = 'Blocked' WHERE status = 'Paused - Client Request';
