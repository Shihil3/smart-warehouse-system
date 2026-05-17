require 'pg'
require 'bcrypt'
require_relative '../config/database'
require_relative '../app/services/task_generator'
require_relative '../app/services/rack_assignment_service'
require_relative '../app/services/assignment_engine'

conn = db_connection

puts "\n=============================================="
puts "  Smart Warehouse — Demo Reset & Seed"
puts "  Target: May 19 Presentation"
puts "==============================================\n"

# ── STEP 1: Clear demo data (preserve schema, users, zones, locations, destinations) ──

puts "\n[RESET] Clearing old demo data..."

conn.exec("DELETE FROM tasks")
conn.exec("DELETE FROM warehouse_events")
conn.exec("DELETE FROM congestion_alerts")
conn.exec("DELETE FROM pallets")
conn.exec("DELETE FROM outbound_trucks")
conn.exec("DELETE FROM inbound_trucks")
conn.exec("DELETE FROM products")

# Reset sequences
conn.exec("SELECT setval('tasks_id_seq',              1, false)")
conn.exec("SELECT setval('warehouse_events_id_seq',   1, false)")
conn.exec("SELECT setval('congestion_alerts_id_seq',  1, false)")
conn.exec("SELECT setval('pallets_id_seq',            1, false)")
conn.exec("SELECT setval('outbound_trucks_id_seq',    1, false)")
conn.exec("SELECT setval('inbound_trucks_id_seq',     1, false)")
conn.exec("SELECT setval('products_id_seq',           1, false)")

puts "  cleared: tasks, events, alerts, pallets, trucks, products"

# ── Ensure zones / locations / destinations exist (idempotent) ──

# Zones
[[1,"Storage Zone","storage"],[2,"Staging Zone","staging"],[3,"Loading Dock Zone","dock"]].each do |id,name,type|
  unless conn.exec_params("SELECT 1 FROM zones WHERE id=$1",[id]).ntuples > 0
    conn.exec_params("INSERT INTO zones (id,name,zone_type) VALUES ($1,$2,$3)",[id,name,type])
  end
end
conn.exec("SELECT setval('zones_id_seq',(SELECT MAX(id) FROM zones))")

# Locations
has_rack_cols = conn.exec(
  "SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='rack_id' AND table_schema='public'"
).ntuples > 0

%w[A B C].each_with_index do |row,ri|
  (1..4).each do |col|
    label = "Rack #{row}#{col}"
    unless conn.exec_params("SELECT 1 FROM locations WHERE label=$1",[label]).ntuples > 0
      if has_rack_cols
        conn.exec_params(
          "INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label,rack_id,max_capacity) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [1,"rack",col*20,(ri+1)*20,label,"R-#{row}#{col}",8]
        )
      else
        conn.exec_params(
          "INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label) VALUES ($1,$2,$3,$4,$5)",
          [1,"rack",col*20,(ri+1)*20,label]
        )
      end
    end
  end
end

(1..4).each do |i|
  label = "Staging-#{i}"
  unless conn.exec_params("SELECT 1 FROM locations WHERE label=$1",[label]).ntuples > 0
    if has_rack_cols
      conn.exec_params(
        "INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label,rack_id,max_capacity) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [2,"staging",i*20,50,label,nil,nil]
      )
    else
      conn.exec_params("INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label) VALUES ($1,$2,$3,$4,$5)",[2,"staging",i*20,50,label])
    end
  end
end

(1..4).each do |i|
  label = "Dock-#{i}"
  unless conn.exec_params("SELECT 1 FROM locations WHERE label=$1",[label]).ntuples > 0
    if has_rack_cols
      conn.exec_params(
        "INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label,rack_id,max_capacity) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [3,"dock",i*20,80,label,nil,nil]
      )
    else
      conn.exec_params("INSERT INTO locations (zone_id,location_type,x_coordinate,y_coordinate,label) VALUES ($1,$2,$3,$4,$5)",[3,"dock",i*20,80,label])
    end
  end
end

# Destinations
dest_data = [
  ["Chennai Central Hub",        "North",      "Maduravoyal, Chennai - 600095"],
  ["Coimbatore Distribution",    "West",       "Ganapathy, Coimbatore - 641006"],
  ["Madurai Cross-Dock",         "South",      "Avaniyapuram, Madurai - 625012"],
  ["Trichy Warehouse",           "Central",    "Ariyamangalam, Tiruchirappalli - 620010"],
  ["Salem Logistics Hub",        "North-West", "Attur Road, Salem - 636016"],
  ["Tirunelveli Depot",          "Far South",  "Palayamkottai, Tirunelveli - 627002"],
  ["Erode Textile Warehouse",    "West",       "Perundurai Road, Erode - 638011"],
  ["Pondicherry Freight Centre", "East",       "Villianur, Puducherry - 605110"],
]
dest_data.each do |name,region,address|
  unless conn.exec_params("SELECT 1 FROM destinations WHERE name=$1",[name]).ntuples > 0
    conn.exec_params("INSERT INTO destinations (name,region,address) VALUES ($1,$2,$3)",[name,region,address])
  end
end

# Users
has_name_col    = conn.exec("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name' AND table_schema='public'").ntuples > 0
has_leadman_col = conn.exec("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_leadman' AND table_schema='public'").ntuples > 0

[
  ["manager@warehouse.com", "manager123", "manager", "Karthikeyan Murugan", false],
  ["worker@warehouse.com",  "worker123",  "worker",  "Selvam Rajan",        false],
  ["worker2@warehouse.com", "worker123",  "worker",  "Priya Devi",          false],
  ["worker3@warehouse.com", "worker123",  "worker",  "Murugan Arumugam",    true ],
].each do |email,pwd,role,name,leadman|
  unless conn.exec_params("SELECT 1 FROM users WHERE email=$1",[email]).ntuples > 0
    hash = BCrypt::Password.create(pwd)
    if has_name_col && has_leadman_col
      conn.exec_params("INSERT INTO users (email,password_hash,role,name,is_leadman) VALUES ($1,$2,$3,$4,$5)",[email,hash,role,name,leadman])
    elsif has_name_col
      conn.exec_params("INSERT INTO users (email,password_hash,role,name) VALUES ($1,$2,$3,$4)",[email,hash,role,name])
    else
      conn.exec_params("INSERT INTO users (email,password_hash,role) VALUES ($1,$2,$3)",[email,hash,role])
    end
    puts "  added user: #{email} (#{role})"
  end
end

# ── STEP 2: Lookup helper IDs ──────────────────────────────────────────────

def lookup_id(conn, table, field, value)
  r = conn.exec_params("SELECT id FROM #{table} WHERE #{field}=$1 LIMIT 1",[value]).first
  r ? r["id"].to_i : nil
end

dest = {}
dest_data.each { |name,_,_| dest[name] = lookup_id(conn,"destinations","name",name) }

rack_loc = {}
%w[A B C].each do |row|
  (1..4).each { |col| rack_loc["#{row}#{col}"] = lookup_id(conn,"locations","label","Rack #{row}#{col}") }
end

staging_loc = {}
(1..4).each { |i| staging_loc[i] = lookup_id(conn,"locations","label","Staging-#{i}") }

dock_loc = {}
(1..4).each { |i| dock_loc[i] = lookup_id(conn,"locations","label","Dock-#{i}") }

# ── STEP 3: Products (18 realistic items) ─────────────────────────────────

puts "\n[1] Products"

products_data = [
  # SKU,           Name,                                   Category,       Weight, Volume
  ["SKU-E01", "Laptop Computer Units (Box of 5)",          "Electronics",   18.5,  0.08],
  ["SKU-E02", "CCTV Camera System Carton",                 "Electronics",   12.0,  0.06],
  ["SKU-E03", "LED Smart TV (32-inch) Pallet",             "Electronics",   28.0,  0.15],
  ["SKU-E04", "Mobile Phone Sealed Boxes (x20)",           "Electronics",    9.0,  0.04],
  ["SKU-E05", "Industrial Printer Cartridge Set",          "Electronics",    6.5,  0.03],
  ["SKU-M01", "IV Fluid Solution Cases (x24)",             "Medical",       22.0,  0.09],
  ["SKU-M02", "Surgical Glove Cartons (x50 boxes)",        "Medical",        8.5,  0.05],
  ["SKU-M03", "Pharmaceutical Tablet Cases",               "Medical",       15.0,  0.07],
  ["SKU-M04", "Medical Diagnostic Kit Pallet",             "Medical",       20.0,  0.10],
  ["SKU-F01", "Premium Basmati Rice Sacks (25 kg x4)",     "Food Grains",  100.0,  0.16],
  ["SKU-F02", "Packaged Biscuit Cartons (x40)",            "Food",          18.0,  0.12],
  ["SKU-F03", "Cooking Oil Drums (5L x12)",                "Food",          72.0,  0.18],
  ["SKU-F04", "Mineral Water Pallet (500ml x500)",         "Food",          60.0,  0.20],
  ["SKU-A01", "Two-Wheeler Engine Assembly Kit",           "Automotive",    45.0,  0.30],
  ["SKU-A02", "Car Battery Units (x8)",                    "Automotive",    88.0,  0.25],
  ["SKU-A03", "Heavy-Duty Brake Pad Kit (x20 sets)",       "Automotive",    32.0,  0.14],
  ["SKU-C01", "Home Appliance Carton (Mixer/Grinder x10)", "Consumer Goods",35.0,  0.20],
  ["SKU-C02", "Kancheepuram Silk Textile Bundle",          "Textiles",      12.0,  0.08],
]

prod_ids = {}
products_data.each do |sku,name,cat,weight,volume|
  res = conn.exec_params(
    "INSERT INTO products (sku,name,category,weight,volume) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [sku,name,cat,weight,volume]
  )
  prod_ids[sku] = res[0]["id"].to_i
  puts "  added product: #{name}"
end

# ── STEP 4: Inbound Trucks ────────────────────────────────────────────────

puts "\n[2] Inbound Trucks"

# NOW = 2026-05-19 09:00 (demo morning)
inbound_data = [
  # truck_number,       status,      arrival_time
  ["TN-01-AA-0001", "arrived",   "2026-05-19 06:30:00"],  # Electronics — high-priority, arrived early
  ["TN-22-BB-0002", "unloading", "2026-05-19 07:45:00"],  # Medical supplies — currently unloading
  ["TN-33-CC-0003", "arrived",   "2026-05-19 08:00:00"],  # Food items — arrived
  ["TN-44-DD-0004", "pending",   "2026-05-19 11:30:00"],  # Automotive — delayed (late arrival)
  ["TN-55-EE-0005", "unloading", "2026-05-19 08:30:00"],  # Consumer goods — unloading now
  ["TN-66-FF-0006", "completed", "2026-05-18 18:00:00"],  # Yesterday's truck — completed
]

inbound_ids = {}
inbound_data.each do |truck_number,status,arrival|
  res = conn.exec_params(
    "INSERT INTO inbound_trucks (truck_number,status,arrival_time) VALUES ($1,$2,$3) RETURNING id",
    [truck_number,status,arrival]
  )
  inbound_ids[truck_number] = res[0]["id"].to_i
  puts "  added inbound truck: #{truck_number} (#{status})"
end

# ── STEP 5: Outbound Trucks ───────────────────────────────────────────────

puts "\n[3] Outbound Trucks"

outbound_data = [
  # truck_number,      destination,                 deadline,              max_wt,  max_plt, dock
  ["TN-OB-AA-0001", "Chennai Central Hub",     "2026-05-19 13:00:00", 6000.0, 24, 1],  # URGENT - 4hr window
  ["TN-OB-BB-0002", "Coimbatore Distribution", "2026-05-19 16:00:00", 5000.0, 20, 2],  # 7hr window
  ["TN-OB-CC-0003", "Madurai Cross-Dock",      "2026-05-19 20:00:00", 5500.0, 22, 3],  # Evening departure
  ["TN-OB-DD-0004", "Trichy Warehouse",        "2026-05-20 10:00:00", 4500.0, 18, 4],  # Tomorrow AM
  ["TN-OB-EE-0005", "Salem Logistics Hub",     "2026-05-20 14:00:00", 4000.0, 16, 1],  # Tomorrow PM
]

outbound_ids = {}
outbound_data.each do |truck_number,dest_name,deadline,max_weight,max_pallets,dock_num|
  d_id  = dest[dest_name]
  dk_id = dock_loc[dock_num]
  res = conn.exec_params(
    "INSERT INTO outbound_trucks (truck_number,destination_id,departure_deadline,max_weight,max_pallet_count,dock_location_id,status) VALUES ($1,$2,$3,$4,$5,$6,'scheduled') RETURNING id",
    [truck_number,d_id,deadline,max_weight,max_pallets,dk_id]
  )
  outbound_ids[truck_number] = res[0]["id"].to_i
  puts "  added outbound truck: #{truck_number} → #{dest_name}"
end

# ── STEP 6: Pallets (50 pallets with mixed statuses) ──────────────────────

puts "\n[4] Pallets"

# Format: qr_code, sku, dest_name, inbound_truck, location_key, loc_type, priority, weight, status, outbound_truck
pallets_data = [
  # ── STORED in racks (20 pallets) — arrived yesterday / early morning ──
  ["PLT-001","SKU-E01","Chennai Central Hub",     "TN-66-FF-0006","A1",:rack,1,18.5,"stored",nil],
  ["PLT-002","SKU-E02","Coimbatore Distribution", "TN-66-FF-0006","A2",:rack,2,12.0,"stored",nil],
  ["PLT-003","SKU-M01","Chennai Central Hub",     "TN-66-FF-0006","A3",:rack,1,22.0,"stored",nil],
  ["PLT-004","SKU-M02","Madurai Cross-Dock",      "TN-66-FF-0006","A4",:rack,2, 8.5,"stored",nil],
  ["PLT-005","SKU-F01","Trichy Warehouse",        "TN-66-FF-0006","B1",:rack,2,100.0,"stored",nil],
  ["PLT-006","SKU-F02","Salem Logistics Hub",     "TN-66-FF-0006","B2",:rack,3,18.0,"stored",nil],
  ["PLT-007","SKU-A01","Chennai Central Hub",     "TN-66-FF-0006","B3",:rack,1,45.0,"stored",nil],
  ["PLT-008","SKU-A02","Coimbatore Distribution", "TN-66-FF-0006","B4",:rack,2,88.0,"stored",nil],
  ["PLT-009","SKU-C01","Madurai Cross-Dock",      "TN-66-FF-0006","C1",:rack,3,35.0,"stored",nil],
  ["PLT-010","SKU-C02","Trichy Warehouse",        "TN-66-FF-0006","C2",:rack,2,12.0,"stored",nil],
  ["PLT-011","SKU-E03","Chennai Central Hub",     "TN-01-AA-0001","C3",:rack,1,28.0,"stored",nil],
  ["PLT-012","SKU-E04","Coimbatore Distribution", "TN-01-AA-0001","C4",:rack,1, 9.0,"stored",nil],
  ["PLT-013","SKU-M03","Salem Logistics Hub",     "TN-22-BB-0002","A1",:rack,1,15.0,"stored",nil],
  ["PLT-014","SKU-M04","Trichy Warehouse",        "TN-22-BB-0002","A2",:rack,1,20.0,"stored",nil],
  ["PLT-015","SKU-F03","Chennai Central Hub",     "TN-33-CC-0003","A3",:rack,2,72.0,"stored",nil],
  ["PLT-016","SKU-F04","Coimbatore Distribution", "TN-33-CC-0003","A4",:rack,2,60.0,"stored",nil],
  ["PLT-017","SKU-A03","Madurai Cross-Dock",      "TN-55-EE-0005","B1",:rack,2,32.0,"stored",nil],
  ["PLT-018","SKU-C01","Chennai Central Hub",     "TN-55-EE-0005","B2",:rack,3,35.0,"stored",nil],
  ["PLT-019","SKU-E05","Trichy Warehouse",        "TN-01-AA-0001","B3",:rack,2, 6.5,"stored",nil],
  ["PLT-020","SKU-M01","Salem Logistics Hub",     "TN-22-BB-0002","B4",:rack,1,22.0,"stored",nil],

  # ── IN_TRANSIT (assigned to outbound truck, cross-dock active) — 10 pallets ──
  ["PLT-021","SKU-E01","Chennai Central Hub",     "TN-01-AA-0001",1,:staging,1,18.5,"in_transit","TN-OB-AA-0001"],
  ["PLT-022","SKU-E02","Chennai Central Hub",     "TN-01-AA-0001",2,:staging,1,12.0,"in_transit","TN-OB-AA-0001"],
  ["PLT-023","SKU-M03","Coimbatore Distribution", "TN-22-BB-0002",3,:staging,1,15.0,"in_transit","TN-OB-BB-0002"],
  ["PLT-024","SKU-M04","Coimbatore Distribution", "TN-22-BB-0002",4,:staging,1,20.0,"in_transit","TN-OB-BB-0002"],
  ["PLT-025","SKU-F01","Madurai Cross-Dock",      "TN-33-CC-0003",1,:staging,2,100.0,"in_transit","TN-OB-CC-0003"],
  ["PLT-026","SKU-F02","Madurai Cross-Dock",      "TN-33-CC-0003",2,:staging,2,18.0,"in_transit","TN-OB-CC-0003"],
  ["PLT-027","SKU-A01","Trichy Warehouse",        "TN-55-EE-0005",3,:staging,1,45.0,"in_transit","TN-OB-DD-0004"],
  ["PLT-028","SKU-A03","Trichy Warehouse",        "TN-55-EE-0005",4,:staging,2,32.0,"in_transit","TN-OB-DD-0004"],
  ["PLT-029","SKU-C01","Salem Logistics Hub",     "TN-55-EE-0005",1,:staging,3,35.0,"in_transit","TN-OB-EE-0005"],
  ["PLT-030","SKU-C02","Salem Logistics Hub",     "TN-55-EE-0005",2,:staging,2,12.0,"in_transit","TN-OB-EE-0005"],

  # ── STAGING — waiting, just arrived ─ 8 pallets ──
  ["PLT-031","SKU-E03","Chennai Central Hub",     "TN-01-AA-0001",3,:staging,1,28.0,"staging",nil],
  ["PLT-032","SKU-E04","Chennai Central Hub",     "TN-01-AA-0001",4,:staging,1, 9.0,"staging",nil],
  ["PLT-033","SKU-M01","Coimbatore Distribution", "TN-22-BB-0002",1,:staging,1,22.0,"staging",nil],
  ["PLT-034","SKU-M02","Madurai Cross-Dock",      "TN-22-BB-0002",2,:staging,2, 8.5,"staging",nil],
  ["PLT-035","SKU-F03","Trichy Warehouse",        "TN-33-CC-0003",3,:staging,2,72.0,"staging",nil],
  ["PLT-036","SKU-F04","Salem Logistics Hub",     "TN-33-CC-0003",4,:staging,2,60.0,"staging",nil],
  ["PLT-037","SKU-A02","Chennai Central Hub",     "TN-55-EE-0005",1,:staging,2,88.0,"staging",nil],
  ["PLT-038","SKU-C01","Coimbatore Distribution", "TN-55-EE-0005",2,:staging,3,35.0,"staging",nil],

  # ── DELIVERED (completed shipments for KPI data) — 8 pallets ──
  ["PLT-039","SKU-E01","Chennai Central Hub",     "TN-66-FF-0006",1,:staging,1,18.5,"delivered",nil],
  ["PLT-040","SKU-M01","Coimbatore Distribution", "TN-66-FF-0006",2,:staging,1,22.0,"delivered",nil],
  ["PLT-041","SKU-F01","Madurai Cross-Dock",      "TN-66-FF-0006",3,:staging,2,100.0,"delivered",nil],
  ["PLT-042","SKU-A01","Trichy Warehouse",        "TN-66-FF-0006",4,:staging,1,45.0,"delivered",nil],
  ["PLT-043","SKU-C01","Salem Logistics Hub",     "TN-66-FF-0006",1,:staging,3,35.0,"delivered",nil],
  ["PLT-044","SKU-E02","Chennai Central Hub",     "TN-66-FF-0006",2,:staging,2,12.0,"delivered",nil],
  ["PLT-045","SKU-M02","Coimbatore Distribution", "TN-66-FF-0006",3,:staging,2, 8.5,"delivered",nil],
  ["PLT-046","SKU-F02","Trichy Warehouse",        "TN-66-FF-0006",4,:staging,3,18.0,"delivered",nil],

  # ── PENDING STORAGE — overflow from delayed truck ─ 4 pallets ──
  ["PLT-047","SKU-A01","Chennai Central Hub",     "TN-44-DD-0004",1,:staging,1,45.0,"pending_storage",nil],
  ["PLT-048","SKU-A02","Coimbatore Distribution", "TN-44-DD-0004",2,:staging,1,88.0,"pending_storage",nil],
  ["PLT-049","SKU-A03","Madurai Cross-Dock",      "TN-44-DD-0004",3,:staging,2,32.0,"pending_storage",nil],
  ["PLT-050","SKU-C01","Salem Logistics Hub",     "TN-44-DD-0004",4,:staging,3,35.0,"pending_storage",nil],
]

pallet_ids = {}
pallets_data.each do |qr,sku,dest_name,inbound_key,loc_key,loc_type,priority,weight,status,outbound_key|
  p_id  = prod_ids[sku]
  d_id  = dest[dest_name]
  ib_id = inbound_ids[inbound_key]
  ob_id = outbound_key ? outbound_ids[outbound_key] : nil
  l_id  = loc_type == :rack ? rack_loc[loc_key.to_s] : staging_loc[loc_key.to_i]

  res = conn.exec_params(
    "INSERT INTO pallets (qr_code,product_id,destination_id,inbound_truck_id,outbound_truck_id,current_location_id,priority,weight,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [qr,p_id,d_id,ib_id,ob_id,l_id,priority,weight,status]
  )
  pallet_ids[qr] = res[0]["id"].to_i

  # Update outbound truck weight/count for assigned pallets
  if ob_id
    conn.exec_params(
      "UPDATE outbound_trucks SET current_weight=current_weight+$1, current_pallet_count=current_pallet_count+1 WHERE id=$2",
      [weight,ob_id]
    )
  end

  puts "  added pallet: #{qr} — #{sku} → #{dest_name} [#{status}]"
end

# ── STEP 7: Tasks ─────────────────────────────────────────────────────────

puts "\n[5] Tasks"

workers = conn.exec("SELECT id FROM users WHERE role='worker' ORDER BY id ASC").to_a.map { |r| r["id"].to_i }
worker_idx = 0
def next_worker(workers, idx); [workers[idx % workers.length], idx + 1]; end

seq = 0

# A. Completed tasks for KPI history (last 3 days of activity)
[
  ["PLT-039",1], ["PLT-040",2], ["PLT-041",3], ["PLT-042",4],
  ["PLT-043",1], ["PLT-044",2], ["PLT-045",3], ["PLT-046",4],
].each do |qr, staging_num|
  pid     = pallet_ids[qr]
  src_loc = staging_loc[staging_num]
  # pallets delivered → put them at dock-1
  dst_loc = dock_loc[1]
  w_id, worker_idx = next_worker(workers, worker_idx)
  seq += 1
  hours_ago = rand(8..72)
  start_ts  = Time.now - hours_ago * 3600
  end_ts    = start_ts + rand(20..45) * 60
  conn.exec_params(
    "INSERT INTO tasks (pallet_id,truck_id,sequence_order,status,source_location_id,destination_location_id,worker_id,started_at,completed_at,created_at) VALUES ($1,$2,$3,'completed',$4,$5,$6,$7,$8,$9)",
    [pid, nil, seq, src_loc, dst_loc, w_id, start_ts.strftime("%Y-%m-%d %H:%M:%S"), end_ts.strftime("%Y-%m-%d %H:%M:%S"), (start_ts - 300).strftime("%Y-%m-%d %H:%M:%S")]
  )
  puts "  task (completed): PLT #{qr} → Dock-1 by worker #{w_id}"
end

# B. Cross-dock tasks for in_transit pallets — pending (ready for demo)
cross_dock_assignments = {
  "PLT-021" => ["TN-OB-AA-0001", 1],
  "PLT-022" => ["TN-OB-AA-0001", 2],
  "PLT-023" => ["TN-OB-BB-0002", 3],
  "PLT-024" => ["TN-OB-BB-0002", 4],
  "PLT-025" => ["TN-OB-CC-0003", 5],
  "PLT-026" => ["TN-OB-CC-0003", 6],
  "PLT-027" => ["TN-OB-DD-0004", 7],
  "PLT-028" => ["TN-OB-DD-0004", 8],
  "PLT-029" => ["TN-OB-EE-0005", 9],
  "PLT-030" => ["TN-OB-EE-0005", 10],
}

outbound_dock = {
  "TN-OB-AA-0001" => dock_loc[1],
  "TN-OB-BB-0002" => dock_loc[2],
  "TN-OB-CC-0003" => dock_loc[3],
  "TN-OB-DD-0004" => dock_loc[4],
  "TN-OB-EE-0005" => dock_loc[1],
}

cross_dock_assignments.each do |qr, (ob_key, order)|
  pid     = pallet_ids[qr]
  ob_id   = outbound_ids[ob_key]
  src_loc = staging_loc[(order - 1) % 4 + 1]
  dst_loc = outbound_dock[ob_key]
  w_id, worker_idx = next_worker(workers, worker_idx)
  seq += 1
  conn.exec_params(
    "INSERT INTO tasks (pallet_id,truck_id,sequence_order,status,source_location_id,destination_location_id,worker_id) VALUES ($1,$2,$3,'pending',$4,$5,$6)",
    [pid, ob_id, order, src_loc, dst_loc, w_id]
  )
  puts "  task (pending cross-dock): #{qr} → #{ob_key} seq=#{order}"
end

# C. One in-progress task — actively being executed during demo
first_pid = pallet_ids["PLT-021"]
if first_pid
  conn.exec_params(
    "UPDATE tasks SET status='in_progress', started_at=NOW() WHERE pallet_id=$1 AND status='pending'",
    [first_pid]
  )
  puts "  task (in_progress): PLT-021 — demo live task"
end

# D. Storage tasks for pending_storage pallets
pending_storage_qrs = ["PLT-047","PLT-048","PLT-049","PLT-050"]
free_racks = conn.exec(
  "SELECT l.id FROM locations l WHERE l.location_type='rack' ORDER BY l.id ASC LIMIT 4"
).to_a.map { |r| r["id"].to_i }

pending_storage_qrs.each_with_index do |qr, idx|
  pid     = pallet_ids[qr]
  src_loc = staging_loc[idx + 1]
  dst_loc = free_racks[idx] || rack_loc["C1"]
  w_id, worker_idx = next_worker(workers, worker_idx)
  seq += 1
  conn.exec_params(
    "INSERT INTO tasks (pallet_id,truck_id,sequence_order,status,source_location_id,destination_location_id,worker_id) VALUES ($1,NULL,$2,'pending',$3,$4,$5)",
    [pid, seq, src_loc, dst_loc, w_id]
  )
  puts "  task (storage): #{qr}"
end

# ── STEP 8: Warehouse Events ──────────────────────────────────────────────

puts "\n[6] Warehouse Events"

events = [
  ["PALLET_CREATED",      pallet_ids["PLT-001"], dock_loc[1], "Pallet PLT-001 received at Dock-1 from TN-66-FF-0006"],
  ["PALLET_STORED",       pallet_ids["PLT-005"], rack_loc["B1"], "PLT-005 stored at Rack B1 (100kg Rice)"],
  ["PALLET_MOVED",        pallet_ids["PLT-039"], dock_loc[1], "PLT-039 cross-docked and loaded on outbound truck"],
  ["PALLET_RACK_ASSIGNED",pallet_ids["PLT-047"], staging_loc[1], "PLT-047 queued for rack assignment (delayed truck overflow)"],
  ["TRUCK_DEPARTED",      nil, dock_loc[1], "Truck TN-66-FF-0006 departed with 8 pallets to Chennai Central Hub"],
  ["PALLET_CREATED",      pallet_ids["PLT-021"], staging_loc[1], "High-priority electronics pallet PLT-021 arrived"],
  ["PALLET_CREATED",      pallet_ids["PLT-023"], staging_loc[3], "Medical supplies PLT-023 assigned to Coimbatore truck"],
  ["CONGESTION_ALERT",    nil, dock_loc[1], "Dock-1 congestion: 3 trucks queued — reassigning overflow to Dock-2"],
]

events.each do |event_type, pallet_id, location_id, description|
  conn.exec_params(
    "INSERT INTO warehouse_events (event_type,pallet_id,location_id,description) VALUES ($1,$2,$3,$4)",
    [event_type, pallet_id, location_id, description]
  )
  puts "  event: #{event_type}"
end

# ── STEP 9: Congestion Alert ──────────────────────────────────────────────

conn.exec_params(
  "INSERT INTO congestion_alerts (dock_id,message,severity) VALUES ($1,$2,$3)",
  [dock_loc[1], "Dock-1 approaching capacity: 3 trucks scheduled, recommend redirecting to Dock-2", "warning"]
)
puts "\n[7] Congestion alert inserted"

# ── Summary ───────────────────────────────────────────────────────────────

puts "\n=============================================="
puts " DEMO DATA LOADED SUCCESSFULLY"
puts "----------------------------------------------"
puts "  Products:        #{conn.exec("SELECT COUNT(*) FROM products")[0]["count"]}"
puts "  Inbound Trucks:  #{conn.exec("SELECT COUNT(*) FROM inbound_trucks")[0]["count"]}"
puts "  Outbound Trucks: #{conn.exec("SELECT COUNT(*) FROM outbound_trucks")[0]["count"]}"
puts "  Pallets:         #{conn.exec("SELECT COUNT(*) FROM pallets")[0]["count"]}"
puts "    - stored:         #{conn.exec("SELECT COUNT(*) FROM pallets WHERE status='stored'")[0]["count"]}"
puts "    - in_transit:     #{conn.exec("SELECT COUNT(*) FROM pallets WHERE status='in_transit'")[0]["count"]}"
puts "    - staging:        #{conn.exec("SELECT COUNT(*) FROM pallets WHERE status='staging'")[0]["count"]}"
puts "    - pending_storage:#{conn.exec("SELECT COUNT(*) FROM pallets WHERE status='pending_storage'")[0]["count"]}"
puts "    - delivered:      #{conn.exec("SELECT COUNT(*) FROM pallets WHERE status='delivered'")[0]["count"]}"
puts "  Tasks:           #{conn.exec("SELECT COUNT(*) FROM tasks")[0]["count"]}"
puts "    - completed:      #{conn.exec("SELECT COUNT(*) FROM tasks WHERE status='completed'")[0]["count"]}"
puts "    - pending:        #{conn.exec("SELECT COUNT(*) FROM tasks WHERE status='pending'")[0]["count"]}"
puts "    - in_progress:    #{conn.exec("SELECT COUNT(*) FROM tasks WHERE status='in_progress'")[0]["count"]}"
puts "  Events:          #{conn.exec("SELECT COUNT(*) FROM warehouse_events")[0]["count"]}"
puts "=============================================="
puts "\n NEXT STEP: Run QR code generator:"
puts "  cd backend && python scripts/generate_qr_codes.py"
puts "\n Login credentials:"
puts "   Manager → manager@warehouse.com / manager123"
puts "   Worker  → worker@warehouse.com  / worker123"
puts "   Leadman → worker3@warehouse.com / worker123"
puts ""

conn.close
