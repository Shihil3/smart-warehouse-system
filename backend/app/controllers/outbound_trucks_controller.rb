require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../repositories/truck_repository'
require_relative '../services/event_logger'

# POST /outbound-trucks — schedule a new truck
post '/outbound-trucks' do
  require_manager(request)
  data  = JSON.parse(request.body.read)
  truck = TruckRepository.create(data)
  detect_dock_congestion
  truck.to_json
end

# GET /outbound-trucks — list all trucks
get '/outbound-trucks' do
  conn = db_connection
  trucks = conn.exec(<<~SQL)
    SELECT t.*, d.name AS destination_name, d.region AS destination_region
    FROM   outbound_trucks t
    LEFT JOIN destinations d ON d.id = t.destination_id
    ORDER BY t.created_at DESC
  SQL
  trucks.to_a.to_json
end

# GET /outbound-trucks/:id — single truck with its pallet manifest
get '/outbound-trucks/:id' do
  conn = db_connection
  truck_res = conn.exec_params(<<~SQL, [params[:id]])
    SELECT t.*, d.name AS destination_name, d.region AS destination_region
    FROM   outbound_trucks t
    LEFT JOIN destinations d ON d.id = t.destination_id
    WHERE  t.id = $1
  SQL
  halt 404, { error: "Truck not found" }.to_json if truck_res.ntuples == 0
  truck = truck_res[0]

  pallets = conn.exec_params(<<~SQL, [params[:id]])
    SELECT p.id, p.status, p.weight, p.priority,
           p.current_location_id,
           COALESCE(l.rack_id, l.label, 'Loc-'||l.id::text) AS location_name,
           pr.name AS product_name
    FROM   pallets p
    LEFT JOIN locations l ON l.id = p.current_location_id
    LEFT JOIN products  pr ON pr.id = p.product_id
    WHERE  p.outbound_truck_id = $1
    ORDER BY p.id
  SQL

  pending_tasks = conn.exec_params(
    "SELECT COUNT(*)::int AS cnt FROM tasks
     WHERE  truck_id = $1 AND status IN ('pending','in_progress')",
    [params[:id]]
  )[0]["cnt"].to_i

  truck.merge(
    "pallets"       => pallets.to_a,
    "pending_tasks" => pending_tasks
  ).to_json
end

# POST /outbound-trucks/:id/depart — confirm departure, close manifest
post '/outbound-trucks/:id/depart' do
  require_manager(request)
  conn = db_connection

  truck_res = conn.exec_params(
    "SELECT * FROM outbound_trucks WHERE id=$1", [params[:id]]
  )
  halt 404, { error: "Truck not found" }.to_json if truck_res.ntuples == 0
  truck = truck_res[0]
  halt 422, { error: "Truck has already departed." }.to_json if truck["status"] == "departed"

  # All pallets on this truck
  pallets = conn.exec_params(
    "SELECT p.*, pr.name AS product_name
     FROM   pallets p
     LEFT JOIN products pr ON pr.id = p.product_id
     WHERE  p.outbound_truck_id = $1",
    [params[:id]]
  ).to_a

  # Warn about unfinished tasks but allow departure (manager override)
  pending_tasks = conn.exec_params(
    "SELECT COUNT(*)::int AS cnt FROM tasks
     WHERE  truck_id=$1 AND status IN ('pending','in_progress')",
    [params[:id]]
  )[0]["cnt"].to_i

  # Cancel any remaining pending tasks for this truck
  conn.exec_params(
    "UPDATE tasks SET status='cancelled' WHERE truck_id=$1 AND status IN ('pending','in_progress')",
    [params[:id]]
  )

  # Mark all pallets as delivered
  conn.exec_params(
    "UPDATE pallets SET status='delivered' WHERE outbound_truck_id=$1",
    [params[:id]]
  )

  # Build manifest snapshot
  dest_res = conn.exec_params(
    "SELECT * FROM destinations WHERE id=$1", [truck["destination_id"]]
  )
  destination = dest_res.ntuples > 0 ? dest_res[0] : {}

  manifest = {
    truck_id:       truck["id"].to_i,
    truck_number:   truck["truck_number"],
    destination:    destination,
    departed_at:    Time.now.utc.iso8601,
    total_pallets:  pallets.length,
    total_weight_kg: pallets.sum { |p| p["weight"].to_f }.round(2),
    warnings:       pending_tasks > 0 ? ["#{pending_tasks} task(s) were still pending and have been cancelled."] : [],
    pallets:        pallets.map { |p|
      { id: p["id"].to_i, product: p["product_name"], weight: p["weight"].to_f, status: "delivered" }
    }
  }

  # Persist status + manifest on the truck row
  conn.exec_params(
    "UPDATE outbound_trucks SET status='departed', departed_at=NOW(), manifest=$1 WHERE id=$2",
    [manifest.to_json, params[:id]]
  )

  log_event(
    "TRUCK_DEPARTED",
    nil,
    truck["dock_location_id"],
    "Truck #{truck["truck_number"]} departed with #{pallets.length} pallets to #{destination["name"]}"
  )

  manifest.to_json
end
