-- Add metadata and tracking fields to campaign_data table
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

-- Update unique constraint to prevent exact duplicates
-- Drop old constraint if it exists
DROP INDEX IF EXISTS idx_campaign_data_unique;

-- Create new unique constraint including data tracking fields
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_data_unique
ON campaign_data(date, campaign_order_name, data_source, uploaded_at);

-- Update existing records to have uploaded_at if NULL
UPDATE campaign_data
SET uploaded_at = created_at
WHERE uploaded_at IS NULL;

-- Add comment explaining the schema
COMMENT ON TABLE campaign_data IS 'Unified campaign performance data table shared between campaign-trends and display-forecaster applications';
