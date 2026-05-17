require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/assignment_engine'
require_relative '../services/rack_assignment_service'
require_relative '../services/optimization_trigger'
require_relative '../services/task_generator'
require_relative '../services/event_logger'

# Look up the first staging location ID dynamically.
# Avoids fragile hardcoding that breaks after seeding.
def default_staging_location_id
  conn   = db_connection
  result = conn.exec(
    "SELECT id FROM locations WHERE location_type = 'staging' ORDER BY id ASC LIMIT 1"
  )
  result.ntuples > 0 ? result[0]["id"].to_i : 1
end

# -----------------------------------------------------------
# Shared logic: decide cross-dock vs storage, build tasks
# -----------------------------------------------------------
def process_new_pallet(pallet)
  pallet_id        = pallet["id"]
  staging_location = pallet["current_location_id"].to_i

  # Validate pallet has required references before routing
  unless pallet["product_id"] && pallet["destination_id"]
    puts "WARN: pallet #{pallet_id} missing product_id or destination_id — skipping routing"
    return { workflow: "incomplete", message: "Pallet missing product or destination reference." }
  end

  truck_id = begin
    assign_pallet_to_truck(pallet_id)
  rescue => e
    puts "WARN: assign_pallet_to_truck failed for pallet #{pallet_id}: #{e.message}"
    nil
  end

  if truck_id
    sequence = begin
      trigger_optimizer
    rescue => e
      puts "WARN: optimizer failed: #{e.message}"
      { "sequence" => [] }
    end

    begin
      generate_tasks(sequence)
    rescue => e
      puts "WARN: generate_tasks failed: #{e.message}"
    end

    {
      workflow:              "cross_dock",
      assigned_truck_id:     truck_id.to_i,
      optimization_sequence: sequence
    }
  else
    rack = begin
      assign_pallet_to_rack(pallet_id)
    rescue => e
      puts "WARN: assign_pallet_to_rack failed for pallet #{pallet_id}: #{e.message}"
      nil
    end

    if rack
      begin
        generate_storage_task(pallet_id, staging_location, rack["id"].to_i)
      rescue => e
        puts "WARN: generate_storage_task failed: #{e.message}"
      end
      { workflow: "storage", assigned_rack_id: rack["id"].to_i, rack_name: rack["name"] }
    else
      { workflow: "no_capacity", message: "No outbound truck or rack available. Pallet is waiting at staging." }
    end
  end
rescue => e
  puts "ERROR: process_new_pallet raised unhandled exception for pallet #{pallet_id}: #{e.message}"
  { workflow: "error", message: "Processing failed safely. Pallet created but not routed." }
end


# -----------------------------------------------------------
# POST /pallets  — create pallet manually
# -----------------------------------------------------------
post '/pallets' do
  body = request.body.read
  halt 400, { error: "Request body required" }.to_json if body.empty?

  data = JSON.parse(body)
  halt 400, { error: "inbound_truck_id required" }.to_json unless data["inbound_truck_id"]

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO pallets
     (product_id, destination_id, priority, weight, inbound_truck_id, status, current_location_id)
     VALUES ($1,$2,$3,$4,$5,'created',$6)
     RETURNING *",
    [
      data["product_id"],
      data["destination_id"],
      data["priority"],
      data["weight"],
      data["inbound_truck_id"],
      default_staging_location_id
    ]
  )

  pallet = result[0]

  log_event("PALLET_CREATED", pallet["id"], default_staging_location_id, "Pallet created manually")

  dispatch = process_new_pallet(pallet)

  # Return fresh pallet row (may have been updated by assign_pallet_to_truck)
  updated_pallet = conn.exec_params("SELECT * FROM pallets WHERE id=$1", [pallet["id"]])[0]

  { pallet: updated_pallet }.merge(dispatch).to_json
end


# -----------------------------------------------------------
# POST /scan  — create pallet via inbound QR scan
# -----------------------------------------------------------
post '/scan' do
  body = request.body.read
  halt 400, { error: "Request body required" }.to_json if body.empty?

  data = JSON.parse(body)
  qr   = data["pallet_code"].to_s
  puts "QR received: #{qr}"

  parts = qr.split("|")
  halt 400, { error: "Invalid QR format. Expected: PALLET|product_id|destination_id|priority|weight|inbound_truck_id" }.to_json \
    unless parts[0] == "PALLET" && parts.length >= 6

  product_id       = parts[1]
  destination_id   = parts[2]
  priority         = parts[3]
  weight           = parts[4]
  inbound_truck_id = parts[5]

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO pallets
     (product_id, destination_id, priority, weight, inbound_truck_id, status, current_location_id)
     VALUES ($1,$2,$3,$4,$5,'created',$6)
     RETURNING *",
    [product_id, destination_id, priority, weight, inbound_truck_id, default_staging_location_id]
  )

  pallet = result[0]

  log_event("PALLET_CREATED", pallet["id"], default_staging_location_id, "Pallet created via QR scan")

  dispatch = process_new_pallet(pallet)

  updated_pallet = conn.exec_params("SELECT * FROM pallets WHERE id=$1", [pallet["id"]])[0]

  { pallet: updated_pallet }.merge(dispatch).to_json
end


# -----------------------------------------------------------
# GET /pallets  — list all pallets
# -----------------------------------------------------------
get '/pallets' do
  conn = db_connection

  pallets = conn.exec(<<~SQL)
    SELECT
      p.*,
      COALESCE(l.rack_id, l.label, 'Loc-' || l.id::text) AS location_name,
      l.location_type,
      d.name AS destination_name
    FROM pallets p
    LEFT JOIN locations l ON l.id = p.current_location_id
    LEFT JOIN destinations d ON d.id = p.destination_id
    ORDER BY p.id DESC
  SQL

  pallets.to_a.to_json
end


# -----------------------------------------------------------
# GET /pallets/:id  — single pallet detail
# -----------------------------------------------------------
get '/pallets/:id' do
  conn = db_connection

  result = conn.exec_params(<<~SQL, [params[:id]])
    SELECT
      p.*,
      COALESCE(l.rack_id, l.label, 'Loc-' || l.id::text) AS location_name,
      l.location_type,
      d.name AS destination_name
    FROM pallets p
    LEFT JOIN locations l ON l.id = p.current_location_id
    LEFT JOIN destinations d ON d.id = p.destination_id
    WHERE p.id = $1
  SQL

  halt 404, { error: "Pallet not found" }.to_json if result.ntuples == 0
  result[0].to_json
end
