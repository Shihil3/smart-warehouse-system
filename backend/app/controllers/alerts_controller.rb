require 'sinatra'
require 'json'
require_relative '../../config/database'

get '/alerts' do
  require_manager(request)

  conn = db_connection

  alerts = conn.exec("SELECT * FROM congestion_alerts ORDER BY created_at DESC")

  alerts.to_a.to_json
end
