require 'pg'

def db_connection
  PG.connect(
    dbname: "warehouse_db",
    user: "warehouse_user",
    password: "warehouse_pass",
    host: "localhost",
    port: 5433
  )
end
