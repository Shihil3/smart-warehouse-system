import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function statusBadge(status) {
  const map = {
    scheduled: { cls: "badge-green",  label: "Scheduled"  },
    loading:   { cls: "badge-yellow", label: "Loading"    },
    departed:  { cls: "badge-blue",   label: "Departed"   },
    arrived:   { cls: "badge-green",  label: "Arrived"    },
  };
  const m = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ── Inbound section ─────────────────────────────────────────────────────── */
function InboundSection() {
  const [trucks,  setTrucks]  = useState([]);
  const [number,  setNumber]  = useState("");
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [error,   setError]   = useState(null);

  const load = () =>
    axios.get(`${API}/inbound-trucks`).then(r => setTrucks(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const num = number.trim();
    if (!num) { setError("Truck number is required."); return; }
    setLoading(true); setError(null); setMsg(null);
    try {
      await axios.post(`${API}/inbound-trucks`, { truck_number: num });
      setMsg(`Inbound truck "${num}" logged successfully.`);
      setNumber("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to log truck.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "4px" }}>Log Arriving Truck</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
          Record an inbound truck as it arrives at the dock.
        </p>

        <form onSubmit={submit} style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: "1 1 200px" }}>
            <label className="form-label">Truck Number *</label>
            <input
              className="input"
              value={number}
              onChange={e => { setNumber(e.target.value); setError(null); setMsg(null); }}
              placeholder="e.g. IB-101"
              autoComplete="off"
            />
          </div>
          <button className="btn btn-success" type="submit" disabled={loading}>
            {loading ? "Logging…" : "+ Log Arrival"}
          </button>
        </form>

        {error && <div className="msg-error"  style={{ marginTop: "10px" }}>{error}</div>}
        {msg   && <div className="msg-success" style={{ marginTop: "10px" }}>{msg}</div>}
      </div>

      {/* List */}
      <h3 style={{ marginBottom: "10px", fontSize: "14px" }}>Recent Inbound Trucks</h3>
      {trucks.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No inbound trucks yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Truck #</th>
              <th>Arrived At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trucks.slice(0, 15).map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.truck_number}</td>
                <td style={{ fontSize: "12px" }}>
                  {t.arrival_time ? new Date(t.arrival_time).toLocaleString() : "—"}
                </td>
                <td>{statusBadge(t.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Outbound section ────────────────────────────────────────────────────── */
function OutboundSection() {
  const [trucks,  setTrucks]  = useState([]);
  const [dests,   setDests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [error,   setError]   = useState(null);
  const [form, setForm] = useState({
    truck_number: "", destination_id: "",
    departure_deadline: "", max_weight: "", max_pallet_count: "",
  });

  const load = () =>
    axios.get(`${API}/outbound-trucks`).then(r => setTrucks(r.data)).catch(() => {});

  useEffect(() => {
    load();
    axios.get(`${API}/destinations`).then(r => setDests(r.data)).catch(() => {});
  }, []);

  const change = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError(null); setMsg(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const { truck_number, destination_id, departure_deadline, max_weight, max_pallet_count } = form;
    if (!truck_number.trim())                       { setError("Truck number is required.");    return; }
    if (!destination_id)                            { setError("Destination is required.");     return; }
    if (!departure_deadline)                        { setError("Departure deadline is required."); return; }
    if (!max_weight || Number(max_weight) <= 0)     { setError("Max weight must be positive."); return; }
    if (!max_pallet_count || Number(max_pallet_count) <= 0) { setError("Max pallets must be positive."); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/outbound-trucks`, {
        truck_number:     truck_number.trim(),
        destination_id:   Number(destination_id),
        departure_deadline,
        max_weight:       Number(max_weight),
        max_pallet_count: Number(max_pallet_count),
      });
      setMsg(`Truck "${truck_number.trim()}" scheduled successfully.`);
      setForm({ truck_number: "", destination_id: "", departure_deadline: "", max_weight: "", max_pallet_count: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to schedule truck.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "4px" }}>Schedule Outbound Truck</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
          Schedule a truck for departure. The manager will confirm departure.
        </p>

        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            <div className="form-group">
              <label className="form-label">Truck Number *</label>
              <input className="input" name="truck_number" value={form.truck_number}
                onChange={change} placeholder="e.g. OB-201" autoComplete="off" />
            </div>

            <div className="form-group">
              <label className="form-label">Destination *</label>
              <select className="select" name="destination_id" value={form.destination_id} onChange={change}>
                <option value="">— Select —</option>
                {dests.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.region})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Departure Deadline *</label>
              <input className="input" type="datetime-local" name="departure_deadline"
                value={form.departure_deadline} onChange={change} />
            </div>

            <div className="form-group">
              <label className="form-label">Max Weight (kg) *</label>
              <input className="input" type="number" name="max_weight"
                value={form.max_weight} onChange={change} placeholder="5000" min="1" />
            </div>

            <div className="form-group">
              <label className="form-label">Max Pallets *</label>
              <input className="input" type="number" name="max_pallet_count"
                value={form.max_pallet_count} onChange={change} placeholder="20" min="1" />
            </div>
          </div>

          {error && <div className="msg-error"  style={{ marginBottom: "10px" }}>{error}</div>}
          {msg   && <div className="msg-success" style={{ marginBottom: "10px" }}>{msg}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Scheduling…" : "+ Schedule Truck"}
          </button>
        </form>
      </div>

      {/* List */}
      <h3 style={{ marginBottom: "10px", fontSize: "14px" }}>Scheduled Outbound Trucks</h3>
      {trucks.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No outbound trucks yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Truck #</th>
              <th>Destination</th>
              <th>Deadline</th>
              <th>Load</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trucks.slice(0, 15).map(t => {
              const pPct = Math.min(100, Math.round(((t.current_pallet_count ?? 0) / (t.max_pallet_count ?? 1)) * 100));
              const isOverdue = t.departure_deadline && new Date(t.departure_deadline) < new Date() && t.status !== "departed";
              return (
                <tr key={t.id} style={{ background: isOverdue ? "#fffbeb" : undefined }}>
                  <td style={{ fontWeight: 600 }}>{t.truck_number}</td>
                  <td>{t.destination_name || "—"}</td>
                  <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                    <span style={{ color: isOverdue ? "#dc2626" : "inherit", fontWeight: isOverdue ? 700 : 400 }}>
                      {t.departure_deadline ? new Date(t.departure_deadline).toLocaleString() : "—"}
                      {isOverdue && " ⚠"}
                    </span>
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>
                      {t.current_pallet_count ?? 0} / {t.max_pallet_count} pallets
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{
                        width: `${pPct}%`,
                        background: pPct >= 90 ? "#dc2626" : pPct >= 60 ? "#d97706" : "#2563eb",
                      }} />
                    </div>
                  </td>
                  <td>{statusBadge(t.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
function LeadmanTrucks() {
  const [tab, setTab] = useState("outbound");

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <div className="msg-info" style={{ fontSize: "13px" }}>
          You can schedule inbound and outbound trucks. Departure confirmation is reserved for the manager.
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "outbound" ? "active" : ""}`} onClick={() => setTab("outbound")}>
          📦 Outbound Trucks
        </button>
        <button className={`tab-btn ${tab === "inbound" ? "active" : ""}`} onClick={() => setTab("inbound")}>
          🚚 Inbound Trucks
        </button>
      </div>

      {tab === "outbound" && <OutboundSection />}
      {tab === "inbound"  && <InboundSection  />}
    </div>
  );
}

export default LeadmanTrucks;
