require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/assignment_engine'
require_relative '../services/optimization_trigger'
require_relative '../services/task_generator'

# Create Pallet
post '/pallets' do
  body = request.body.read
  halt 400, {error: "Request body required"}.to_json if body.empty?

  data = JSON.parse(body)

  conn = db_connection
  halt 400, {error:"inbound_truck_id required"}.to_json unless data["inbound_truck_id"]
result = conn.exec_params(
  "INSERT INTO pallets
  (product_id, destination_id, priority, weight, inbound_truck_id, status, current_location_id)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  RETURNING *",
  [
    data["product_id"],
    data["destination_id"],
    data["priority"],
    data["weight"],
    data["inbound_truck_id"],   # new field
    "created",
    4
  ]
)

pallet = result[0]

truck_id = assign_pallet_to_truck(pallet["id"])

# fetch updated pallet
updated_pallet = conn.exec_params(
  "SELECT * FROM pallets WHERE id=$1",
  [pallet["id"]]
)[0]

sequence = trigger_optimizer
generate_tasks(sequence)

{
  pallet: updated_pallet,
  assigned_truck: truck_id,
  optimization_sequence: sequence
}.to_json

end


# Get Pallets
get '/pallets' do
  conn = db_connection

  pallets = conn.exec("SELECT * FROM pallets")

  pallets.to_a.to_json
end

qr = data["pallet_code"]

parts = qr.split("|")

halt 400, {error:"Invalid QR format"} unless parts[0] == "PALLET"

product_id = parts[1]
destination_id = parts[2]
priority = parts[3]
weight = parts[4]
inbound_truck_id = parts[5]

result = db_connection.exec_params(
  "INSERT INTO pallets
  (product_id, destination_id, priority, weight, inbound_truck_id, status, current_location_id)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  RETURNING *",
  [
    product_id,
    destination_id,
    priority,
    weight,
    inbound_truck_id,
    "created",
    4
  ]
)

pallet = result[0]

log_event(
  "SCAN_EVENT",
  pallet["id"],
  4,
  "Pallet registered via QR scan"
)

pallet.to_json
