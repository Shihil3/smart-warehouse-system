require 'sinatra'
require 'json'
require_relative '../../config/database'

# Create Outbound Truck
post '/outbound-trucks' do
  data = JSON.parse(request.body.read)

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO outbound_trucks
    (truck_number, destination_id, departure_deadline, max_weight, max_pallet_count, status)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *",
    [
      data["truck_number"],
      data["destination_id"],
      data["departure_deadline"],
      data["max_weight"],
      data["max_pallet_count"],
      "scheduled"
    ]
  )

  result[0].to_json
end


# List Outbound Trucks
get '/outbound-trucks' do
  conn = db_connection

  trucks = conn.exec("SELECT * FROM outbound_trucks")

  trucks.to_a.to_json
end
