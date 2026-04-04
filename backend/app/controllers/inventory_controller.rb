require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/assignment_engine'
require_relative '../services/task_generator'
require_relative '../services/event_logger'

# -----------------------------------------------------------
# GET /inventory
# Lists all pallets currently stored in racks
# (status = 'stored' or 'pending_storage')
# -----------------------------------------------------------
get '/inventory' do
  conn = db_connection

  pallets = conn.exec(<<~SQL)
    SELECT
      p.id,
      p.status,
      p.priority,
      p.weight,
      p.destination_id,
      p.outbound_truck_id,
      p.current_location_id,
      p.created_at,
      COALESCE(l.rack_id, l.label, 'Loc-' || l.id::text) AS location_name,
      l.location_type,
      d.name    AS destination_name,
      d.region  AS destination_region
    FROM pallets p
    LEFT JOIN locations l ON l.id = p.current_location_id
    LEFT JOIN destinations d ON d.id = p.destination_id
    WHERE p.status IN ('stored', 'pending_storage')
    ORDER BY p.priority ASC, p.created_at ASC
  SQL

  pallets.to_a.to_json
end


# -----------------------------------------------------------
# GET /inventory/summary
# Rack-level summary: how many stored pallets per rack.
# Gracefully handles the case where migration 012 (rack_id /
# max_capacity columns) has not yet been applied.
# -----------------------------------------------------------
get '/inventory/summary' do
  conn = db_connection

  # Detect optional columns from migration 012
  present = conn.exec(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='locations'
       AND column_name IN ('rack_id','max_capacity')"
  ).map { |r| r["column_name"] }

  rack_name_expr = present.include?("rack_id") \
    ? "COALESCE(l.rack_id, l.label, 'Rack-' || l.id::text)" \
    : "COALESCE(l.label, 'Rack-' || l.id::text)"

  max_cap_expr = present.include?("max_capacity") \
    ? "COALESCE(l.max_capacity, 10)" \
    : "10"

  group_extra = present.map { |c| ", l.#{c}" }.join

  summary = conn.exec(<<~SQL)
    SELECT
      l.id                          AS rack_id,
      #{rack_name_expr}             AS rack_name,
      #{max_cap_expr}               AS max_capacity,
      COUNT(p.id)::int              AS stored_count,
      ROUND(
        COUNT(p.id)::numeric / #{max_cap_expr} * 100
      )::int                        AS occupancy_pct
    FROM locations l
    LEFT JOIN pallets p
      ON  p.current_location_id = l.id
      AND p.status IN ('stored', 'pending_storage')
    WHERE l.location_type = 'rack'
    GROUP BY l.id, l.label#{group_extra}
    ORDER BY occupancy_pct DESC, l.id ASC
  SQL

  summary.to_a.to_json
end


# -----------------------------------------------------------
# POST /inventory/:id/retrieve
# Assigns a stored pallet to an available outbound truck
# and creates a retrieval task for a worker.
# -----------------------------------------------------------
post '/inventory/:id/retrieve' do
  conn = db_connection

  # Load pallet — must be in storage
  pallet_result = conn.exec_params(
    "SELECT * FROM pallets WHERE id=$1 AND status IN ('stored','pending_storage')",
    [params[:id]]
  )
  halt 404, { error: "Pallet #{params[:id]} not found or not in storage." }.to_json \
    if pallet_result.ntuples == 0

  pallet = pallet_result[0]

  # Try to find a matching outbound truck
  truck_id = assign_pallet_to_truck(pallet["id"])

  if truck_id.nil?
    halt 422, {
      error: "No available outbound truck for destination #{pallet["destination_id"]}. " \
             "Schedule a truck first."
    }.to_json
  end

  truck = conn.exec_params("SELECT * FROM outbound_trucks WHERE id=$1", [truck_id])[0]

  rack_location_id = pallet["current_location_id"].to_i
  dock_location_id = truck["dock_location_id"].to_i

  # Create retrieval task
  generate_retrieval_task(pallet["id"], truck_id, rack_location_id, dock_location_id)

  # Update pallet status to 'assigned' (it will be moved when task completes)
  conn.exec_params(
    "UPDATE pallets SET status='assigned', outbound_truck_id=$1 WHERE id=$2",
    [truck_id, pallet["id"]]
  )

  log_event(
    "PALLET_RETRIEVAL_SCHEDULED",
    pallet["id"],
    rack_location_id,
    "Pallet scheduled for retrieval → Truck #{truck_id} at dock #{dock_location_id}"
  )

  {
    message:          "Pallet P-#{pallet["id"]} assigned to Truck #{truck_id}. Retrieval task created.",
    pallet_id:        pallet["id"].to_i,
    truck_id:         truck_id.to_i,
    dock_location_id: dock_location_id
  }.to_json
end
