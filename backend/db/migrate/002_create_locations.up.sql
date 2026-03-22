CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES zones(id),
  location_type VARCHAR(50) NOT NULL,
  x_coordinate FLOAT,
  y_coordinate FLOAT,
  label VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
