CREATE TABLE IF NOT EXISTS warehouse_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  pallet_id INTEGER REFERENCES pallets(id),
  location_id INTEGER REFERENCES locations(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
