-- Add 'Renewal Activated' to the renewal_status options

-- Update the comment to reflect the new status option
COMMENT ON COLUMN campaign_renewals.renewal_status IS 'Status values: Awaiting Confirmation, Confirmed - Pending Submission, Renewal Submitted, Renewal Activated, Not Renewing';

-- Add a CHECK constraint to enforce valid status values (optional but recommended)
ALTER TABLE campaign_renewals
  ADD CONSTRAINT valid_renewal_status
  CHECK (renewal_status IN (
    'Awaiting Confirmation',
    'Confirmed - Pending Submission',
    'Renewal Submitted',
    'Renewal Activated',
    'Not Renewing'
  ));
