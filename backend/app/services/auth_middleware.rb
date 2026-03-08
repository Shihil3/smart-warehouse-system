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
