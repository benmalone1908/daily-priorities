-- Step 1: Add metadata and tracking fields to campaign_data table
-- This migration aligns campaign-trends schema with display-forecaster

-- Add new columns if they don't exist
ALTER TABLE campaign_data
ADD COLUMN IF NOT EXISTS ctr NUMERIC(10,4) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cpm NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cpc NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS roas NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'csv_upload',
ADD COLUMN IF NOT EXISTS user_session_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS orangellow_corrected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_spend NUMERIC(12,2) DEFAULT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_campaign_data_uploaded_at ON campaign_data(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_campaign_data_user_session ON campaign_data(user_session_id);
CREATE INDEX IF NOT EXISTS idx_campaign_data_data_source ON campaign_data(data_source);

-- Update existing records to have uploaded_at if NULL
UPDATE campaign_data
SET uploaded_at = created_at
WHERE uploaded_at IS NULL;

-- Step 2: Fix unique constraint to only include date and campaign_order_name
-- Drop old constraint if it exists
DROP INDEX IF EXISTS idx_campaign_data_unique;

-- Create correct unique constraint with only date and campaign_order_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_data_unique
ON campaign_data(date, campaign_order_name);

-- Add comment explaining the schema
COMMENT ON TABLE campaign_data IS 'Unified campaign performance data table shared between campaign-trends and display-forecaster applications';

-- Step 3: Remove duplicates, keeping only the most recent upload for each date/campaign
WITH ranked_records AS (
  SELECT
    id,
    date,
    campaign_order_name,
    uploaded_at,
    ROW_NUMBER() OVER (
      PARTITION BY date, campaign_order_name
      ORDER BY uploaded_at DESC
    ) as rn
  FROM campaign_data
)
DELETE FROM campaign_data
WHERE id IN (
  SELECT id
  FROM ranked_records
  WHERE rn > 1
);

-- Show final record count
SELECT
  'Migration complete' as status,
  COUNT(*) as total_records
FROM campaign_data;
