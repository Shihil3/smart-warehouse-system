require 'pg'
require_relative '../config/database'

def setup_migrations_table(conn)
  conn.exec(<<~SQL)
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  SQL
end

def applied_migrations(conn)
  conn.exec("SELECT version FROM schema_migrations ORDER BY version ASC")
     .map { |row| row["version"] }
end

def migrate_up(conn)
  migrations_dir = File.expand_path("../db/migrate", __dir__)
  files = Dir.glob("#{migrations_dir}/*.up.sql").sort

  if files.empty?
    puts "No .up.sql migration files found in #{migrations_dir}"
    return
  end

  applied = applied_migrations(conn).to_set
  pending = files.reject { |f| applied.include?(File.basename(f, ".up.sql")) }

  if pending.empty?
    puts "No pending migrations. Database is up to date."
    return
  end

  pending.each do |file|
    version = File.basename(file, ".up.sql")
    puts "Applying [up]: #{version} ..."
    conn.exec(File.read(file))
    conn.exec_params("INSERT INTO schema_migrations (version) VALUES ($1)", [version])
    puts "  Done."
  end

  puts "\nAll migrations applied successfully."
end

def migrate_down(conn)
  migrations_dir = File.expand_path("../db/migrate", __dir__)
  applied = applied_migrations(conn)

  if applied.empty?
    puts "No migrations to roll back."
    return
  end

  version = applied.last
  down_file = "#{migrations_dir}/#{version}.down.sql"

  unless File.exist?(down_file)
    puts "Down file not found: #{down_file}"
    exit 1
  end

  puts "Rolling back [down]: #{version} ..."
  conn.exec(File.read(down_file))
  conn.exec_params("DELETE FROM schema_migrations WHERE version = $1", [version])
  puts "  Done."
end

# ---

direction = ARGV[0] || "up"
conn = db_connection
setup_migrations_table(conn)

case direction
when "up"
  migrate_up(conn)
when "down"
  migrate_down(conn)
else
  puts "Unknown direction: #{direction}. Use 'up' or 'down'."
  exit 1
end

conn.close
