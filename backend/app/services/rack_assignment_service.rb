require_relative '../../config/database'
require_relative 'event_logger'

# Finds the rack with the most available space and reserves it for the pallet.
# The pallet is NOT physically moved yet — a storage task is created for that.
# Returns the rack location row, or nil if no rack has capacity.
def assign_pallet_to_rack(pallet_id)
  conn = db_connection

  pallet = conn.exec_params("SELECT * FROM pallets WHERE id=$1", [pallet_id])[0]
  return nil unless pallet

  # Find the rack with lowest occupancy ratio that still has space.
  # Ignores pallets that are already delivered or in a cross-dock transit path.
  # Detect optional columns from migration 012
  present = conn.exec(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='locations'
       AND column_name IN ('rack_id','max_capacity')"
  ).map { |r| r["column_name"] }

  name_expr    = present.include?("rack_id") \
    ? "COALESCE(l.rack_id, l.label, 'Rack-' || l.id::text)" \
    : "COALESCE(l.label, 'Rack-' || l.id::text)"
  max_cap_expr = present.include?("max_capacity") ? "COALESCE(l.max_capacity, 10)" : "10"
  group_extra  = present.map { |c| ", l.#{c}" }.join

  rack = conn.exec(<<~SQL)
    SELECT
      l.id,
      #{name_expr}      AS name,
      #{max_cap_expr}   AS max_capacity,
      COUNT(p.id)::int  AS current_occupancy
    FROM locations l
    LEFT JOIN pallets p
      ON  p.current_location_id = l.id
      AND p.status NOT IN ('delivered', 'created')
    WHERE l.location_type = 'rack'
    GROUP BY l.id, l.label#{group_extra}
    HAVING COUNT(p.id)::int < #{max_cap_expr}
    ORDER BY (COUNT(p.id)::float / #{max_cap_expr}) ASC, l.id ASC
    LIMIT 1
  SQL

  return nil if rack.ntuples == 0

  rack_row = rack[0]

  # Mark pallet as pending_storage — the worker still needs to physically
  # carry it from staging to the rack (the task handles that).
  conn.exec_params(
    "UPDATE pallets SET status='pending_storage' WHERE id=$1",
    [pallet_id]
  )

  log_event(
    "PALLET_RACK_ASSIGNED",
    pallet_id,
    rack_row["id"],
    "No outbound truck available — pallet queued for storage in #{rack_row["name"]}"
  )

  rack_row
end


# Called when a worker completes a storage task:
# marks the pallet as 'stored' at its rack location.
def confirm_pallet_stored(pallet_id, rack_location_id)
  conn = db_connection
  conn.exec_params(
    "UPDATE pallets SET status='stored', current_location_id=$1 WHERE id=$2",
    [rack_location_id, pallet_id]
  )
  log_event("PALLET_STORED", pallet_id, rack_location_id, "Pallet physically stored in rack")
end
