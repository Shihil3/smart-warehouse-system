require 'sinatra'
require 'json'
require_relative '../../config/database'

# Create Destination
post '/destinations' do
  require_manager(request)

  data = JSON.parse(request.body.read)

  conn = db_connection

  result = conn.exec_params(
    "INSERT INTO destinations (name, region, address)
     VALUES ($1,$2,$3)
     RETURNING *",
     [
       data["name"],
       data["region"],
       data["address"]
     ]
  )

  result[0].to_json
end


# Get Destinations
get '/destinations' do
  require_manager(request)
  
  conn = db_connection

  destinations = conn.exec("SELECT * FROM destinations")

  destinations.to_a.to_json
end
