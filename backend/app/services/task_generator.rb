require_relative '../../config/database'

# Returns the worker ID with the fewest pending+in_progress tasks.
# Falls back to nil if no workers exist.
def auto_assign_worker
  conn = db_connection

  result = conn.exec(<<~SQL)
    SELECT u.id
    FROM users u
    WHERE u.role = 'worker'
    ORDER BY (
      SELECT COUNT(*)
      FROM tasks t
      WHERE t.worker_id = u.id
        AND t.status IN ('pending', 'in_progress')
    ) ASC, u.id ASC
    LIMIT 1
  SQL

  result.ntuples > 0 ? result[0]["id"].to_i : nil
end


# Regenerates cross-dock tasks from the optimizer sequence.
# Only clears PENDING cross-dock tasks (truck_id IS NOT NULL) so that
# storage and retrieval tasks are preserved across optimizer runs.
def generate_tasks(sequence_response)
  conn = db_connection

  puts "SEQUENCE RECEIVED: #{sequence_response.inspect}"

  # Only wipe pending cross-dock tasks — not storage/retrieval tasks
  conn.exec("DELETE FROM tasks WHERE status='pending' AND truck_id IS NOT NULL")

  return if sequence_response.nil?

  sequence = sequence_response["sequence"]
  return if sequence.nil? || sequence.empty?

  sequence.each do |item|
    pallet_id = item["pallet_id"]
    order     = item["sequence_order"]
    next if pallet_id.nil?

    pallet = conn.exec_params("SELECT * FROM pallets WHERE id=$1", [pallet_id])[0]
    next unless pallet

    # Skip pallets not heading to a truck (they have their own storage task)
    next if pallet["outbound_truck_id"].nil?

    truck = conn.exec_params(
      "SELECT * FROM outbound_trucks WHERE id=$1",
      [pallet["outbound_truck_id"]]
    )[0]
    next unless truck

    source_location      = pallet["current_location_id"]
    destination_location = truck["dock_location_id"]

    assigned_worker = auto_assign_worker
    conn.exec_params(
      "INSERT INTO tasks
       (pallet_id, truck_id, sequence_order, status, source_location_id, destination_location_id, worker_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [pallet_id, pallet["outbound_truck_id"], order, "pending", source_location, destination_location, assigned_worker]
    )
  end
end


# Creates a single storage task: move pallet from its current staging location
# to the assigned rack. truck_id is NULL to distinguish it from cross-dock tasks.
def generate_storage_task(pallet_id, staging_location_id, rack_location_id)
  conn = db_connection

  max_seq = conn.exec(
    "SELECT COALESCE(MAX(sequence_order), 0) AS ms FROM tasks"
  )[0]["ms"].to_i

  assigned_worker = auto_assign_worker
  conn.exec_params(
    "INSERT INTO tasks
     (pallet_id, truck_id, sequence_order, status, source_location_id, destination_location_id, worker_id)
     VALUES ($1, NULL, $2, 'pending', $3, $4, $5)",
    [pallet_id, max_seq + 1, staging_location_id, rack_location_id, assigned_worker]
  )
end


# Creates a retrieval task: move pallet from its rack to a truck's dock.
def generate_retrieval_task(pallet_id, truck_id, rack_location_id, dock_location_id)
  conn = db_connection

  max_seq = conn.exec(
    "SELECT COALESCE(MAX(sequence_order), 0) AS ms FROM tasks"
  )[0]["ms"].to_i

  assigned_worker = auto_assign_worker
  conn.exec_params(
    "INSERT INTO tasks
     (pallet_id, truck_id, sequence_order, status, source_location_id, destination_location_id, worker_id)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6)",
    [pallet_id, truck_id, max_seq + 1, rack_location_id, dock_location_id, assigned_worker]
  )
end
