require 'pg'

def db_connection
  PG.connect(
    dbname: "warehouse_db",
    user: "warehouse_user",
    password: "warehouse_pass",
    host: "127.0.0.1",
    port: 5432
  )
end
