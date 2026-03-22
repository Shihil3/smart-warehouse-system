CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
