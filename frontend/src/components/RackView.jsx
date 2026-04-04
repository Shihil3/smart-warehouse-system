import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function fillColor(pct) {
  if (pct >= 100) return { bar: "#dc2626", bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" };
  if (pct >= 75)  return { bar: "#d97706", bg: "#fef3c7", border: "#fde68a", text: "#92400e" };
  if (pct >= 40)  return { bar: "#2563eb", bg: "#dbeafe", border: "#bfdbfe", text: "#1e40af" };
  return            { bar: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" };
}

function fillLabel(pct) {
  if (pct >= 100) return { label: "FULL",      cls: "badge-red"    };
  if (pct >= 75)  return { label: "NEARLY FULL",cls: "badge-yellow" };
  if (pct >= 40)  return { label: "HALF",       cls: "badge-blue"   };
  return            { label: "AVAILABLE",   cls: "badge-green"  };
}

function RackCard({ rack }) {
  const [expanded, setExpanded] = useState(false);
  const occ  = parseInt(rack.current_occupancy) || 0;
  const cap  = parseInt(rack.max_capacity)       || 10;
  const pct  = Math.min(100, Math.round((occ / cap) * 100));
  const col  = fillColor(pct);
  const lbl  = fillLabel(pct);
  const name = rack.rack_id || rack.label || `Rack ${rack.id}`;

  // pallets may come as a JSON string from the backend
  let pallets = [];
  try {
    pallets = typeof rack.pallets === "string" ? JSON.parse(rack.pallets) : (rack.pallets || []);
  } catch (_) {}

  return (
    <div style={{
      border:        `1px solid ${col.border}`,
      borderRadius:  "10px",
      background:    col.bg,
      padding:       "14px 16px",
      display:       "flex",
      flexDirection: "column",
      gap:           "10px",
      cursor:        pallets.length > 0 ? "pointer" : "default",
    }} onClick={() => pallets.length > 0 && setExpanded(e => !e)}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: col.text }}>{name}</div>
          {rack.label && rack.rack_id && rack.label !== rack.rack_id && (
            <div style={{ fontSize: "11px", color: col.text, opacity: .7 }}>{rack.label}</div>
          )}
        </div>
        <span className={`badge ${lbl.cls}`}>{lbl.label}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: col.bar }} />
        </div>
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          marginTop:      "4px",
          fontSize:       "11px",
          color:          col.text,
          fontWeight:     600,
        }}>
          <span>{occ} / {cap} pallets</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Pallet list (expandable) */}
      {expanded && pallets.length > 0 && (
        <div style={{
          borderTop:  `1px solid ${col.border}`,
          paddingTop: "10px",
          display:    "flex",
          flexWrap:   "wrap",
          gap:        "6px",
        }}>
          {pallets.map(p => (
            <span key={p.id} style={{
              background:   "rgba(0,0,0,.06)",
              padding:      "2px 8px",
              borderRadius: "99px",
              fontSize:     "11px",
              fontWeight:   600,
              color:        col.text,
            }}>
              P-{p.id} · P{p.priority}
            </span>
          ))}
        </div>
      )}

      {pallets.length > 0 && (
        <div style={{ fontSize: "11px", color: col.text, opacity: .6, textAlign: "right" }}>
          {expanded ? "▲ hide pallets" : "▼ show pallets"}
        </div>
      )}
    </div>
  );
}

function RackView() {
  const [racks, setRacks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchRacks = () => {
    axios.get(`${API}/racks`)
      .then(res => { setRacks(res.data); setError(null); })
      .catch(err => {
        const status = err.response?.status;
        if (status === 500) {
          setError("Backend error loading racks. The database migration may not have been applied.");
        } else if (!err.response) {
          setError("Cannot reach backend — is the server running on port 4567?");
        } else {
          setError(`Failed to load rack data (${status}).`);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRacks();
    const interval = setInterval(fetchRacks, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading racks…</p>;

  if (error) return (
    <div style={{ maxWidth: "520px" }}>
      <div className="msg-error" style={{ marginBottom: "12px" }}>{error}</div>
      <div style={{
        background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "8px",
        padding: "14px 16px", fontSize: "13px", color: "var(--text-muted)",
      }}>
        <strong style={{ color: "var(--text)" }}>To fix:</strong>
        <ol style={{ margin: "8px 0 0", paddingLeft: "18px", lineHeight: 1.9 }}>
          <li>Open a terminal in the <code>backend/</code> folder</li>
          <li>Run: <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: "3px" }}>
            ruby scripts/migrate.rb up
          </code></li>
          <li>Restart the backend server</li>
          <li>
            <button className="btn btn-primary" style={{ fontSize: "12px", padding: "5px 12px", marginTop: "4px" }}
              onClick={fetchRacks}>
              Retry
            </button>
          </li>
        </ol>
      </div>
    </div>
  );

  const total  = racks.length;
  const totalCap  = racks.reduce((s, r) => s + (parseInt(r.max_capacity) || 10), 0);
  const totalOcc  = racks.reduce((s, r) => s + (parseInt(r.current_occupancy) || 0), 0);
  const fullCount = racks.filter(r => parseInt(r.current_occupancy) >= parseInt(r.max_capacity)).length;
  const availCount = racks.filter(r => parseInt(r.current_occupancy) < parseInt(r.max_capacity)).length;

  return (
    <div>
      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Racks</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Capacity</span>
          <span className="stat-value">{totalCap}</span>
          <span className="stat-sub">pallets</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Currently Stored</span>
          <span className="stat-value">{totalOcc}</span>
          <span className="stat-sub">pallets in use</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>{availCount}</span>
          <span className="stat-sub">racks with space</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Full Racks</span>
          <span className="stat-value" style={{ color: fullCount > 0 ? "var(--danger)" : "var(--text)" }}>
            {fullCount}
          </span>
        </div>
      </div>

      {/* Rack grid */}
      {racks.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          border: "2px dashed var(--border)", borderRadius: "10px",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗄️</div>
          <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: "6px" }}>No rack locations found</p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
            Make sure your <code>locations</code> table has rows with <code>location_type = 'rack'</code>,
            and that migration 012 has been applied.
          </p>
          <code style={{
            display: "inline-block", background: "#1e293b", color: "#e2e8f0",
            padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
          }}>
            ruby scripts/migrate.rb up
          </code>
        </div>
      ) : (
        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap:                 "14px",
        }}>
          {racks.map(r => <RackCard key={r.id} rack={r} />)}
        </div>
      )}

      <p style={{ marginTop: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
        Auto-refreshes every 8s · Click a rack card to see its pallets
      </p>
    </div>
  );
}

export default RackView;
