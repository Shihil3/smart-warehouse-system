require 'net/http'
require 'json'

def trigger_optimizer

  conn = db_connection

  pallets = conn.exec("
    SELECT id, outbound_truck_id, priority
    FROM pallets
    WHERE status='created'
  ").to_a

  trucks = conn.exec("
    SELECT id, departure_deadline, dock_location_id
    FROM outbound_trucks
  ").to_a

  locations = conn.exec("
    SELECT id,x_coordinate,y_coordinate
    FROM locations
  ").to_a

  uri = URI("http://localhost:8000/optimize")

  response = Net::HTTP.post(
    uri,
    {
      pallets: pallets,
      trucks: trucks,
      locations: locations
    }.to_json,
    "Content-Type" => "application/json"
  )

  puts "Optimizer response"
  puts response.body

  begin
  JSON.parse(response.body)
rescue
  puts "Optimizer error: #{response.body}"
  return {"sequence" => []}
end

end