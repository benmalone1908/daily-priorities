-- Create contract_terms table for storing campaign contract terms and goals
CREATE TABLE contract_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    cpm DECIMAL(8,4) NOT NULL DEFAULT 0,
    impressions_goal BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on campaign_name for fast lookups
CREATE INDEX idx_contract_terms_campaign_name ON contract_terms(campaign_name);

-- Create unique constraint to prevent duplicate campaign names
CREATE UNIQUE INDEX idx_contract_terms_campaign_name_unique ON contract_terms(campaign_name);

-- Add RLS (Row Level Security) policy if needed
ALTER TABLE contract_terms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on contract_terms" ON contract_terms
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contract_terms_updated_at
    BEFORE UPDATE ON contract_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();