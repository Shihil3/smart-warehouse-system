require_relative '../../config/database'

def detect_dock_congestion

  conn = db_connection

  docks = conn.exec("
    SELECT dock_location_id, COUNT(*) AS truck_count
    FROM outbound_trucks
    WHERE dock_location_id IS NOT NULL
    GROUP BY dock_location_id
  ")

  docks.each do |dock|

    dock_id = dock["dock_location_id"]
    count = dock["truck_count"].to_i

    if count > 2

      conn.exec_params(
        "INSERT INTO congestion_alerts (dock_id, message, severity)
         VALUES ($1,$2,$3)",
        [
          dock_id,
          "Potential dock congestion detected at dock #{dock_id}",
          "warning"
        ]
      )

    end

  end

end