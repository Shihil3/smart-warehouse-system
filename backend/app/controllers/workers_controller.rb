require 'sinatra'
require 'json'
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
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY completed_tasks DESC, u.name ASC
    SQL
  else
    workers = conn.exec(
      "SELECT id, COALESCE(name, email) AS name, email, role
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
