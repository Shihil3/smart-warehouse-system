require 'sinatra'
require_relative '../services/broadcaster'

# GET /stream
# Server-Sent Events endpoint. Token is passed as ?token= query param because
# the browser's EventSource API cannot send custom headers.
# Each connected client receives live warehouse_event, accident_report,
# accident_update, task_event, and ping messages.
get '/stream' do
  # Validate token from query param (EventSource API cannot send headers)
  unless DEV_MODE
    token = params[:token]
    halt 401, 'data: {"error":"Unauthorized"}\n\n' unless token
    begin
      decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })
      halt 401, 'data: {"error":"Unauthorized"}\n\n' unless decoded[0]
    rescue
      halt 401, 'data: {"error":"Unauthorized"}\n\n'
    end
  end

  content_type 'text/event-stream'
  headers(
    'Cache-Control'     => 'no-cache',
    'X-Accel-Buffering' => 'no',
    'Connection'        => 'keep-alive',
  )

  stream(:keep_open) do |out|
    Broadcaster.subscribe(out)

    # Greet the new subscriber
    out << "event: connected\ndata: #{({ subscribers: Broadcaster.subscriber_count }).to_json}\n\n"

    out.callback { Broadcaster.unsubscribe(out) }
    out.errback  { Broadcaster.unsubscribe(out) }
  end
end
