Smart Warehouse Management & Cross-Dock Optimization System

## Prerequisites

- Ruby 3.x (with Bundler)
- Node.js 18+
- Python 3.10+
- PostgreSQL (running on port 5432)

---

## Quick Start (Windows)

Open three separate terminals and run:

| Terminal | Command |
|----------|---------|
| Backend  | `start-backend.bat` |
| Frontend | `start-frontend.bat` |
| Optimizer | `start-optimizer.bat` |

The optimizer script automatically creates a Python virtual environment on first run.

---

## Manual Setup

### 1. Backend (Ruby/Sinatra)

```bash
cd backend
gem install bundler
bundle install
ruby scripts/migrate.rb   # run once to create tables
ruby db/seeds.rb          # optional: load sample data
ruby app.rb               # starts on http://localhost:4567
```

### 2. Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

### 3. Optimizer (Python/FastAPI)

```bash
cd optimizer
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# starts on http://localhost:8000
```

---

## Database Migrations

### Run Migrations

From the `backend/` directory:

```bash
ruby scripts/migrate.rb
```

This will create all 11 tables and a `schema_migrations` tracking table. Running it again is safe — already-applied migrations are skipped.

### Verify Migrations

Connect to the database:

```bash
psql -U warehouse_user -d warehouse_db -h localhost -p 5432
```

Inside psql:

```sql
-- List all tables
\dt

-- Check applied migrations
SELECT * FROM schema_migrations;

-- Inspect a table structure
\d pallets
```

Or as a one-liner:

```bash
psql -U warehouse_user -d warehouse_db -h localhost -p 5432 -c "\dt"
```

Type `\q` to exit psql.

---

## Default Login Credentials

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| Manager | manager@warehouse.com     | manager123  |
| Worker  | worker@warehouse.com      | worker123   |
| Worker  | worker2@warehouse.com     | worker123   |
| Worker  | worker3@warehouse.com     | worker123   |

---

## Service URLs

| Service   | URL                        |
|-----------|---------------------------|
| Frontend  | http://localhost:5173      |
| Backend   | http://localhost:4567      |
| Optimizer | http://localhost:8000      |
| API Docs  | http://localhost:8000/docs |
