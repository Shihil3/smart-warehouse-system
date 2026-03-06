require 'sinatra'
require 'json'
require_relative '../../config/database'

# Get all tasks
get '/tasks' do
  conn = db_connection

  tasks = conn.exec("SELECT * FROM tasks ORDER BY sequence_order ASC")

  tasks.to_a.to_json
end


# Start task
post '/tasks/:id/start' do
  conn = db_connection

  conn.exec_params(
    "UPDATE tasks SET status='in_progress' WHERE id=$1",
    [params[:id]]
  )

  { message: "Task started" }.to_json
end


# Complete task
post '/tasks/:id/complete' do
  conn = db_connection

  task = conn.exec_params(
    "SELECT pallet_id FROM tasks WHERE id=$1",
    [params[:id]]
  )[0]

  conn.exec_params(
    "UPDATE tasks SET status='completed' WHERE id=$1",
    [params[:id]]
  )

  conn.exec_params(
    "UPDATE pallets SET status='loaded' WHERE id=$1",
    [task["pallet_id"]]
  )

  { message: "Task completed" }.to_json
end
