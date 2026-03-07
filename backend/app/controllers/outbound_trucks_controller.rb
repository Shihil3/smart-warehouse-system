require 'sinatra'
require 'json'
require_relative '../../config/database'
require_relative '../repositories/truck_repository'

# Create Outbound Truck
post '/outbound-trucks' do

  require_manager(request)

  data = JSON.parse(request.body.read)

  truck = TruckRepository.create(data)

  detect_dock_congestion

  truck.to_json

end


# List Outbound Trucks
get '/outbound-trucks' do

  conn = db_connection

  trucks = conn.exec("SELECT * FROM outbound_trucks")

  trucks.to_a.to_json
end
