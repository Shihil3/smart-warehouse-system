require 'sinatra'
require 'json'
require_relative '../services/auth_service'

post '/login' do
  data   = JSON.parse(request.body.read)
  result = authenticate_user(data["email"], data["password"])
  if result
    result.to_json
  else
    status 401
    { error: "Invalid credentials" }.to_json
  end
end

# GET /me — returns the caller's live profile from the DB (picks up role changes without re-login)
get '/me' do
  require_auth(request)
  user = current_user(request)
  halt 401, { error: "Unauthorized" }.to_json unless user

  conn = db_connection
  row  = conn.exec_params(
    "SELECT id, COALESCE(name, email) AS name, email, role, is_leadman
     FROM users WHERE id = $1",
    [user['user_id']]
  )
  halt 404, { error: "User not found" }.to_json if row.ntuples == 0

  row[0].to_json
end
