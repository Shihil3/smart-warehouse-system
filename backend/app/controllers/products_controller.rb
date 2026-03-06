require 'sinatra'
require 'json'
require_relative '../../config/database'

# Create Product
post '/products' do
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


# Get Products
get '/products' do
  conn = db_connection

  products = conn.exec("SELECT * FROM products")

  products.to_a.to_json
end
