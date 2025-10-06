-- Remove duplicate campaign data records, keeping only the most recent upload
-- This cleans up duplicates created before the unique constraint was fixed

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

-- Show how many records were deleted and how many remain
SELECT
  'Duplicates removed' as status,
  COUNT(*) as total_records
FROM campaign_data;
