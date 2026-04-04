ALTER TABLE users         DROP COLUMN IF EXISTS name;
ALTER TABLE outbound_trucks DROP COLUMN IF EXISTS departed_at, DROP COLUMN IF EXISTS manifest;
