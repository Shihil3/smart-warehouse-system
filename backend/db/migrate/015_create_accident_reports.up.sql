CREATE TABLE IF NOT EXISTS accident_reports (
  id               SERIAL PRIMARY KEY,
  reporter_id      INTEGER REFERENCES users(id),
  location_id      INTEGER REFERENCES locations(id),
  severity         VARCHAR(20) NOT NULL DEFAULT 'low',   -- low | medium | high | critical
  title            VARCHAR(200) NOT NULL,
  description      TEXT NOT NULL,
  injuries         BOOLEAN DEFAULT FALSE,
  status           VARCHAR(20) DEFAULT 'open',           -- open | investigating | resolved
  resolved_by      INTEGER REFERENCES users(id),
  resolved_at      TIMESTAMP,
  resolution_notes TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accident_reports_status     ON accident_reports(status);
CREATE INDEX IF NOT EXISTS idx_accident_reports_reporter   ON accident_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_created_at ON accident_reports(created_at DESC);
