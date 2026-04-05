require 'thread'
require 'json'

# Thread-safe Server-Sent Events broadcaster.
# Each SSE client registers a Sinatra stream here.
# Any controller can call Broadcaster.broadcast to push an event to all live clients.
module Broadcaster
  SUBSCRIBERS = []
  MUTEX       = Mutex.new

  def self.subscribe(stream)
    MUTEX.synchronize { SUBSCRIBERS << stream }
  end

  def self.unsubscribe(stream)
    MUTEX.synchronize { SUBSCRIBERS.delete(stream) }
  end

  # Push a named SSE event to all connected clients.
  # Silently removes dead/closed streams.
  def self.broadcast(event_type, payload = {})
    dead = []
    MUTEX.synchronize do
      SUBSCRIBERS.each do |out|
        begin
          out << "event: #{event_type}\ndata: #{payload.to_json}\n\n"
        rescue
          dead << out
        end
      end
      dead.each { |d| SUBSCRIBERS.delete(d) }
    end
  end

  def self.subscriber_count
    MUTEX.synchronize { SUBSCRIBERS.reject(&:closed?).size }
  end
end

# ── Heartbeat thread ────────────────────────────────────────────────────────
# Sends a ping every 25 seconds so browsers don't close idle SSE connections.
Thread.new do
  loop do
    sleep 25
    Broadcaster.broadcast('ping', { ts: Time.now.to_i })
  end
end
