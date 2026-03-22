CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  pallet_id INTEGER REFERENCES pallets(id),
  truck_id INTEGER REFERENCES outbound_trucks(id),
  source_location_id INTEGER REFERENCES locations(id),
  destination_location_id INTEGER REFERENCES locations(id),
  sequence_order INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
