require 'json'

# Create inbound truck
post '/inbound-trucks' do

  data = JSON.parse(request.body.read)

  result = db_connection.exec_params(
    "INSERT INTO inbound_trucks
    (truck_number, arrival_time, status)
    VALUES ($1, NOW(), 'arrived')
    RETURNING *",
    [data["truck_number"]]
  )

  result[0].to_json

end


# List inbound trucks
get '/inbound-trucks' do

  trucks = db_connection.exec(
    "SELECT * FROM inbound_trucks ORDER BY arrival_time DESC"
  )

  trucks.to_a.to_json

end
