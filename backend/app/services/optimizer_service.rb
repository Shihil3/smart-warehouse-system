require 'httparty'

def run_optimizer(payload)

  response = HTTParty.post(
    "http://localhost:8000/optimize",
    headers: { "Content-Type" => "application/json" },
    body: payload.to_json
  )

  JSON.parse(response.body)

end
