-- Campaign data table for storing uploaded CSV data
CREATE TABLE IF NOT EXISTS campaign_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  campaign_order_name TEXT NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  spend DECIMAL(15,2) NOT NULL DEFAULT 0,
  transactions BIGINT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create unique constraint on date + campaign_order_name for upsert functionality
CREATE UNIQUE INDEX IF NOT EXISTS campaign_data_unique_idx
ON campaign_data (date, campaign_order_name);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS campaign_data_date_idx ON campaign_data (date);
CREATE INDEX IF NOT EXISTS campaign_data_campaign_name_idx ON campaign_data (campaign_order_name);
CREATE INDEX IF NOT EXISTS campaign_data_created_at_idx ON campaign_data (created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_campaign_data_updated_at
    BEFORE UPDATE ON campaign_data
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE campaign_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous access (since you're using anon key)
-- You may want to restrict this based on your security requirements
CREATE POLICY "Allow anonymous access to campaign_data" ON campaign_data
    FOR ALL USING (true);