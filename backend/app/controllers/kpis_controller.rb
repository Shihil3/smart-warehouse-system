require 'sinatra'
require 'json'
require_relative '../../config/database'

get '/kpis' do
  require_manager(request)
  conn = db_connection

  # ── 1. Throughput — pallets received per day (last 7 days) ──────────────
  throughput = conn.exec(<<~SQL).to_a
    SELECT
      DATE(created_at)       AS day,
      COUNT(*)::int          AS pallets_received,
      COUNT(*) FILTER (WHERE status = 'delivered')::int AS pallets_delivered
    FROM pallets
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  SQL

  # ── 2. Inventory breakdown by status ────────────────────────────────────
  inventory = conn.exec(<<~SQL).to_a
    SELECT status, COUNT(*)::int AS count
    FROM pallets
    GROUP BY status
    ORDER BY status
  SQL

  # ── 3. Truck stats ───────────────────────────────────────────────────────
  truck_stats = conn.exec(<<~SQL)[0]
    SELECT
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE status='scheduled')::int           AS scheduled,
      COUNT(*) FILTER (WHERE status='loading')::int             AS loading,
      COUNT(*) FILTER (WHERE status='departed')::int            AS departed,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (departed_at - created_at))/3600.0
      ) FILTER (WHERE status='departed' AND departed_at IS NOT NULL))::int
                                                                 AS avg_turnaround_hours
    FROM outbound_trucks
  SQL

  # ── 4. Avg pallet dwell time (created → delivered) ──────────────────────
  dwell = conn.exec(<<~SQL)[0]
    SELECT
      ROUND(AVG(
        EXTRACT(EPOCH FROM (NOW() - created_at))/3600.0
      ) FILTER (WHERE status NOT IN ('delivered')))::int         AS avg_active_dwell_hours,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (
          (SELECT MAX(completed_at) FROM tasks t WHERE t.pallet_id = p.id) - p.created_at
        ))/3600.0
      ) FILTER (WHERE status='delivered'))::int                  AS avg_delivered_dwell_hours
    FROM pallets p
  SQL

  # ── 5. Worker productivity (last 7 days) ────────────────────────────────
  has_timing = conn.exec(
    "SELECT 1 FROM information_schema.columns
     WHERE table_name='tasks' AND column_name='completed_at' AND table_schema='public'"
  ).ntuples > 0

  worker_productivity = if has_timing
    conn.exec(<<~SQL).to_a
      SELECT
        COALESCE(u.name, u.email)                              AS worker,
        COUNT(t.id)::int                                       AS tasks_assigned,
        COUNT(t.id) FILTER (WHERE t.status='completed')::int   AS tasks_completed,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (t.completed_at - t.started_at))/60.0
        ) FILTER (WHERE t.status='completed' AND t.started_at IS NOT NULL))::int
                                                               AS avg_minutes_per_task
      FROM users u
      LEFT JOIN tasks t ON t.worker_id = u.id
                        AND t.created_at >= NOW() - INTERVAL '7 days'
      WHERE u.role = 'worker'
      GROUP BY u.id, u.name, u.email
      ORDER BY tasks_completed DESC
    SQL
  else
    []
  end

  # ── 6. Recent events (last 20) ───────────────────────────────────────────
  recent_events = conn.exec(<<~SQL).to_a
    SELECT event_type, pallet_id, description,
           TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS time
    FROM warehouse_events
    ORDER BY created_at DESC
    LIMIT 20
  SQL

  {
    throughput:          throughput,
    inventory_by_status: inventory,
    trucks:              truck_stats,
    dwell_time:          dwell,
    worker_productivity: worker_productivity,
    recent_events:       recent_events
  }.to_json
end
