require 'pg'
require 'bcrypt'
require_relative '../config/database'
require_relative '../app/services/task_generator'
require_relative '../app/services/rack_assignment_service'
require_relative '../app/services/assignment_engine'

conn = db_connection
puts "\n=============================="
puts " Smart Warehouse — DB Seed"
puts "==============================\n"

# ── Helpers ──────────────────────────────────────────────────────────────────

def already?(conn, table, field, value)
  conn.exec_params(
    "SELECT 1 FROM #{table} WHERE #{field} = $1 LIMIT 1", [value]
  ).ntuples > 0
end

def insert_once(conn, table, unique_field, unique_value, sql, params)
  if already?(conn, table, unique_field, unique_value)
    puts "  skip  #{table} #{unique_value} (already exists)"
  else
    conn.exec_params(sql, params)
    puts "  added #{table} #{unique_value}"
  end
end


# ── 1. Zones ──────────────────────────────────────────────────────────────────
puts "\n[1] Zones"

[
  [1, "Storage Zone",      "storage"],
  [2, "Staging Zone",      "staging"],
  [3, "Loading Dock Zone", "dock"   ],
].each do |id, name, type|
  unless already?(conn, "zones", "id", id)
    conn.exec_params(
      "INSERT INTO zones (id, name, zone_type) VALUES ($1,$2,$3)",
      [id, name, type]
    )
    puts "  added zone: #{name}"
  else
    puts "  skip  zone: #{name}"
  end
end

# Reset sequence so future inserts don't collide
conn.exec("SELECT setval('zones_id_seq', (SELECT MAX(id) FROM zones))")


# ── 2. Locations ──────────────────────────────────────────────────────────────
puts "\n[2] Locations"

# Warehouse layout (top-down view, Y increases toward docks):
#
#   Racks  (zone 1):  rows A–C, columns 1–4  →  12 rack locations
#   Staging (zone 2):  4 staging bays
#   Docks  (zone 3):  4 dock doors
#
# Coordinate system (units = 10 m apart for distance calc):
#   Racks:   y = 10, 20, 30  (back of warehouse)
#   Staging: y = 50           (mid-floor)
#   Docks:   y = 80           (front/exit)

rack_locations = []
row_names = %w[A B C]
row_names.each_with_index do |row, ri|
  (1..4).each do |col|
    rack_locations << {
      zone_id:       1,
      location_type: "rack",
      x:             col * 20,
      y:             (ri + 1) * 20,
      label:         "Rack #{row}#{col}",
      rack_id:       "R-#{row}#{col}",
      max_capacity:  8,
    }
  end
end

staging_locations = (1..4).map do |i|
  {
    zone_id:       2,
    location_type: "staging",
    x:             i * 20,
    y:             50,
    label:         "Staging-#{i}",
    rack_id:       nil,
    max_capacity:  nil,
  }
end

dock_locations = (1..4).map do |i|
  {
    zone_id:       3,
    location_type: "dock",
    x:             i * 20,
    y:             80,
    label:         "Dock-#{i}",
    rack_id:       nil,
    max_capacity:  nil,
  }
end

all_locations = rack_locations + staging_locations + dock_locations

# Detect whether migration 012 columns exist
has_rack_cols = conn.exec(
  "SELECT 1 FROM information_schema.columns
   WHERE table_name='locations' AND column_name='rack_id' AND table_schema='public'"
).ntuples > 0

all_locations.each do |loc|
  next if already?(conn, "locations", "label", loc[:label])

  if has_rack_cols
    conn.exec_params(
      "INSERT INTO locations
       (zone_id, location_type, x_coordinate, y_coordinate, label, rack_id, max_capacity)
       VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [loc[:zone_id], loc[:location_type], loc[:x], loc[:y],
       loc[:label], loc[:rack_id], loc[:max_capacity]]
    )
  else
    conn.exec_params(
      "INSERT INTO locations
       (zone_id, location_type, x_coordinate, y_coordinate, label)
       VALUES ($1,$2,$3,$4,$5)",
      [loc[:zone_id], loc[:location_type], loc[:x], loc[:y], loc[:label]]
    )
  end
  puts "  added location: #{loc[:label]} (#{loc[:location_type]})"
end


# ── 3. Users ──────────────────────────────────────────────────────────────────
puts "\n[3] Users"

has_name_col = conn.exec(
  "SELECT 1 FROM information_schema.columns
   WHERE table_name='users' AND column_name='name' AND table_schema='public'"
).ntuples > 0

has_leadman_col = conn.exec(
  "SELECT 1 FROM information_schema.columns
   WHERE table_name='users' AND column_name='is_leadman' AND table_schema='public'"
).ntuples > 0

[
  ["manager@warehouse.com",  "manager123", "manager", "Karthikeyan Murugan"],
  ["worker@warehouse.com",   "worker123",  "worker",  "Selvam Rajan"       ],
  ["worker2@warehouse.com",  "worker123",  "worker",  "Priya Devi"         ],
  ["worker3@warehouse.com",  "worker123",  "worker",  "Murugan Arumugam"   ],
].each do |email, plain_password, role, name|
  if already?(conn, "users", "email", email)
    conn.exec_params("UPDATE users SET name=$1 WHERE email=$2 AND name IS NULL", [name, email]) if has_name_col
    puts "  skip  user: #{email}"
  else
    hash = BCrypt::Password.create(plain_password)
    if has_name_col
      conn.exec_params(
        "INSERT INTO users (email, password_hash, role, name) VALUES ($1,$2,$3,$4)",
        [email, hash, role, name]
      )
    else
      conn.exec_params(
        "INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3)",
        [email, hash, role]
      )
    end
    puts "  added user: #{email} / #{plain_password} (#{role}) — #{name}"
  end
end


# ── 4. Destinations ───────────────────────────────────────────────────────────
puts "\n[4] Destinations"

[
  ["Chennai Central Hub",       "North",    "Maduravoyal, Chennai - 600095"         ],
  ["Coimbatore Distribution",   "West",     "Ganapathy, Coimbatore - 641006"        ],
  ["Madurai Cross-Dock",        "South",    "Avaniyapuram, Madurai - 625012"        ],
  ["Trichy Warehouse",          "Central",  "Ariyamangalam, Tiruchirappalli - 620010"],
  ["Salem Logistics Hub",       "North-West","Attur Road, Salem - 636016"           ],
  ["Tirunelveli Depot",         "Far South","Palayamkottai, Tirunelveli - 627002"   ],
  ["Erode Textile Warehouse",   "West",     "Perundurai Road, Erode - 638011"       ],
  ["Pondicherry Freight Centre","East",     "Villianur, Puducherry - 605110"        ],
].each do |name, region, address|
  unless already?(conn, "destinations", "name", name)
    conn.exec_params(
      "INSERT INTO destinations (name, region, address) VALUES ($1,$2,$3)",
      [name, region, address]
    )
    puts "  added destination: #{name}"
  else
    puts "  skip  destination: #{name}"
  end
end


# ── 5. Products ───────────────────────────────────────────────────────────────
puts "\n[5] Products"

[
  ["SKU-001", "Ponni Rice Sack (25 kg)",     "Food Grains",   25.0, 0.04],
  ["SKU-002", "Kancheepuram Silk Bundle",    "Textiles",       8.0, 0.06],
  ["SKU-003", "Two-Wheeler Engine Parts",    "Auto Parts",    30.0, 0.25],
  ["SKU-004", "Idly/Dosa Batter Packs",      "Food",           6.0, 0.03],
  ["SKU-005", "LED Tube Light Carton",       "Electronics",   12.0, 0.10],
  ["SKU-006", "Turmeric Powder Boxes",       "Spices",         5.0, 0.02],
  ["SKU-007", "Cement Bags (50 kg)",         "Construction",  50.0, 0.05],
  ["SKU-008", "Cotton Bale (Tirupur)",       "Textiles",      40.0, 0.35],
].each do |sku, name, cat, weight, volume|
  unless already?(conn, "products", "sku", sku)
    conn.exec_params(
      "INSERT INTO products (sku, name, category, weight, volume) VALUES ($1,$2,$3,$4,$5)",
      [sku, name, cat, weight, volume]
    )
    puts "  added product: #{name}"
  else
    puts "  skip  product: #{sku}"
  end
end


# ── 6. Inbound Trucks ─────────────────────────────────────────────────────────
puts "\n[6] Inbound Trucks"

inbound_trucks = [
  ["TN-01-AB-1234", "arrived",   "2026-04-05 06:30:00"],
  ["TN-33-CD-5678", "arrived",   "2026-04-05 08:00:00"],
  ["TN-11-EF-9012", "unloading", "2026-04-05 09:15:00"],
  ["TN-45-GH-3456", "pending",   "2026-04-05 11:00:00"],
  ["TN-22-KL-7890", "completed", "2026-04-04 14:00:00"],
]

inbound_ids = {}
inbound_trucks.each do |truck_number, status, arrival|
  if already?(conn, "inbound_trucks", "truck_number", truck_number)
    row = conn.exec_params("SELECT id FROM inbound_trucks WHERE truck_number=$1", [truck_number])[0]
    inbound_ids[truck_number] = row["id"].to_i
    puts "  skip  inbound truck: #{truck_number}"
  else
    res = conn.exec_params(
      "INSERT INTO inbound_trucks (truck_number, status, arrival_time) VALUES ($1,$2,$3) RETURNING id",
      [truck_number, status, arrival]
    )
    inbound_ids[truck_number] = res[0]["id"].to_i
    puts "  added inbound truck: #{truck_number} (#{status})"
  end
end


# ── 7. Outbound Trucks ────────────────────────────────────────────────────────
puts "\n[7] Outbound Trucks"

# Look up destination IDs and dock location IDs
dest_ids = {}
[
  "Chennai Central Hub", "Coimbatore Distribution", "Madurai Cross-Dock",
  "Trichy Warehouse", "Salem Logistics Hub", "Tirunelveli Depot"
].each do |name|
  row = conn.exec_params("SELECT id FROM destinations WHERE name=$1", [name]).first
  dest_ids[name] = row["id"].to_i if row
end

dock_loc_ids = {}
(1..4).each do |i|
  row = conn.exec_params("SELECT id FROM locations WHERE label=$1", ["Dock-#{i}"]).first
  dock_loc_ids[i] = row["id"].to_i if row
end

outbound_trucks = [
  ["TN-01-MN-2211", "Chennai Central Hub",     "2026-04-05 18:00:00", 5000.0, 20, 1],
  ["TN-33-PQ-4422", "Coimbatore Distribution", "2026-04-05 20:00:00", 4000.0, 16, 2],
  ["TN-11-RS-6633", "Madurai Cross-Dock",      "2026-04-06 08:00:00", 6000.0, 24, 3],
  ["TN-45-TU-8844", "Trichy Warehouse",        "2026-04-06 10:00:00", 4500.0, 18, 4],
  ["TN-22-VW-0055", "Salem Logistics Hub",     "2026-04-06 14:00:00", 3500.0, 14, 1],
]

outbound_ids = {}
outbound_trucks.each do |truck_number, dest_name, deadline, max_weight, max_pallets, dock_num|
  if already?(conn, "outbound_trucks", "truck_number", truck_number)
    row = conn.exec_params("SELECT id FROM outbound_trucks WHERE truck_number=$1", [truck_number])[0]
    outbound_ids[truck_number] = row["id"].to_i
    puts "  skip  outbound truck: #{truck_number}"
  else
    d_id  = dest_ids[dest_name]
    dk_id = dock_loc_ids[dock_num]
    res = conn.exec_params(
      "INSERT INTO outbound_trucks
         (truck_number, destination_id, departure_deadline, max_weight, max_pallet_count, dock_location_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'scheduled') RETURNING id",
      [truck_number, d_id, deadline, max_weight, max_pallets, dk_id]
    )
    outbound_ids[truck_number] = res[0]["id"].to_i
    puts "  added outbound truck: #{truck_number} → #{dest_name}"
  end
end


# ── 8. Pallets ────────────────────────────────────────────────────────────────
puts "\n[8] Pallets"

# Look up product and rack location IDs
prod_ids = {}
["SKU-001","SKU-002","SKU-003","SKU-004","SKU-005","SKU-006","SKU-007","SKU-008"].each do |sku|
  row = conn.exec_params("SELECT id FROM products WHERE sku=$1", [sku]).first
  prod_ids[sku] = row["id"].to_i if row
end

rack_loc_ids = {}
%w[A1 A2 A3 A4 B1 B2 B3 B4 C1 C2 C3 C4].each do |code|
  row = conn.exec_params("SELECT id FROM locations WHERE label=$1", ["Rack #{code}"]).first
  rack_loc_ids[code] = row["id"].to_i if row
end

staging_loc_ids = {}
(1..4).each do |i|
  row = conn.exec_params("SELECT id FROM locations WHERE label=$1", ["Staging-#{i}"]).first
  staging_loc_ids[i] = row["id"].to_i if row
end

pallets = [
  # qr_code,          sku,      dest_name,                inbound_key,       location_key,   loc_type, priority, weight, status
  ["PLT-KA-0001", "SKU-001", "Chennai Central Hub",     "TN-01-AB-1234", "A1",  :rack,    2, 25.0, "stored"  ],
  ["PLT-KA-0002", "SKU-002", "Coimbatore Distribution", "TN-01-AB-1234", "A2",  :rack,    1,  8.0, "stored"  ],
  ["PLT-KA-0003", "SKU-003", "Madurai Cross-Dock",      "TN-33-CD-5678", "A3",  :rack,    3, 30.0, "stored"  ],
  ["PLT-KA-0004", "SKU-004", "Chennai Central Hub",     "TN-33-CD-5678", "A4",  :rack,    1,  6.0, "stored"  ],
  ["PLT-KA-0005", "SKU-005", "Trichy Warehouse",        "TN-11-EF-9012", "B1",  :rack,    2, 12.0, "stored"  ],
  ["PLT-KA-0006", "SKU-006", "Coimbatore Distribution", "TN-11-EF-9012", "B2",  :rack,    1,  5.0, "stored"  ],
  ["PLT-KA-0007", "SKU-007", "Salem Logistics Hub",     "TN-11-EF-9012", "B3",  :rack,    3, 50.0, "stored"  ],
  ["PLT-KA-0008", "SKU-008", "Madurai Cross-Dock",      "TN-45-GH-3456", "B4",  :rack,    2, 40.0, "stored"  ],
  ["PLT-KA-0009", "SKU-001", "Trichy Warehouse",        "TN-45-GH-3456", "C1",  :rack,    1, 25.0, "stored"  ],
  ["PLT-KA-0010", "SKU-003", "Salem Logistics Hub",     "TN-22-KL-7890",  1,   :staging, 2, 30.0, "staging" ],
  ["PLT-KA-0011", "SKU-005", "Chennai Central Hub",     "TN-22-KL-7890",  2,   :staging, 3, 12.0, "staging" ],
  ["PLT-KA-0012", "SKU-002", "Coimbatore Distribution", "TN-22-KL-7890",  3,   :staging, 1,  8.0, "staging" ],
]

pallets.each do |qr, sku, dest_name, inbound_key, loc_key, loc_type, priority, weight, status|
  if already?(conn, "pallets", "qr_code", qr)
    puts "  skip  pallet: #{qr}"
  else
    p_id  = prod_ids[sku]
    d_id  = dest_ids[dest_name]
    ib_id = inbound_ids[inbound_key]
    l_id  = loc_type == :rack ? rack_loc_ids[loc_key.to_s] : staging_loc_ids[loc_key.to_i]

    conn.exec_params(
      "INSERT INTO pallets
         (qr_code, product_id, destination_id, inbound_truck_id, current_location_id, priority, weight, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [qr, p_id, d_id, ib_id, l_id, priority, weight, status]
    )
    puts "  added pallet: #{qr} — #{sku} → #{dest_name} (#{status})"
  end
end


# ── 9. Generate tasks for staging pallets (no tasks yet) ──────────────────────
puts "\n[9] Generating tasks for staging pallets"

staging_pallets = conn.exec(
  "SELECT p.id, p.current_location_id, p.destination_id, p.weight
   FROM pallets p
   WHERE p.status = 'staging'
     AND NOT EXISTS (
       SELECT 1 FROM tasks t WHERE t.pallet_id = p.id AND t.status = 'pending'
     )"
)

if staging_pallets.ntuples == 0
  puts "  skip  all staging pallets already have tasks"
else
  staging_pallets.each do |p|
    pallet_id        = p["id"].to_i
    staging_loc_id   = p["current_location_id"].to_i

    # Try cross-dock first
    truck_id = assign_pallet_to_truck(pallet_id)

    if truck_id
      puts "  task  pallet #{pallet_id} → cross-dock truck #{truck_id} (worker auto-assigned)"
      worker = auto_assign_worker
      max_seq = conn.exec("SELECT COALESCE(MAX(sequence_order),0) AS ms FROM tasks")[0]["ms"].to_i
      truck   = conn.exec_params("SELECT dock_location_id FROM outbound_trucks WHERE id=$1", [truck_id])[0]
      conn.exec_params(
        "INSERT INTO tasks (pallet_id, truck_id, sequence_order, status, source_location_id, destination_location_id, worker_id)
         VALUES ($1,$2,$3,'pending',$4,$5,$6)",
        [pallet_id, truck_id, max_seq + 1, staging_loc_id, truck["dock_location_id"], worker]
      )
    else
      rack = assign_pallet_to_rack(pallet_id)
      if rack
        generate_storage_task(pallet_id, staging_loc_id, rack["id"].to_i)
        puts "  task  pallet #{pallet_id} → storage rack #{rack["name"]} (worker auto-assigned)"
      else
        puts "  skip  pallet #{pallet_id} — no rack/truck capacity"
      end
    end
  end
end


# ── Summary ───────────────────────────────────────────────────────────────────
puts "\n=============================="
rack_count      = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='rack'")[0]["count"]
staging_count   = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='staging'")[0]["count"]
dock_count      = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='dock'")[0]["count"]
user_count      = conn.exec("SELECT COUNT(*) FROM users")[0]["count"]
dest_count      = conn.exec("SELECT COUNT(*) FROM destinations")[0]["count"]
prod_count      = conn.exec("SELECT COUNT(*) FROM products")[0]["count"]
inbound_count   = conn.exec("SELECT COUNT(*) FROM inbound_trucks")[0]["count"]
outbound_count  = conn.exec("SELECT COUNT(*) FROM outbound_trucks")[0]["count"]
pallet_count    = conn.exec("SELECT COUNT(*) FROM pallets")[0]["count"]
task_count      = conn.exec("SELECT COUNT(*) FROM tasks")[0]["count"]

puts " Seed complete!"
puts "   Racks:          #{rack_count}"
puts "   Staging bays:   #{staging_count}"
puts "   Dock doors:     #{dock_count}"
puts "   Users:          #{user_count}"
puts "   Destinations:   #{dest_count}"
puts "   Products:       #{prod_count}"
puts "   Inbound trucks: #{inbound_count}"
puts "   Outbound trucks:#{outbound_count}"
puts "   Pallets:        #{pallet_count}"
puts "   Tasks:          #{task_count}"
puts "=============================="
puts "\n Login credentials:"
puts "   Manager → manager@warehouse.com / manager123"
puts "   Worker  → worker@warehouse.com  / worker123"
puts ""

conn.close
