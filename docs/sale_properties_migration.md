# Sale Properties Table Migration

Run this SQL in the Supabase SQL Editor:

```sql
-- Create sale_properties table for Real Estate listings
CREATE TABLE IF NOT EXISTS sale_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  price_per_meter BIGINT,
  city TEXT,
  department TEXT,
  location TEXT,
  zona TEXT CHECK (zona IN ('norte', 'sur', 'oriente', 'occidente', 'centro')),
  barrio TEXT,
  estrato INTEGER CHECK (estrato >= 1 AND estrato <= 6),
  metraje INTEGER,
  metraje_construido INTEGER,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  garages INTEGER DEFAULT 0,
  year_built INTEGER,
  property_type TEXT CHECK (property_type IN ('casa', 'apartamento', 'lote', 'local', 'oficina', 'finca')),
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster owner queries
CREATE INDEX idx_sale_properties_owner ON sale_properties(owner_id);

-- Create index for zona and estrato filtering
CREATE INDEX idx_sale_properties_filters ON sale_properties(zona, estrato);

-- Enable RLS
ALTER TABLE sale_properties ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read sale properties
CREATE POLICY "Public can view sale properties" ON sale_properties
  FOR SELECT USING (true);

-- Policy: Owners can insert their own properties
CREATE POLICY "Users can insert own sale properties" ON sale_properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy: Owners can update their own properties
CREATE POLICY "Users can update own sale properties" ON sale_properties
  FOR UPDATE USING (auth.uid() = owner_id);

-- Policy: Owners can delete their own properties
CREATE POLICY "Users can delete own sale properties" ON sale_properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sale_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_properties_updated_at
  BEFORE UPDATE ON sale_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_properties_updated_at();
```

## After Running

Verify the table was created:
```sql
SELECT * FROM sale_properties LIMIT 1;
```
