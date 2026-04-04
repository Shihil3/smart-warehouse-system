require 'pg'
require 'bcrypt'
require_relative '../config/database'

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

[
  ["manager@warehouse.com", "manager123", "manager", "Ahmad Faris"  ],
  ["worker@warehouse.com",  "worker123",  "worker",  "Razif Hakim"  ],
  ["worker2@warehouse.com", "worker123",  "worker",  "Nurul Ain"    ],
].each do |email, plain_password, role, name|
  if already?(conn, "users", "email", email)
    # Backfill name if column now exists
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
  ["Kuala Lumpur Hub",  "Central",  "Jalan Kuching, KL"],
  ["Penang Warehouse",  "North",    "Bayan Lepas, Penang"],
  ["Johor Cross-Dock",  "South",    "Tebrau, Johor Bahru"],
  ["Kota Kinabalu DC",  "Sabah",    "Kolombong, KK"],
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
  ["SKU-001", "Electronics Box A",  "Electronics", 12.5, 0.08],
  ["SKU-002", "Apparel Bundle B",   "Apparel",      8.0, 0.05],
  ["SKU-003", "Home Appliance C",   "Appliances",  25.0, 0.20],
  ["SKU-004", "Food Package D",     "Food",         5.5, 0.03],
  ["SKU-005", "Industrial Parts E", "Industrial",  40.0, 0.30],
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


# ── Summary ───────────────────────────────────────────────────────────────────
puts "\n=============================="
rack_count    = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='rack'")[0]["count"]
staging_count = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='staging'")[0]["count"]
dock_count    = conn.exec("SELECT COUNT(*) FROM locations WHERE location_type='dock'")[0]["count"]
user_count    = conn.exec("SELECT COUNT(*) FROM users")[0]["count"]
dest_count    = conn.exec("SELECT COUNT(*) FROM destinations")[0]["count"]
prod_count    = conn.exec("SELECT COUNT(*) FROM products")[0]["count"]

puts " Seed complete!"
puts "   Racks:        #{rack_count}"
puts "   Staging bays: #{staging_count}"
puts "   Dock doors:   #{dock_count}"
puts "   Users:        #{user_count}"
puts "   Destinations: #{dest_count}"
puts "   Products:     #{prod_count}"
puts "=============================="
puts "\n Login credentials:"
puts "   Manager → manager@warehouse.com / manager123"
puts "   Worker  → worker@warehouse.com  / worker123"
puts ""

conn.close
