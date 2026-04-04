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
  # Default all responses to JSON — SSE and any HTML endpoints override this themselves
  content_type :json unless request.path_info == '/stream'
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
