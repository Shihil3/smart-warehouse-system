Smart Warehouse Management & Cross-Dock Optimization System

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
psql -U warehouse_user -d warehouse_db -h localhost -p 5433
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
psql -U warehouse_user -d warehouse_db -h localhost -p 5433 -c "\dt"
```

Type `\q` to exit psql.

### Seed the Database (Optional)

Generate a bcrypt hash for the default admin user:

```bash
ruby -e "require 'bcrypt'; puts BCrypt::Password.create('admin123')"
```

Paste the output into `db/seeds.sql`, then run:

```bash
psql -U warehouse_user -d warehouse_db -h localhost -p 5433 -f db/seeds.sql
```

This inserts 4 zones, 9 locations (docks, storage, staging), and a default manager user.

TO run backend
```bash
ruby app.rb
```

to run frontend

```bash
npm run dev
```

to run optimizer

first create virtual environment
```bash
python -m venv venv
```

once created 
run this
```bash
.\venv\Scripts\activate
```

install the requirements
```bash
pip install -r requirements.txt
```

final command to run 
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```