require_relative '../../config/database'

def generate_tasks(sequence_response)

  conn = db_connection
  puts "SEQUENCE RECIVED"
  puts sequence_response.inspect
  # clear previous tasks
  conn.exec("DELETE FROM tasks")

  return if sequence_response.nil?

  # optimizer returns { "sequence": [...] }
  sequence = sequence_response["sequence"]

  return if sequence.nil? || sequence.empty?

  sequence.each do |item|

    pallet_id = item["pallet_id"]
    order = item["sequence_order"]

    next if pallet_id.nil?

    pallet = conn.exec_params(
  "SELECT * FROM pallets WHERE id=$1",
  [pallet_id]
)[0]

truck = conn.exec_params(
  "SELECT * FROM outbound_trucks WHERE id=$1",
  [pallet["outbound_truck_id"]]
)[0]

source_location = pallet["current_location_id"]
destination_location = truck["dock_location_id"]

conn.exec_params(
  "INSERT INTO tasks
  (pallet_id, truck_id, sequence_order, status, source_location_id, destination_location_id)
  VALUES ($1,$2,$3,$4,$5,$6)",
  [
    pallet_id,
    pallet["outbound_truck_id"],
    order,
    "pending",
    source_location,
    destination_location
  ]
)

  end

end