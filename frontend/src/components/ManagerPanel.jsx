import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function ManagerPanel() {
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = () => {
    axios.get(`${API}/alerts`).then(res => setAlerts(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Congestion Alerts</h2>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Auto-refreshes every 5s</span>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          textAlign:    "center",
          padding:      "40px 20px",
          color:        "var(--text-muted)",
          border:       "2px dashed var(--border)",
          borderRadius: "10px",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>✅</div>
          No congestion alerts — all docks are clear.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          "12px",
              background:   a.severity === "critical" ? "#fee2e2" : "#fef3c7",
              border:       `1px solid ${a.severity === "critical" ? "#fca5a5" : "#fde68a"}`,
              borderLeft:   `4px solid ${a.severity === "critical" ? "#dc2626" : "#d97706"}`,
              borderRadius: "8px",
              padding:      "12px 16px",
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>
                {a.severity === "critical" ? "🔴" : "⚠️"}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: a.severity === "critical" ? "#991b1b" : "#92400e" }}>
                  {a.severity === "critical" ? "Critical" : "Warning"}
                </div>
                <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "2px" }}>{a.message}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerPanel;
