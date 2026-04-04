import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function Avatar({ name }) {
  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const colors   = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2"];
  const color    = colors[name?.charCodeAt(0) % colors.length] || "#64748b";
  return (
    <div style={{
      width: "36px", height: "36px", borderRadius: "50%",
      background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: "13px", flexShrink: 0,
    }}>{initials}</div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div className="progress-bar-bg" style={{ flex: 1, height: "6px" }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color, height: "6px" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 700, color, minWidth: "24px", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function WorkerProductivity() {
  const [workers, setWorkers]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axios.get(`${API}/workers`)
      .then(res => setWorkers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewTasks = (worker) => {
    setSelected(worker);
    axios.get(`${API}/workers/${worker.id}/tasks`)
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]));
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading worker data…</p>;

  const maxCompleted = Math.max(...workers.map(w => parseInt(w.completed_tasks) || 0), 1);

  return (
    <div>
      {/* Worker cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "14px",
        marginBottom: selected ? "24px" : 0,
      }}>
        {workers.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", gridColumn: "1/-1" }}>
            No workers found.
          </p>
        ) : workers.map(w => {
          const completed  = parseInt(w.completed_tasks)  || 0;
          const active     = parseInt(w.active_tasks)     || 0;
          const total      = parseInt(w.total_tasks)      || 0;
          const avgMin     = parseInt(w.avg_minutes_per_task);
          const isSelected = selected?.id === w.id;

          return (
            <div key={w.id} style={{
              background:   "var(--bg-card)",
              border:       `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "10px",
              padding:      "16px",
              cursor:       "pointer",
              boxShadow:    isSelected ? "0 0 0 2px rgba(37,99,235,.2)" : "none",
              transition:   "border-color .15s, box-shadow .15s",
            }} onClick={() => viewTasks(w)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <Avatar name={w.name} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{w.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{w.email}</div>
                </div>
                {active > 0 && (
                  <span className="badge badge-yellow" style={{ marginLeft: "auto" }}>
                    {active} active
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>
                    Tasks Completed
                  </div>
                  <MiniBar value={completed} max={maxCompleted} color="#16a34a" />
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Total</div>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{total}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Avg Time</div>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>
                      {isNaN(avgMin) ? "—" : `${avgMin}m`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Last Active</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {w.last_active ? new Date(w.last_active).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task history for selected worker */}
      {selected && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Task History — {selected.name}</h3>
            <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No tasks recorded yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pallet</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const dur = t.started_at && t.completed_at
                    ? Math.round((new Date(t.completed_at) - new Date(t.started_at)) / 60000)
                    : null;
                  return (
                    <tr key={t.id}>
                      <td style={{ color: "var(--text-muted)" }}>{t.sequence_order ?? "—"}</td>
                      <td style={{ fontWeight: 600 }}>P-{t.pallet_id}</td>
                      <td>{t.source_label || `Loc ${t.source_location_id}`}</td>
                      <td>{t.dest_label   || `Loc ${t.destination_location_id}`}</td>
                      <td><span className={`badge ${t.status === "completed" ? "badge-green" : t.status === "in_progress" ? "badge-yellow" : "badge-gray"}`}>{t.status}</span></td>
                      <td style={{ fontSize: "12px" }}>{t.started_at   ? new Date(t.started_at).toLocaleString()   : "—"}</td>
                      <td style={{ fontSize: "12px" }}>{t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}</td>
                      <td style={{ fontWeight: 600 }}>{dur !== null ? `${dur}m` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkerProductivity;
