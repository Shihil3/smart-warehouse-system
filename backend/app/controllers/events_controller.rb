require 'json'

get '/events' do

  events = db_connection.exec(
    "SELECT * FROM warehouse_events
     ORDER BY created_at DESC
     LIMIT 50"
  )

  events.to_a.to_json

end
