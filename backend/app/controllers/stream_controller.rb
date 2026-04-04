require 'sinatra'
require_relative '../services/broadcaster'

# GET /stream
# Server-Sent Events endpoint. Token is passed as ?token= query param because
# the browser's EventSource API cannot send custom headers.
# Each connected client receives live warehouse_event, accident_report,
# accident_update, task_event, and ping messages.
get '/stream' do
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
