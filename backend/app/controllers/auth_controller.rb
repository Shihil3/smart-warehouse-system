require 'sinatra'
require 'json'
require_relative '../services/auth_service'

post '/login' do

  data = JSON.parse(request.body.read)

  result = authenticate_user(data["email"], data["password"])

  if result
    result.to_json
  else
    status 401
    { error: "Invalid credentials" }.to_json
  end

end
