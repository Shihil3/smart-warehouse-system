require 'sinatra'
require 'json'
require_relative '../../config/database'

# Create Product
post '/products' do
  require_manager(request)

  data = JSON.parse(request.body.read)

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO products (sku, name, category, weight, volume)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *",
     [
       data["sku"],
       data["name"],
       data["category"],
       data["weight"],
       data["volume"]
     ]
  )

  result[0].to_json
end


# Get Products — accessible to all authenticated users
get '/products' do
  require_worker(request)
  conn = db_connection

  products = conn.exec(
    "SELECT id, sku, name, category, weight, volume,
            TO_CHAR(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS created_at
     FROM products ORDER BY name ASC"
  )

  products.to_a.to_json
end
