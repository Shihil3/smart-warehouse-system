require_relative '../../config/database'

def generate_tasks(sequence)

  conn = db_connection

  sequence["sequence"].each do |item|

    pallet_id = item["pallet_id"]
    order = item["sequence_order"]

    pallet = conn.exec_params(
      "SELECT outbound_truck_id,current_location_id
       FROM pallets WHERE id=$1",
      [pallet_id]
    )[0]

    dock = conn.exec_params(
      "SELECT dock_location_id
       FROM outbound_trucks
       WHERE id=$1",
      [pallet["outbound_truck_id"]]
    )[0]

    conn.exec_params(
      "INSERT INTO tasks
      (pallet_id, truck_id, sequence_order,
       source_location_id, destination_location_id,
       status)
      VALUES ($1,$2,$3,$4,$5,$6)",
      [
        pallet_id,
        pallet["outbound_truck_id"],
        order,
        pallet["current_location_id"],
        dock["dock_location_id"],
        "pending"
      ]
    )

  end

end