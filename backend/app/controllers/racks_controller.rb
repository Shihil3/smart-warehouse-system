require 'sinatra'
require 'json'
require_relative '../../config/database'

# Detect which optional columns from migration 012 actually exist.
# Returns a Set-like hash: { "rack_id" => true/false, "max_capacity" => true/false }
def rack_columns_present?(conn)
  rows = conn.exec(
    "SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'locations'
       AND column_name  IN ('rack_id', 'max_capacity')"
  )
  found = rows.map { |r| r["column_name"] }
  {
    rack_id:      found.include?("rack_id"),
    max_capacity: found.include?("max_capacity")
  }
end

# Build a safe SELECT list and GROUP BY for the racks query based on
# which columns are actually present in the schema.
def racks_query(conn)
  cols = rack_columns_present?(conn)

  rack_id_sel  = cols[:rack_id]      ? "l.rack_id,"                         : "NULL AS rack_id,"
  label_sel    = cols[:rack_id]      ? "COALESCE(l.label, l.rack_id, 'Rack-' || l.id::text) AS label," \
                                     : "COALESCE(l.label, 'Rack-' || l.id::text) AS label,"
  max_cap_sel  = cols[:max_capacity] ? "COALESCE(l.max_capacity, 10) AS max_capacity," \
                                     : "10 AS max_capacity,"
  group_extra  = []
  group_extra << "l.rack_id"      if cols[:rack_id]
  group_extra << "l.max_capacity" if cols[:max_capacity]
  extra_group  = group_extra.empty? ? "" : ", #{group_extra.join(", ")}"

  <<~SQL
    SELECT
      l.id,
      #{rack_id_sel}
      #{label_sel}
      #{max_cap_sel}
      l.zone_id,
      l.x_coordinate,
      l.y_coordinate,
      COUNT(p.id)::int AS current_occupancy,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',       p.id,
            'status',   p.status,
            'priority', p.priority,
            'weight',   p.weight
          ) ORDER BY p.id
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS pallets
    FROM locations l
    LEFT JOIN pallets p ON p.current_location_id = l.id
    WHERE l.location_type = 'rack'
    GROUP BY l.id, l.label, l.zone_id, l.x_coordinate, l.y_coordinate#{extra_group}
    ORDER BY l.id
  SQL
end


# GET /racks — all rack locations with live occupancy
get '/racks' do
  conn = db_connection
  rows = conn.exec(racks_query(conn))
  rows.to_a.to_json
end


# GET /racks/:id — single rack with full pallet list
get '/racks/:id' do
  conn = db_connection
  cols = rack_columns_present?(conn)

  rack_id_sel = cols[:rack_id]      ? "l.rack_id,"                        : "NULL AS rack_id,"
  label_sel   = cols[:rack_id]      ? "COALESCE(l.label, l.rack_id, 'Rack-' || l.id::text) AS label," \
                                    : "COALESCE(l.label, 'Rack-' || l.id::text) AS label,"
  max_cap_sel = cols[:max_capacity] ? "COALESCE(l.max_capacity, 10) AS max_capacity," \
                                    : "10 AS max_capacity,"
  group_extra = []
  group_extra << "l.rack_id"      if cols[:rack_id]
  group_extra << "l.max_capacity" if cols[:max_capacity]
  extra_group = group_extra.empty? ? "" : ", #{group_extra.join(", ")}"

  rows = conn.exec_params(<<~SQL, [params[:id]])
    SELECT
      l.id,
      #{rack_id_sel}
      #{label_sel}
      #{max_cap_sel}
      l.zone_id,
      COUNT(p.id)::int AS current_occupancy,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',          p.id,
            'status',      p.status,
            'priority',    p.priority,
            'weight',      p.weight,
            'destination', p.destination_id
          ) ORDER BY p.id
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS pallets
    FROM locations l
    LEFT JOIN pallets p ON p.current_location_id = l.id
    WHERE l.location_type = 'rack' AND l.id = $1
    GROUP BY l.id, l.label, l.zone_id#{extra_group}
  SQL

  halt 404, { error: "Rack not found" }.to_json if rows.ntuples == 0
  rows[0].to_json
end


# POST /racks/:id/assign — assign a pallet to this rack (capacity check)
post '/racks/:id/assign' do
  conn = db_connection
  data = JSON.parse(request.body.read)

  cols    = rack_columns_present?(conn)
  cap_col = cols[:max_capacity] ? "COALESCE(max_capacity, 10)" : "10"

  rack_row = conn.exec_params(
    "SELECT #{cap_col} AS max_capacity FROM locations WHERE id=$1 AND location_type='rack'",
    [params[:id]]
  )
  halt 404, { error: "Rack not found" }.to_json if rack_row.ntuples == 0

  cap = rack_row[0]["max_capacity"].to_i
  occ = conn.exec_params(
    "SELECT COUNT(*)::int AS cnt FROM pallets WHERE current_location_id=$1",
    [params[:id]]
  )[0]["cnt"].to_i

  halt 422, { error: "Rack is at full capacity (#{cap} pallets)." }.to_json if occ >= cap

  conn.exec_params(
    "UPDATE pallets SET current_location_id=$1 WHERE id=$2 RETURNING *",
    [params[:id], data["pallet_id"]]
  )

  { message: "Pallet #{data["pallet_id"]} assigned to rack #{params[:id]}." }.to_json
end
