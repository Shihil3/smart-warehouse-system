ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS rack_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 10;

-- Give existing rack-type locations a default rack_id based on their id
UPDATE locations
  SET rack_id = 'R-' || LPAD(id::text, 3, '0')
  WHERE location_type = 'rack' AND rack_id IS NULL;

-- Create unique index on rack_id for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_rack_id
  ON locations (rack_id)
  WHERE rack_id IS NOT NULL;
