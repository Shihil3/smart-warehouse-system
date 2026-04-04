import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

/* ── Helpers ─────────────────────────────────────────────────────────── */
function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(decimals);
}

/* ── Mini SVG bar chart (throughput by day) ───────────────────────────── */
function ThroughputChart({ data }) {
  if (!data || data.length === 0) return (
    <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No throughput data yet.</p>
  );

  const W = 480, H = 120, PAD = { top: 10, right: 10, bottom: 36, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(8, Math.floor(innerW / data.length) - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* y-axis gridlines */}
      {[0, 0.5, 1].map(f => {
        const y = PAD.top + innerH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {Math.round(maxVal * f)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.count / maxVal) * innerH));
        const x = PAD.left + i * (innerW / data.length) + (innerW / data.length - barW) / 2;
        const y = PAD.top + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="3" fill="var(--accent)" opacity=".85" />
            <text x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#64748b">
              {d.day ? d.day.slice(5) : ""}
            </text>
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--accent)">
              {d.count}
            </text>
          </g>
        );
      })}
      {/* x-axis label */}
      <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#94a3b8">Last 7 days</text>
    </svg>
  );
}

/* ── Donut chart ─────────────────────────────────────────────────────── */
function Donut({ slices, size = 100 }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No data</p>;

  const R = 36, CX = size / 2, CY = size / 2, STROKE = 14;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {slices.map((s, i) => {
          const dash = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none"
              stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px` }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text)">{total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: s.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
            <span style={{ fontWeight: 700, marginLeft: "auto", paddingLeft: "8px" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Worker productivity bars ─────────────────────────────────────────── */
function WorkerBars({ workers }) {
  if (!workers || workers.length === 0)
    return <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No worker data.</p>;

  const maxTasks = Math.max(...workers.map(w => parseInt(w.completed_tasks) || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {workers.map(w => {
        const n = parseInt(w.completed_tasks) || 0;
        const pct = Math.round((n / maxTasks) * 100);
        return (
          <div key={w.id}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
              <span style={{ fontWeight: 600 }}>{w.name || w.email}</span>
              <span style={{ color: "var(--text-muted)" }}>{n} tasks</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{
                width: `${pct}%`,
                background: pct > 60 ? "var(--success)" : pct > 30 ? "var(--accent)" : "#d97706",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Recent Events feed ───────────────────────────────────────────────── */
function EventFeed({ events }) {
  if (!events || events.length === 0)
    return <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No recent events.</p>;

  const typeColor = {
    TASK_COMPLETED:   "#16a34a",
    TRUCK_DEPARTED:   "#2563eb",
    PALLET_CREATED:   "#7c3aed",
    PALLET_STORED:    "#0891b2",
    PALLET_RETRIEVED: "#d97706",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {events.map((ev, i) => (
        <div key={ev.id ?? i} style={{
          display: "flex", gap: "10px", alignItems: "flex-start",
          padding: "8px 0",
          borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, marginTop: "5px",
            background: typeColor[ev.event_type] || "#94a3b8",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: typeColor[ev.event_type] || "var(--text)" }}>
              {ev.event_type?.replace(/_/g, " ")}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {ev.notes || "—"}
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
            {ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── KPI stat card ───────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "16px 20px",
    }}>
      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-muted)", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: color || "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

/* ── Main KpiDashboard ───────────────────────────────────────────────── */
function KpiDashboard() {
  const [kpis, setKpis]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/kpis`)
      .then(res => { setKpis(res.data); setError(null); })
      .catch(() => setError("Could not load KPI data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading KPIs…</p>;
  if (error)   return (
    <div>
      <div className="msg-error" style={{ marginBottom: "12px" }}>{error}</div>
      <button className="btn btn-ghost" onClick={load}>Retry</button>
    </div>
  );
  if (!kpis)   return null;

  const inv = kpis.inventory_by_status || {};
  const trucks = kpis.trucks || {};
  const dwellHr = kpis.avg_dwell_hours != null ? `${fmt(kpis.avg_dwell_hours, 1)} hrs` : "—";

  const invSlices = [
    { label: "Stored",    value: inv.stored    || 0, color: "#16a34a" },
    { label: "Pending",   value: inv.pending_storage || 0, color: "#d97706" },
    { label: "Assigned",  value: inv.assigned  || 0, color: "#2563eb" },
    { label: "Created",   value: inv.created   || 0, color: "#94a3b8" },
    { label: "Delivered", value: inv.delivered || 0, color: "#7c3aed" },
  ].filter(s => s.value > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ marginBottom: "4px" }}>KPI Dashboard</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Live warehouse performance metrics — last 7 days</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={load}>↻ Refresh</button>
      </div>

      {/* Top KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "28px" }}>
        <KpiCard label="Tasks Completed" value={kpis.total_tasks_completed ?? "—"} color="var(--success)" sub="last 7 days" />
        <KpiCard label="Tasks In Progress" value={kpis.tasks_in_progress ?? "—"} color="#d97706" />
        <KpiCard label="Tasks Pending" value={kpis.tasks_pending ?? "—"} color="var(--text-muted)" />
        <KpiCard label="Avg Dwell Time" value={dwellHr} color="var(--accent)" sub="time in warehouse" />
        <KpiCard label="Trucks Scheduled" value={trucks.scheduled ?? "—"} color="var(--accent)" />
        <KpiCard label="Trucks Departed" value={trucks.departed ?? "—"} color="#7c3aed" sub="all time" />
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Throughput */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Daily Throughput (Tasks Completed)</h3>
          <ThroughputChart data={kpis.throughput_by_day} />
        </div>

        {/* Inventory breakdown */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Inventory by Status</h3>
          <Donut slices={invSlices} size={110} />
        </div>

        {/* Worker productivity */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Worker Task Completion</h3>
          <WorkerBars workers={kpis.worker_productivity} />
        </div>

        {/* Truck stats */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Truck Status Overview</h3>
          {Object.keys(trucks).length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No truck data.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(trucks).map(([status, count]) => (
                <div key={status}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{status}</span>
                    <span style={{ color: "var(--text-muted)" }}>{count}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{
                      width: `${Math.round((count / Math.max(...Object.values(trucks))) * 100)}%`,
                      background: status === "departed" ? "#7c3aed" : status === "scheduled" ? "var(--success)" : "var(--accent)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "14px", fontSize: "14px" }}>Recent Activity</h3>
        <EventFeed events={kpis.recent_events} />
      </div>
    </div>
  );
}

export default KpiDashboard;
