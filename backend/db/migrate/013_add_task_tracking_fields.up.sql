-- Worker assignment + timing fields on tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS worker_id   INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS started_at  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
