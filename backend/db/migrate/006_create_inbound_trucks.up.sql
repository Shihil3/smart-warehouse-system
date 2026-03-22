CREATE TABLE IF NOT EXISTS inbound_trucks (
  id SERIAL PRIMARY KEY,
  truck_number VARCHAR(100) NOT NULL,
  arrival_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
