require_relative 'broadcaster'

def log_event(event_type, pallet_id = nil, location_id = nil, description = nil)
  conn = db_connection

  row = conn.exec_params(
    "INSERT INTO warehouse_events (event_type, pallet_id, location_id, description)
     VALUES ($1,$2,$3,$4)
     RETURNING id, event_type, pallet_id,
               description AS notes,
               TO_CHAR(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS created_at",
    [event_type, pallet_id, location_id, description]
  )[0]

  # Push to all live SSE clients
  Broadcaster.broadcast('warehouse_event', row)
end
