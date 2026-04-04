import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
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

/* ── Add Worker Form ─────────────────────────────────────────────────────── */
function AddWorkerForm({ onAdded }) {
  const [open,       setOpen]       = useState(false);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  const reset = () => { setName(""); setEmail(""); setPassword(""); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await axios.post(`${API}/workers`, { name, email, password });
      reset();
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create worker.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => setOpen(true)}>
        + Add Worker
      </button>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "20px 24px",
      marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>Add New Worker</h3>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }}
          onClick={() => { setOpen(false); reset(); }}>
          Cancel
        </button>
      </div>

      {error && <div className="msg-error" style={{ marginBottom: "14px" }}>{error}</div>}

      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. John Smith" required />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="worker@warehouse.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={{ paddingRight: "40px" }}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "13px", color: "var(--text-muted)",
                }}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create Worker Account"}
        </button>
      </form>
    </div>
  );
}

/* ── Leadman toggle button ───────────────────────────────────────────────── */
function LeadmanToggle({ worker, onToggled }) {
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);
  const isLeadman = worker.is_leadman === true || worker.is_leadman === "t";

  const toggle = async (e) => {
    e.stopPropagation();
    setLoading(true);
    setErr(null);
    try {
      await axios.post(`${API}/workers/${worker.id}/toggle-leadman`, {});
      onToggled();
    } catch (error) {
      const msg = error.response?.data?.error
        || (error.response ? `Server error ${error.response.status}` : error.message);
      setErr(msg || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
      <button
        onClick={toggle}
        disabled={loading}
        title={isLeadman ? "Revoke leadman status" : "Promote to leadman"}
        style={{
          padding: "4px 10px",
          borderRadius: "6px",
          border: `1px solid ${isLeadman ? "#7c3aed66" : "var(--border)"}`,
          background: isLeadman ? "#7c3aed18" : "transparent",
          color: isLeadman ? "#7c3aed" : "var(--text-muted)",
          fontSize: "11px", fontWeight: 700, cursor: loading ? "wait" : "pointer",
          transition: "all .15s",
        }}
      >
        {loading ? "Saving…" : isLeadman ? "★ Leadman" : "☆ Set Leadman"}
      </button>
      {err && <span style={{ fontSize: "10px", color: "var(--danger)" }}>{err}</span>}
    </div>
  );
}

/* ── Delete confirm button ───────────────────────────────────────────────── */
function DeleteButton({ worker, onDeleted }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const doDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/workers/${worker.id}`);
      onDeleted();
    } catch { /* silently fail — might have tasks */ }
    finally { setLoading(false); setConfirm(false); }
  };

  if (confirm) {
    return (
      <div style={{ display: "flex", gap: "6px" }}>
        <button className="btn btn-danger" style={{ fontSize: "11px", padding: "4px 10px" }}
          onClick={doDelete} disabled={loading}>
          {loading ? "…" : "Confirm"}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 10px" }}
          onClick={() => setConfirm(false)}>
          No
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 10px", color: "var(--danger)" }}
      onClick={() => setConfirm(true)}>
      Remove
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
function WorkerProductivity() {
  const [workers,  setWorkers]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  const loadWorkers = () => {
    setLoading(true);
    axios.get(`${API}/workers`)
      .then(res => setWorkers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWorkers(); }, []);

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
      {/* Add Worker form */}
      <AddWorkerForm onAdded={loadWorkers} />

      {/* Worker count summary */}
      <div style={{ marginBottom: "16px", fontSize: "13px", color: "var(--text-muted)" }}>
        {workers.length} worker{workers.length !== 1 ? "s" : ""} registered
      </div>

      {/* Worker cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "14px",
        marginBottom: selected ? "24px" : 0,
      }}>
        {workers.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", gridColumn: "1/-1" }}>
            No workers yet. Add one above.
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.email}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {(w.is_leadman === true || w.is_leadman === "t") && (
                    <span style={{
                      background: "#7c3aed18", color: "#7c3aed",
                      borderRadius: "99px", padding: "2px 8px",
                      fontSize: "10px", fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>Leadman</span>
                  )}
                  {active > 0 && (
                    <span className="badge badge-yellow">{active} active</span>
                  )}
                </div>
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

              {/* Card actions — stop propagation so they don't trigger viewTasks */}
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={e => e.stopPropagation()}>
                <LeadmanToggle worker={w} onToggled={loadWorkers} />
                <DeleteButton worker={w} onDeleted={() => {
                  if (selected?.id === w.id) setSelected(null);
                  loadWorkers();
                }} />
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
                      <td>
                        <span className={`badge ${t.status === "completed" ? "badge-green" : t.status === "in_progress" ? "badge-yellow" : "badge-gray"}`}>
                          {t.status}
                        </span>
                      </td>
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
