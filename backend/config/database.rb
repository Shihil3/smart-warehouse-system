require 'pg'

DB_CONFIG = {
  dbname:   "warehouse_db",
  user:     "warehouse_user",
  password: "warehouse_pass",
  host:     "127.0.0.1",
  port:     5432,
}.freeze

# Returns a per-thread persistent connection.
# Each Puma worker thread gets exactly one connection — no pool exhaustion.
# Reconnects automatically if the connection drops.
def db_connection
  conn = Thread.current[:db_conn]

  # Use the native status flag — no round-trip needed
  if conn && conn.status == PG::Connection::CONNECTION_OK
    return conn
  end

  # Connection missing or dead — open a fresh one
  Thread.current[:db_conn] = PG.connect(DB_CONFIG)
end
