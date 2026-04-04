DROP INDEX IF EXISTS idx_locations_rack_id;

ALTER TABLE locations
  DROP COLUMN IF EXISTS rack_id,
  DROP COLUMN IF EXISTS max_capacity;
