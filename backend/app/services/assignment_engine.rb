require_relative '../../config/database'

def assign_pallet_to_truck(pallet_id)
  conn = db_connection

  pallet = conn.exec_params("SELECT * FROM pallets WHERE id=$1", [pallet_id])[0]
  return nil unless pallet

  destination_id = pallet["destination_id"]
  weight         = pallet["weight"].to_f

  # Cannot assign without a valid destination
  return nil unless destination_id

  trucks = conn.exec_params(
    "SELECT * FROM outbound_trucks
     WHERE destination_id=$1
       AND status='scheduled'
     ORDER BY departure_deadline ASC",
    [destination_id]
  )

  trucks.each do |truck|
    max_weight     = truck["max_weight"].to_f
    current_weight = truck["current_weight"].to_f
    max_pallets    = truck["max_pallet_count"].to_i
    current_count  = truck["current_pallet_count"].to_i

    next if max_weight > 0 && current_weight + weight > max_weight
    next if max_pallets > 0 && current_count >= max_pallets

    conn.exec_params(
      "UPDATE pallets SET outbound_truck_id=$1 WHERE id=$2",
      [truck["id"], pallet_id]
    )
    conn.exec_params(
      "UPDATE outbound_trucks
       SET current_weight=current_weight+$1, current_pallet_count=current_pallet_count+1
       WHERE id=$2",
      [weight, truck["id"]]
    )
    return truck["id"]
  end

  nil
rescue => e
  puts "WARN: assign_pallet_to_truck error for pallet #{pallet_id}: #{e.message}"
  nil
end
