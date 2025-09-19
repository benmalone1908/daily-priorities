-- Campaign anomalies table for storing detected anomalies and user preferences
CREATE TABLE IF NOT EXISTS campaign_anomalies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('impression_change', 'transaction_drop', 'transaction_zero')),
  date_detected DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  details JSONB NOT NULL DEFAULT '{}',
  is_ignored BOOLEAN NOT NULL DEFAULT false,
  custom_duration INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for campaign_anomalies
CREATE INDEX IF NOT EXISTS campaign_anomalies_campaign_name_idx ON campaign_anomalies (campaign_name);
CREATE INDEX IF NOT EXISTS campaign_anomalies_date_detected_idx ON campaign_anomalies (date_detected);
CREATE INDEX IF NOT EXISTS campaign_anomalies_type_idx ON campaign_anomalies (anomaly_type);
CREATE INDEX IF NOT EXISTS campaign_anomalies_severity_idx ON campaign_anomalies (severity);
CREATE INDEX IF NOT EXISTS campaign_anomalies_is_ignored_idx ON campaign_anomalies (is_ignored);

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for anomalies
CREATE TRIGGER update_campaign_anomalies_updated_at
    BEFORE UPDATE ON campaign_anomalies
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS) for anomalies
ALTER TABLE campaign_anomalies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous access to anomalies
CREATE POLICY "Allow anonymous access to campaign_anomalies" ON campaign_anomalies
    FOR ALL USING (true);