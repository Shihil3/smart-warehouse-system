require 'net/http'
require 'json'

def trigger_optimizer
  conn = db_connection

  # Send current_location_id and created_at so the optimizer can
  # compute distance penalties and aging bonuses correctly.
  pallets = conn.exec(
    "SELECT id, outbound_truck_id, priority, current_location_id, created_at
     FROM pallets
     WHERE status = 'created'
       AND outbound_truck_id IS NOT NULL"
  ).to_a

  trucks = conn.exec(
    "SELECT id, departure_deadline, dock_location_id
     FROM outbound_trucks
     WHERE status != 'departed'"
  ).to_a

  locations = conn.exec(
    "SELECT id, x_coordinate, y_coordinate
     FROM locations"
  ).to_a

  uri = URI("http://localhost:8000/optimize")

  response = Net::HTTP.post(
    uri,
    { pallets: pallets, trucks: trucks, locations: locations }.to_json,
    "Content-Type" => "application/json"
  )

  puts "Optimizer response: #{response.body}"

  JSON.parse(response.body)
rescue => e
  puts "Optimizer error: #{e.message}"
  { "sequence" => [] }
end
