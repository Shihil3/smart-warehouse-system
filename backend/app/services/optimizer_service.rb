require 'httparty'

def run_optimizer(payload)
  response = HTTParty.post(
    "http://localhost:8000/optimize",
    headers: { "Content-Type" => "application/json" },
    body: payload.to_json,
    timeout: 10
  )
  JSON.parse(response.body)
rescue => e
  puts "WARN: Optimizer unavailable — returning empty sequence (#{e.class}: #{e.message})"
  { "sequence" => [] }
end
