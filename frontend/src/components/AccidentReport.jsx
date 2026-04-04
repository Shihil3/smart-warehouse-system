import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const SEVERITIES = [
  { value: "low",      label: "Low",      color: "#16a34a" },
  { value: "medium",   label: "Medium",   color: "#d97706" },
  { value: "high",     label: "High",     color: "#dc2626" },
  { value: "critical", label: "Critical", color: "#7c3aed" },
];

/* ── Small helpers ──────────────────────────────────────────────────────── */
function SeverityBadge({ severity }) {
  const s = SEVERITIES.find(x => x.value === severity) || SEVERITIES[0];
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: "99px",
      fontSize: "11px", fontWeight: 700,
      background: s.color + "22", color: s.color,
    }}>{s.label}</span>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    open:          { color: "#dc2626", label: "Open" },
    investigating: { color: "#d97706", label: "Investigating" },
    resolved:      { color: "#16a34a", label: "Resolved" },
  };
  const m = MAP[status] || MAP.open;
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: "99px",
      fontSize: "11px", fontWeight: 700,
      background: m.color + "22", color: m.color,
    }}>{m.label}</span>
  );
}

/* ── Worker: submit a new report ─────────────────────────────────────────── */
function ReportForm({ onSubmitted }) {
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [severity,   setSeverity]   = useState("low");
  const [injuries,   setInjuries]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await axios.post(`${API}/accident-reports`, {
        title, description: desc, severity, injuries,
      });
      setSuccess(true);
      setTitle(""); setDesc(""); setSeverity("low"); setInjuries(false);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "560px" }}>
      <h3 style={{ marginBottom: "4px" }}>Report an Accident or Hazard</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
        All reports are sent directly to the warehouse manager.
      </p>

      {success && (
        <div className="msg-success" style={{ marginBottom: "16px" }}>
          Report submitted. The manager has been notified in real-time.
        </div>
      )}
      {error && <div className="msg-error" style={{ marginBottom: "16px" }}>{error}</div>}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Forklift near-miss in Rack Zone B" required />
        </div>

        <div className="form-group">
          <label className="form-label">Severity</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {SEVERITIES.map(s => (
              <button
                key={s.value} type="button"
                onClick={() => setSeverity(s.value)}
                style={{
                  padding: "6px 14px", borderRadius: "6px",
                  border: `2px solid ${severity === s.value ? s.color : "var(--border)"}`,
                  background: severity === s.value ? s.color + "18" : "transparent",
                  color: severity === s.value ? s.color : "var(--text-muted)",
                  fontWeight: 700, fontSize: "12px", cursor: "pointer",
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full Description *</label>
          <textarea className="input" rows={4} value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What happened? Where exactly? Any immediate actions taken?"
            style={{ resize: "vertical" }} required />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
          <input type="checkbox" checked={injuries} onChange={e => setInjuries(e.target.checked)} />
          <span style={{ fontWeight: 600, color: injuries ? "#dc2626" : "var(--text)" }}>
            Injuries were involved
          </span>
        </label>

        <button className="btn btn-danger" type="submit" disabled={submitting}
          style={{ alignSelf: "flex-start" }}>
          {submitting ? "Submitting…" : "Submit Incident Report"}
        </button>
      </form>
    </div>
  );
}

/* ── Manager: list all reports + change status ───────────────────────────── */
function ReportList({ refreshRef }) {
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [resolving, setResolving] = useState(null);  // report id being resolved
  const [notes,     setNotes]     = useState("");
  const [filter,    setFilter]    = useState("open");

  const load = () => {
    setLoading(true);
    axios.get(`${API}/accident-reports`)
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (refreshRef) refreshRef.current = load;
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.post(`${API}/accident-reports/${id}/status`, {
        status: newStatus,
        resolution_notes: notes,
      });
      setResolving(null);
      setNotes("");
      load();
    } catch { /* silent */ }
  };

  const counts = {
    open:          reports.filter(r => r.status === "open").length,
    investigating: reports.filter(r => r.status === "investigating").length,
    resolved:      reports.filter(r => r.status === "resolved").length,
  };

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      {/* Filter chips + counts */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        {[
          ["all",          "All",          reports.length,       "#64748b"],
          ["open",         "Open",         counts.open,          "#dc2626"],
          ["investigating","Investigating", counts.investigating,  "#d97706"],
          ["resolved",     "Resolved",     counts.resolved,      "#16a34a"],
        ].map(([key, label, count, color]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: "5px 14px", borderRadius: "99px",
              border: `2px solid ${filter === key ? color : "var(--border)"}`,
              background: filter === key ? color + "18" : "transparent",
              color: filter === key ? color : "var(--text-muted)",
              fontWeight: 700, fontSize: "12px", cursor: "pointer",
            }}>
            {label} {count > 0 && <strong>{count}</strong>}
          </button>
        ))}

        <button className="btn btn-ghost" style={{ fontSize: "12px", marginLeft: "auto" }} onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading reports…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
          No {filter !== "all" ? filter : ""} reports found.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(r => {
            const borderColor =
              r.severity === "critical" ? "#7c3aed44" :
              r.severity === "high"     ? "#dc262644" : "var(--border)";

            return (
              <div key={r.id} style={{
                border: `1px solid ${borderColor}`,
                borderLeft: r.severity === "critical" ? "4px solid #7c3aed" :
                            r.severity === "high"     ? "4px solid #dc2626" :
                            r.severity === "medium"   ? "4px solid #d97706" : "4px solid #16a34a",
                borderRadius: "10px",
                background: "var(--bg-card)",
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>{r.title}</span>
                      <SeverityBadge severity={r.severity} />
                      <StatusBadge   status={r.status} />
                      {(r.injuries === true || r.injuries === "t") && (
                        <span style={{
                          background: "#fee2e2", color: "#dc2626",
                          borderRadius: "99px", padding: "2px 9px",
                          fontSize: "11px", fontWeight: 700,
                        }}>Injuries</span>
                      )}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                      {r.description}
                    </p>

                    {/* Meta row */}
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Reported by <strong>{r.reporter_name || "Unknown"}</strong>
                      {r.location_name && <> · {r.location_name}</>}
                      {" · "}{new Date(r.created_at).toLocaleString()}
                      {r.resolver_name && <> · Resolved by <strong>{r.resolver_name}</strong></>}
                    </div>

                    {/* Resolution notes */}
                    {r.resolution_notes && (
                      <div style={{
                        marginTop: "8px", background: "#f8fafc",
                        borderRadius: "6px", padding: "8px 12px",
                        fontSize: "12px", color: "var(--text-muted)",
                      }}>
                        <strong>Resolution: </strong>{r.resolution_notes}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {r.status !== "resolved" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                      {r.status === "open" && (
                        <button className="btn btn-ghost" style={{ fontSize: "12px" }}
                          onClick={() => updateStatus(r.id, "investigating")}>
                          Investigate
                        </button>
                      )}
                      <button className="btn btn-success" style={{ fontSize: "12px" }}
                        onClick={() => { setResolving(r.id); setNotes(""); }}>
                        Resolve
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline resolution form */}
                {resolving === r.id && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    <label className="form-label" style={{ marginBottom: "6px" }}>Resolution notes</label>
                    <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="What was done to fix or address this incident?"
                      style={{ resize: "vertical", marginBottom: "8px" }} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-success" style={{ fontSize: "12px" }}
                        onClick={() => updateStatus(r.id, "resolved")}>
                        Confirm Resolve
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: "12px" }}
                        onClick={() => setResolving(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main component — role-aware ─────────────────────────────────────────── */
function AccidentReport() {
  const role       = localStorage.getItem("role") || "worker";
  const [tab, setTab] = useState(role === "manager" ? "list" : "report");
  const refreshRef = useRef(null);

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid var(--border)" }}>
        {role === "manager" && (
          <button onClick={() => setTab("list")}
            className={`tab-btn ${tab === "list" ? "active" : ""}`}>
            📋 All Reports
          </button>
        )}
        <button onClick={() => setTab("report")}
          className={`tab-btn ${tab === "report" ? "active" : ""}`}>
          ➕ Report Incident
        </button>
      </div>

      {tab === "list"   && <ReportList refreshRef={refreshRef} />}
      {tab === "report" && (
        <ReportForm onSubmitted={() => {
          if (role === "manager" && refreshRef.current) {
            setTab("list");
            refreshRef.current();
          }
        }} />
      )}
    </div>
  );
}

export default AccidentReport;
