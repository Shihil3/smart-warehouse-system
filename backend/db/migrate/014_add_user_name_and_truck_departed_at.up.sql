-- Worker display name
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Truck departure timestamp + manifest snapshot
ALTER TABLE outbound_trucks
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manifest    JSONB;
