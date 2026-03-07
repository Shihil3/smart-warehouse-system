require 'sinatra'
require 'json'
require_relative '../../config/database'

get '/layout' do
  conn = db_connection

  zones = conn.exec("SELECT * FROM zones")
  locations = conn.exec("SELECT * FROM locations")
  pallets = conn.exec("SELECT id,current_location_id FROM pallets")

  {
    zones: zones.to_a,
    locations: locations.to_a,
    pallets: pallets.to_a
  }.to_json
end
