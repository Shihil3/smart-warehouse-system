require_relative '../../config/database'

class TruckRepository

  def self.create(data)

    conn = db_connection

    dock = conn.exec("
      SELECT id
      FROM locations
      WHERE location_type='dock'
      ORDER BY RANDOM()
      LIMIT 1
    ")[0]

    dock_id = dock["id"]

    conn.exec_params(
      "INSERT INTO outbound_trucks
      (truck_number, destination_id, departure_deadline,
       max_weight, max_pallet_count, status, dock_location_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *",
      [
        data["truck_number"],
        data["destination_id"],
        data["departure_deadline"],
        data["max_weight"],
        data["max_pallet_count"],
        "scheduled",
        dock_id
      ]
    )[0]

  end

end
