require 'sinatra'
require 'json'
require_relative '../../config/database'

get '/layout' do
  conn = db_connection

  zones = conn.exec("SELECT * FROM zones")
  locations = conn.exec("SELECT * FROM locations")

  {
    zones: zones.to_a,
    locations: locations.to_a
  }.to_json
end
