require 'jwt'
DEV_MODE = true

SECRET_KEY = "warehouse_secret_key"

def current_user(request)

  header = request.env["HTTP_AUTHORIZATION"]

  return nil unless header

  token = header.split(" ").last

  begin
    decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })
    decoded[0]
  rescue
    nil
  end

end


def require_manager(request)

  return if DEV_MODE

  user = current_user(request)

  halt 401, {error: "Unauthorized"}.to_json unless user
  halt 403, {error: "Manager only"}.to_json unless user["role"] == "manager"

end


def require_worker(request)
  return if DEV_MODE

  user = current_user(request)

  halt 401, {error: "Unauthorized"}.to_json unless user
  halt 403, {error: "Worker only"}.to_json unless user["role"] == "worker"

end

# Allows any authenticated user (worker or manager)
def require_auth(request)
  return if DEV_MODE

  user = current_user(request)
  halt 401, {error: "Unauthorized"}.to_json unless user
end

# Allows leadmen (is_leadman=true workers) AND managers
def require_leadman_or_manager(request)
  return if DEV_MODE

  user = current_user(request)
  halt 401, {error: "Unauthorized"}.to_json unless user
  is_manager = user["role"] == "manager"
  is_leadman = user["is_leadman"] == true || user["is_leadman"] == "true"
  halt 403, {error: "Leadman or manager access required"}.to_json unless is_manager || is_leadman
end
