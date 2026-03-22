CREATE TABLE IF NOT EXISTS congestion_alerts (
  id SERIAL PRIMARY KEY,
  dock_id INTEGER REFERENCES locations(id),
  message TEXT,
  severity VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
