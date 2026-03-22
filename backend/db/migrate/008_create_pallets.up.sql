CREATE TABLE IF NOT EXISTS pallets (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  destination_id INTEGER REFERENCES destinations(id),
  inbound_truck_id INTEGER REFERENCES inbound_trucks(id),
  outbound_truck_id INTEGER REFERENCES outbound_trucks(id),
  current_location_id INTEGER REFERENCES locations(id),
  priority INTEGER DEFAULT 1,
  weight FLOAT,
  status VARCHAR(50) DEFAULT 'created',
  qr_code VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
