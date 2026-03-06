require 'httparty'
require_relative '../../config/database'

def trigger_optimizer

  conn = db_connection

  pallets = conn.exec("
    SELECT id, priority
    FROM pallets
    WHERE outbound_truck_id IS NOT NULL
  ")

  trucks = conn.exec("
    SELECT id, departure_deadline
    FROM outbound_trucks
  ")

  payload = {
    pallets: pallets.map { |p| { id: p["id"].to_i, priority: p["priority"].to_i } },
    trucks: trucks.map { |t| { id: t["id"].to_i } }
  }

  response = HTTParty.post(
    "http://localhost:8000/optimize",
    headers: { "Content-Type" => "application/json" },
    body: payload.to_json
  )

  JSON.parse(response.body)

end
