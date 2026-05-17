require 'sinatra'
require 'json'
require 'sinatra/cross_origin'

configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin']  = '*'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
  response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  content_type :json unless request.path_info == '/stream'
end

# Global error handler — prevents unhandled exceptions from crashing the server
error 500 do
  env['sinatra.error']&.tap { |e| puts "UNHANDLED 500: #{e.class}: #{e.message}" }
  content_type :json
  { error: "Internal server error. The operation failed safely.", detail: env['sinatra.error']&.message }.to_json
end

error 400..499 do
  # Ensure 4xx errors always return JSON even if raised outside a JSON context
  content_type :json
  { error: "Request error (#{response.status})" }.to_json unless response.body&.first&.include?('"error"')
end

options "*" do
  response.headers['Access-Control-Allow-Origin']  = '*'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
  response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  halt 200
end

require_relative './app/controllers/products_controller'
require_relative './app/controllers/destinations_controller'
require_relative './config/database'
require_relative './app/services/optimizer_service'
require_relative './app/controllers/pallets_controller'
require_relative './app/controllers/outbound_trucks_controller'
require_relative './app/services/task_generator'
require_relative './app/services/optimization_trigger'
require_relative './app/controllers/tasks_controller'
require_relative './app/controllers/layout_controller'
require_relative './app/services/congestion_detector'
require_relative './app/controllers/alerts_controller'
require_relative './app/controllers/auth_controller'
require_relative './app/services/auth_middleware'
require_relative './app/controllers/inbound_trucks_controller'
require_relative './app/services/event_logger'
require_relative './app/controllers/events_controller'
require_relative './app/controllers/racks_controller'
require_relative './app/services/rack_assignment_service'
require_relative './app/controllers/inventory_controller'
require_relative './app/controllers/workers_controller'
require_relative './app/controllers/kpis_controller'
require_relative './app/services/broadcaster'
require_relative './app/controllers/stream_controller'
require_relative './app/controllers/accident_reports_controller'

get '/test-optimizer' do

  payload = {
    pallets: [
      { id: 1, priority: 1 },
      { id: 2, priority: 3 },
      { id: 3, priority: 2 }
    ],
    trucks: []
  }

  result = run_optimizer(payload)

  result.to_json

end
