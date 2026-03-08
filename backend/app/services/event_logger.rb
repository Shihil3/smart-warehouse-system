def log_event(event_type, pallet_id=nil, location_id=nil, description=nil)

  conn = db_connection

  conn.exec_params(
    "INSERT INTO warehouse_events
    (event_type, pallet_id, location_id, description)
    VALUES ($1,$2,$3,$4)",
    [event_type, pallet_id, location_id, description]
  )

end
