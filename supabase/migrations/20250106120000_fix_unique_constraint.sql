-- Fix unique constraint to only include date and campaign_order_name
-- This allows proper upsert behavior where re-uploading the same data updates existing records
-- instead of creating duplicates with different uploaded_at timestamps

-- Drop the incorrect unique constraint
DROP INDEX IF EXISTS idx_campaign_data_unique;

-- Create correct unique constraint with only date and campaign_order_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_data_unique
ON campaign_data(date, campaign_order_name);

-- Note: data_source and uploaded_at should NOT be in the unique constraint
-- because we want to update records when the same date/campaign is uploaded again,
-- regardless of when or from where it was uploaded
