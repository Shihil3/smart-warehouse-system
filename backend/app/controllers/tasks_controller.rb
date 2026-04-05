require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/broadcaster'

# GET /tasks — includes location labels, worker info, and product info
get '/tasks' do
  require_worker(request)
  conn = db_connection

  tasks = conn.exec(<<~SQL)
    SELECT
      t.*,
      COALESCE(src.rack_id, src.label, 'Loc-'||src.id::text) AS source_label,
      src.location_type                                        AS source_type,
      COALESCE(dst.rack_id, dst.label, 'Loc-'||dst.id::text) AS dest_label,
      dst.location_type                                        AS dest_type,
      COALESCE(u.name, u.email)                                AS worker_name,
      u.email                                                  AS worker_email,
      pr.name                                                  AS product_name,
      pr.sku                                                   AS product_sku,
      pr.category                                              AS product_category
    FROM tasks t
    LEFT JOIN locations src ON src.id = t.source_location_id
    LEFT JOIN locations dst ON dst.id = t.destination_location_id
    LEFT JOIN users     u   ON u.id   = t.worker_id
    LEFT JOIN pallets   pal ON pal.id = t.pallet_id
    LEFT JOIN products  pr  ON pr.id  = pal.product_id
    ORDER BY t.sequence_order ASC
  SQL

  tasks.to_a.to_json
end


# POST /tasks/:id/assign — manager assigns a task to a specific worker
post '/tasks/:id/assign' do
  require_manager(request)
  body = JSON.parse(request.body.read)
  halt 422, { error: 'worker_id key is required in request body' }.to_json unless body.key?('worker_id')
  worker_id = body['worker_id']

  conn = db_connection
  task = conn.exec_params("SELECT id, status FROM tasks WHERE id=$1", [params[:id]])
  halt 404, { error: 'Task not found' }.to_json if task.ntuples == 0
  halt 422, { error: 'Only pending tasks can be assigned' }.to_json if task[0]['status'] != 'pending'

  if worker_id.to_s.strip.empty? || worker_id.to_i == 0
    # Unassign
    conn.exec_params("UPDATE tasks SET worker_id=NULL WHERE id=$1", [params[:id]])
    { message: 'Task unassigned' }.to_json
  else
    worker = conn.exec_params("SELECT id, name FROM users WHERE id=$1 AND role='worker'", [worker_id])
    halt 404, { error: 'Worker not found' }.to_json if worker.ntuples == 0
    conn.exec_params("UPDATE tasks SET worker_id=$1 WHERE id=$2", [worker_id, params[:id]])
    { message: "Task assigned to #{worker[0]['name']}", worker_id: worker_id.to_i }.to_json
  end
end


# POST /tasks/:id/start
post '/tasks/:id/start' do
  require_worker(request)
  conn    = db_connection
  result  = conn.exec_params("SELECT id FROM tasks WHERE id=$1", [params[:id]])
  halt 404, { error: "Task not found" }.to_json if result.ntuples == 0

  worker  = current_user(request)
  worker_id = worker ? worker["user_id"] : nil

  conn.exec_params(
    "UPDATE tasks SET status='in_progress', worker_id=$1, started_at=NOW() WHERE id=$2",
    [worker_id, params[:id]]
  )

  Broadcaster.broadcast('task_event', {
    type:      'started',
    task_id:   params[:id].to_i,
    worker_id: worker_id,
  })

  { message: "Task started" }.to_json
end


# POST /tasks/:id/complete  (manual button)
post '/tasks/:id/complete' do
  require_worker(request)
  conn   = db_connection
  result = conn.exec_params("SELECT * FROM tasks WHERE id=$1", [params[:id]])
  halt 404, { error: "Task not found" }.to_json if result.ntuples == 0

  task = result[0]
  conn.exec_params(
    "UPDATE tasks SET status='completed', completed_at=NOW() WHERE id=$1",
    [params[:id]]
  )
  conn.exec_params(
    "UPDATE pallets SET current_location_id=$1 WHERE id=$2",
    [task["destination_location_id"], task["pallet_id"]]
  )
  log_event("PALLET_MOVED", task["pallet_id"], task["destination_location_id"],
            "Pallet moved manually (task ##{params[:id]})")

  Broadcaster.broadcast('task_event', {
    type:      'completed',
    task_id:   params[:id].to_i,
    pallet_id: task["pallet_id"].to_i,
  })

  { message: "Task completed and pallet moved" }.to_json
end


# POST /scan-complete — complete via destination QR scan
post '/scan-complete' do
  require_worker(request)
  body = request.body.read
  halt 400, { error: "Request body required" }.to_json if body.strip.empty?

  data = JSON.parse(body)
  qr   = data["location_code"].to_s.strip
  parts = qr.split("|")
  unless parts.length >= 2 && parts[0] == "LOC"
    halt 400, { error: "Invalid QR format. Expected: LOC|{location_id}" }.to_json
  end

  location_id = parts[1].to_i
  halt 400, { error: "Invalid location ID in QR code" }.to_json if location_id <= 0

  conn = db_connection
  loc_result = conn.exec_params(
    "SELECT id, COALESCE(rack_id, label, 'Loc-'||id::text) AS name, location_type
     FROM locations WHERE id=$1", [location_id]
  )
  halt 404, { error: "Location #{location_id} not found." }.to_json if loc_result.ntuples == 0
  location = loc_result[0]

  task_result = conn.exec_params(
    "SELECT * FROM tasks WHERE status='in_progress' AND destination_location_id=$1
     ORDER BY sequence_order ASC LIMIT 1", [location_id]
  )

  if task_result.ntuples == 0
    other = conn.exec(
      "SELECT t.id, t.destination_location_id,
              COALESCE(l.rack_id, l.label, 'Loc-'||l.id::text) AS expected_name
       FROM tasks t
       LEFT JOIN locations l ON l.id = t.destination_location_id
       WHERE t.status='in_progress' ORDER BY t.sequence_order ASC LIMIT 1"
    )
    if other.ntuples > 0
      expected = other[0]
      halt 422, {
        error: "Wrong location! You scanned \"#{location["name"]}\" but the active task requires \"#{expected["expected_name"]}\".",
        expected_location_id: expected["destination_location_id"].to_i,
        expected_name:        expected["expected_name"]
      }.to_json
    else
      halt 404, { error: "No in-progress tasks found. Start a task first." }.to_json
    end
  end

  task = task_result[0]
  conn.exec_params(
    "UPDATE tasks SET status='completed', completed_at=NOW() WHERE id=$1", [task["id"]]
  )
  conn.exec_params(
    "UPDATE pallets SET current_location_id=$1 WHERE id=$2",
    [location_id, task["pallet_id"]]
  )
  log_event("PALLET_MOVED", task["pallet_id"], location_id,
            "Pallet delivered via QR scan (task ##{task["id"]})")

  {
    message:     "Delivery confirmed! Pallet P-#{task["pallet_id"]} moved to #{location["name"]}.",
    task_id:     task["id"].to_i,
    pallet_id:   task["pallet_id"].to_i,
    location_id: location_id,
    location:    location["name"]
  }.to_json
end
