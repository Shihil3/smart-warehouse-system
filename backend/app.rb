require 'sinatra'
require 'json'
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
