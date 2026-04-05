require 'sinatra'
require 'json'
require_relative '../../config/database'

get '/kpis' do
  require_manager(request)
  conn = db_connection

  # ── 1. Throughput — tasks completed per day (last 7 days) ───────────────
  throughput_by_day = conn.exec(<<~SQL).to_a
    SELECT
      DATE(created_at)::text              AS day,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS count
    FROM tasks
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  SQL

  # ── 2. Task summary counts ───────────────────────────────────────────────
  task_counts = conn.exec(<<~SQL)[0]
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed')::int  AS total_tasks_completed,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS tasks_in_progress,
      COUNT(*) FILTER (WHERE status = 'pending')::int    AS tasks_pending
    FROM tasks
    WHERE created_at >= NOW() - INTERVAL '7 days'
  SQL

  # ── 3. Inventory breakdown by status (as hash) ───────────────────────────
  inv_rows = conn.exec(<<~SQL).to_a
    SELECT status, COUNT(*)::int AS count
    FROM pallets
    GROUP BY status
  SQL
  inventory_by_status = inv_rows.each_with_object({}) { |r, h| h[r['status']] = r['count'].to_i }

  # ── 4. Truck stats ───────────────────────────────────────────────────────
  truck_row = conn.exec(<<~SQL)[0]
    SELECT
      COUNT(*) FILTER (WHERE status='scheduled')::int           AS scheduled,
      COUNT(*) FILTER (WHERE status='loading')::int             AS loading,
      COUNT(*) FILTER (WHERE status='departed')::int            AS departed,
      COUNT(*)::int                                              AS total,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (departed_at - created_at))/3600.0
      ) FILTER (WHERE status='departed' AND departed_at IS NOT NULL))::int
                                                                 AS avg_turnaround_hours
    FROM outbound_trucks
  SQL
  trucks = {
    'scheduled'            => truck_row['scheduled'].to_i,
    'loading'              => truck_row['loading'].to_i,
    'departed'             => truck_row['departed'].to_i,
    'total'                => truck_row['total'].to_i,
    'avg_turnaround_hours' => truck_row['avg_turnaround_hours']&.to_i,
  }

  # ── 5. Avg pallet dwell time ─────────────────────────────────────────────
  dwell_row = conn.exec(<<~SQL)[0]
    SELECT
      ROUND(AVG(
        EXTRACT(EPOCH FROM (NOW() - created_at))/3600.0
      ) FILTER (WHERE status NOT IN ('delivered')), 1) AS avg_dwell_hours
    FROM pallets
  SQL
  avg_dwell_hours = dwell_row['avg_dwell_hours']&.to_f

  # ── 6. Worker productivity (last 7 days) ────────────────────────────────
  has_timing = conn.exec(
    "SELECT 1 FROM information_schema.columns
     WHERE table_name='tasks' AND column_name='completed_at' AND table_schema='public'"
  ).ntuples > 0

  worker_productivity = if has_timing
    conn.exec(<<~SQL).to_a
      SELECT
        u.id,
        COALESCE(u.name, u.email)                              AS name,
        u.email,
        COUNT(t.id)::int                                       AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status='completed')::int   AS completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status='in_progress')::int AS active_tasks,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (t.completed_at - t.started_at))/60.0
        ) FILTER (WHERE t.status='completed'
                    AND t.started_at IS NOT NULL
                    AND t.completed_at IS NOT NULL))::int       AS avg_minutes_per_task
      FROM users u
      LEFT JOIN tasks t ON t.worker_id = u.id
                        AND t.created_at >= NOW() - INTERVAL '7 days'
      WHERE u.role = 'worker'
      GROUP BY u.id, u.name, u.email
      ORDER BY completed_tasks DESC
    SQL
  else
    conn.exec(
      "SELECT id, COALESCE(name, email) AS name, email,
              0::int AS total_tasks, 0::int AS completed_tasks, 0::int AS active_tasks,
              NULL   AS avg_minutes_per_task
       FROM users WHERE role='worker' ORDER BY id"
    ).to_a
  end

  # ── 7. Recent events (last 20) ───────────────────────────────────────────
  recent_events = conn.exec(<<~SQL).to_a
    SELECT
      id,
      event_type,
      pallet_id,
      description  AS notes,
      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
    FROM warehouse_events
    ORDER BY created_at DESC
    LIMIT 20
  SQL

  {
    total_tasks_completed: task_counts['total_tasks_completed'].to_i,
    tasks_in_progress:     task_counts['tasks_in_progress'].to_i,
    tasks_pending:         task_counts['tasks_pending'].to_i,
    avg_dwell_hours:       avg_dwell_hours,
    throughput_by_day:     throughput_by_day,
    inventory_by_status:   inventory_by_status,
    trucks:                trucks,
    worker_productivity:   worker_productivity,
    recent_events:         recent_events,
  }.to_json
end
