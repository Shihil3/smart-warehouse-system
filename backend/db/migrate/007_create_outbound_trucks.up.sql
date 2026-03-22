CREATE TABLE IF NOT EXISTS outbound_trucks (
  id SERIAL PRIMARY KEY,
  truck_number VARCHAR(100) NOT NULL,
  destination_id INTEGER REFERENCES destinations(id),
  departure_deadline TIMESTAMP,
  max_weight FLOAT,
  max_pallet_count INTEGER,
  current_weight FLOAT DEFAULT 0,
  current_pallet_count INTEGER DEFAULT 0,
  dock_location_id INTEGER REFERENCES locations(id),
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);
