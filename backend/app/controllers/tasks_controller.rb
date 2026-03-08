require 'sinatra'
require 'json'
require_relative '../../config/database'

# Get all tasks
get '/tasks' do
  require_worker(request)

  conn = db_connection

  tasks = conn.exec("SELECT * FROM tasks ORDER BY sequence_order ASC")

  tasks.to_a.to_json
end


# Start task
post '/tasks/:id/start' do
  require_worker(request)

  conn = db_connection

  conn.exec_params(
    "UPDATE tasks SET status='in_progress' WHERE id=$1",
    [params[:id]]
  )

  { message: "Task started" }.to_json
end


# Complete task
post '/tasks/:id/complete' do
  require_worker(request)

  conn = db_connection

  result = conn.exec_params(
    "SELECT pallet_id,destination_location_id
     FROM tasks WHERE id=$1",
    [params[:id]]
  )

  if result.ntuples == 0
    halt 404, {error: "Task not found"}.to_json
  end

  task = result[0]

  conn.exec_params(
    "UPDATE tasks SET status='completed' WHERE id=$1",
    [params[:id]]
  )

  conn.exec_params(
    "UPDATE pallets
     SET current_location_id=$1
     WHERE id=$2",
    [task["destination_location_id"], task["pallet_id"]]
  )

  {message: "Task completed and pallet moved"}.to_json
end
