require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../services/broadcaster'

VALID_SEVERITIES = %w[low medium high critical].freeze
VALID_STATUSES   = %w[open investigating resolved].freeze

# GET /accident-reports
# Workers see only their own; managers see all (with resolver info).
get '/accident-reports' do
  require_auth(request)
  conn = db_connection
  user = current_user(request)

  if !DEV_MODE && user && user['role'] == 'worker'
    reports = conn.exec_params(<<~SQL, [user['user_id']]).to_a
      SELECT ar.*,
             COALESCE(u.name, u.email) AS reporter_name,
             COALESCE(l.rack_id, l.label, 'Loc-'||l.id::text) AS location_name
      FROM accident_reports ar
      LEFT JOIN users     u ON u.id = ar.reporter_id
      LEFT JOIN locations l ON l.id = ar.location_id
      WHERE ar.reporter_id = $1
      ORDER BY ar.created_at DESC
    SQL
  else
    reports = conn.exec(<<~SQL).to_a
      SELECT ar.*,
             COALESCE(u.name,  u.email)  AS reporter_name,
             COALESCE(ru.name, ru.email) AS resolver_name,
             COALESCE(l.rack_id, l.label, 'Loc-'||l.id::text) AS location_name
      FROM accident_reports ar
      LEFT JOIN users     u  ON u.id  = ar.reporter_id
      LEFT JOIN users     ru ON ru.id = ar.resolved_by
      LEFT JOIN locations l  ON l.id  = ar.location_id
      ORDER BY
        CASE ar.status
          WHEN 'open'          THEN 0
          WHEN 'investigating' THEN 1
          ELSE 2
        END,
        ar.created_at DESC
    SQL
  end

  reports.to_json
end


# POST /accident-reports
# Any authenticated user can file a report.
post '/accident-reports' do
  require_auth(request)
  body     = JSON.parse(request.body.read)
  title    = body['title'].to_s.strip
  desc     = body['description'].to_s.strip
  severity = VALID_SEVERITIES.include?(body['severity']) ? body['severity'] : 'low'
  loc_id   = body['location_id'].to_i
  injuries = body['injuries'] == true || body['injuries'] == 'true'

  halt 422, { error: 'Title is required' }.to_json     if title.empty?
  halt 422, { error: 'Description is required' }.to_json if desc.empty?

  conn    = db_connection
  user    = current_user(request)
  user_id = user ? user['user_id'].to_i : nil
  loc_val = loc_id > 0 ? loc_id : nil

  row = conn.exec_params(<<~SQL, [user_id, loc_val, severity, title, desc, injuries])[0]
    INSERT INTO accident_reports
      (reporter_id, location_id, severity, title, description, injuries)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, severity, title, status, injuries,
              TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
  SQL

  # Live-push to all SSE clients
  Broadcaster.broadcast('accident_report', {
    id:         row['id'].to_i,
    title:      row['title'],
    severity:   row['severity'],
    status:     row['status'],
    injuries:   row['injuries'] == 't',
    created_at: row['created_at'],
  })

  # Also persist as a warehouse event (shows in KPI feed)
  log_event('ACCIDENT_REPORTED', nil, loc_val, "#{severity.upcase}: #{title}")

  status 201
  row.to_json
end


# POST /accident-reports/:id/status
# Manager only: move a report through open → investigating → resolved.
post '/accident-reports/:id/status' do
  require_manager(request)
  body       = JSON.parse(request.body.read)
  new_status = body['status'].to_s
  halt 422, { error: "Invalid status. Use: #{VALID_STATUSES.join(', ')}" }.to_json \
    unless VALID_STATUSES.include?(new_status)

  conn    = db_connection
  user    = current_user(request)
  user_id = user ? user['user_id'].to_i : nil

  result = if new_status == 'resolved'
    conn.exec_params(<<~SQL, [new_status, user_id, body['resolution_notes'].to_s, params[:id]])
      UPDATE accident_reports
      SET status           = $1,
          resolved_by      = $2,
          resolved_at      = NOW(),
          resolution_notes = $3
      WHERE id = $4
      RETURNING id, title, status
    SQL
  else
    conn.exec_params(
      "UPDATE accident_reports SET status=$1 WHERE id=$2 RETURNING id, title, status",
      [new_status, params[:id]]
    )
  end

  halt 404, { error: 'Report not found' }.to_json if result.ntuples == 0
  row = result[0]

  Broadcaster.broadcast('accident_update', {
    id:     row['id'].to_i,
    title:  row['title'],
    status: row['status'],
  })

  row.to_json
end
