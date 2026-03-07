require 'jwt'
require 'bcrypt'
require_relative '../../config/database'

SECRET_KEY = "warehouse_secret_key"

def authenticate_user(email, password)

  conn = db_connection

  user = conn.exec_params(
    "SELECT * FROM users WHERE email=$1",
    [email]
  )[0]

  return nil unless user

  if BCrypt::Password.new(user["password_hash"]) == password

    payload = {
      user_id: user["id"],
      role: user["role"],
      exp: Time.now.to_i + 86400
    }

    token = JWT.encode(payload, SECRET_KEY, 'HS256')

    {
      token: token,
      role: user["role"]
    }

  else
    nil
  end

end
