require 'sinatra'
require 'json'
require 'bcrypt'
require_relative '../../config/database'

# GET /workers — all workers with live productivity stats
get '/workers' do
  require_manager(request)
  conn = db_connection

  # Check if migration 013 columns exist
  has_timing = conn.exec(
    "SELECT 1 FROM information_schema.columns
     WHERE table_name='tasks' AND column_name='completed_at' AND table_schema='public'"
  ).ntuples > 0

  if has_timing
    workers = conn.exec(<<~SQL)
      SELECT
        u.id,
        COALESCE(u.name, u.email) AS name,
        u.email,
        u.role,
        u.is_leadman,
        u.is_forklift_operator,
        COUNT(t.id)                                          AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed')   AS completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS active_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'pending')     AS pending_tasks,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 60.0
          ) FILTER (WHERE t.status='completed' AND t.started_at IS NOT NULL AND t.completed_at IS NOT NULL)
        )::int                                               AS avg_minutes_per_task,
        MAX(t.completed_at)                                  AS last_active
      FROM users u
      LEFT JOIN tasks t ON t.worker_id = u.id
      WHERE u.role = 'worker'
      GROUP BY u.id, u.name, u.email, u.role, u.is_leadman, u.is_forklift_operator
      ORDER BY completed_tasks DESC, u.name ASC
    SQL
  else
    workers = conn.exec(
      "SELECT id, COALESCE(name, email) AS name, email, role, is_leadman, is_forklift_operator
       FROM users WHERE role='worker' ORDER BY id"
    )
  end

  workers.to_a.to_json
end


# GET /workers/:id/tasks — tasks assigned to a specific worker
get '/workers/:id/tasks' do
  require_manager(request)
  conn = db_connection

  tasks = conn.exec_params(<<~SQL, [params[:id]])
    SELECT
      t.*,
      COALESCE(src.rack_id, src.label, 'Loc-'||src.id::text) AS source_label,
      COALESCE(dst.rack_id, dst.label, 'Loc-'||dst.id::text) AS dest_label
    FROM tasks t
    LEFT JOIN locations src ON src.id = t.source_location_id
    LEFT JOIN locations dst ON dst.id = t.destination_location_id
    WHERE t.worker_id = $1
    ORDER BY t.created_at DESC
    LIMIT 50
  SQL

  tasks.to_a.to_json
end


# POST /workers — manager creates a new worker account
post '/workers' do
  require_manager(request)
  body = JSON.parse(request.body.read)

  name     = body['name'].to_s.strip
  email    = body['email'].to_s.strip.downcase
  password = body['password'].to_s

  halt 422, { error: 'Name is required' }.to_json    if name.empty?
  halt 422, { error: 'Email is required' }.to_json   if email.empty?
  halt 422, { error: 'Password must be at least 6 characters' }.to_json if password.length < 6

  conn = db_connection

  # Check for duplicate email
  existing = conn.exec_params("SELECT id FROM users WHERE email = $1", [email])
  halt 409, { error: "A user with that email already exists" }.to_json if existing.ntuples > 0

  hash = BCrypt::Password.create(password)

  row = conn.exec_params(<<~SQL, [name, email, hash])[0]
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'worker')
    RETURNING id, name, email, role,
              TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
  SQL

  status 201
  row.to_json
end


# POST /workers/:id/toggle-leadman — toggle leadman status
post '/workers/:id/toggle-leadman' do
  require_manager(request)
  conn = db_connection

  result = conn.exec_params(
    "SELECT id, role, is_leadman FROM users WHERE id = $1", [params[:id]]
  )
  halt 404, { error: "Worker not found" }.to_json if result.ntuples == 0
  halt 403, { error: "Managers cannot be assigned as leadmen" }.to_json if result[0]['role'] == 'manager'

  current = result[0]['is_leadman'] == 't'
  new_val = !current

  conn.exec_params(
    "UPDATE users SET is_leadman = $1 WHERE id = $2",
    [new_val, params[:id]]
  )

  { id: params[:id].to_i, is_leadman: new_val }.to_json
end


# POST /workers/:id/toggle-forklift-operator — toggle forklift operator status
post '/workers/:id/toggle-forklift-operator' do
  require_manager(request)
  conn = db_connection

  result = conn.exec_params(
    "SELECT id, role, is_forklift_operator FROM users WHERE id = $1", [params[:id]]
  )
  halt 404, { error: "Worker not found" }.to_json if result.ntuples == 0
  halt 403, { error: "Managers cannot be assigned as forklift operators" }.to_json if result[0]['role'] == 'manager'

  current = result[0]['is_forklift_operator'] == 't'
  new_val = !current

  conn.exec_params(
    "UPDATE users SET is_forklift_operator = $1 WHERE id = $2",
    [new_val, params[:id]]
  )

  { id: params[:id].to_i, is_forklift_operator: new_val }.to_json
end


# DELETE /workers/:id — manager removes a worker account
delete '/workers/:id' do
  require_manager(request)
  conn = db_connection

  # Prevent deleting yourself
  user    = current_user(request)
  user_id = user ? user['user_id'].to_i : nil
  halt 403, { error: "Cannot delete your own account" }.to_json if user_id == params[:id].to_i

  result = conn.exec_params(
    "SELECT id, role FROM users WHERE id = $1", [params[:id]]
  )
  halt 404, { error: "Worker not found" }.to_json if result.ntuples == 0
  halt 403, { error: "Cannot delete manager accounts" }.to_json if result[0]['role'] == 'manager'

  conn.exec_params("DELETE FROM users WHERE id = $1", [params[:id]])
  { message: "Worker removed" }.to_json
end
