require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/assignment_engine'
require_relative '../services/optimization_trigger'
require_relative '../services/task_generator'

# Create Pallet
post '/pallets' do
  data = JSON.parse(request.body.read)

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO pallets
    (product_id, destination_id, priority, weight, status)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *",
    [
      data["product_id"],
      data["destination_id"],
      data["priority"],
      data["weight"],
      "created"
    ]
  )
pallet = result[0]

  truck_id = assign_pallet_to_truck(pallet["id"])
  sequence = trigger_optimizer
  generate_tasks(sequence)

 {
  pallet: pallet,
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
