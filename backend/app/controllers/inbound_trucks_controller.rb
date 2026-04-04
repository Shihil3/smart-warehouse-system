require 'sinatra'
require 'json'
require_relative '../../config/database'

# POST /inbound-trucks — leadmen and managers can log arriving trucks
post '/inbound-trucks' do
  require_leadman_or_manager(request)
  data = JSON.parse(request.body.read)

  halt 422, { error: "truck_number is required" }.to_json if data["truck_number"].to_s.strip.empty?

  result = db_connection.exec_params(
    "INSERT INTO inbound_trucks (truck_number, arrival_time, status)
     VALUES ($1, NOW(), 'arrived') RETURNING *",
    [data["truck_number"].to_s.strip]
  )

  result[0].to_json
end


# GET /inbound-trucks — anyone authenticated can view
get '/inbound-trucks' do
  trucks = db_connection.exec(
    "SELECT * FROM inbound_trucks ORDER BY arrival_time DESC"
  )
  trucks.to_a.to_json
end
