import { useEffect, useState } from "react";
import axios from "axios";
import { DepartureButton } from "./ShipmentManifest";

const API = "http://localhost:4567";

function statusBadge(status) {
  const map = {
    scheduled: "badge-green",
    loading:   "badge-yellow",
    departed:  "badge-red",
    arrived:   "badge-blue",
  };
  return map[status] || "badge-gray";
}

/* ── Inbound Tab ─────────────────────────────────────────────────────── */
function InboundTab() {
  const [trucks, setTrucks]   = useState([]);
  const [number, setNumber]   = useState("");
  const [msg, setMsg]         = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTrucks = () =>
    axios.get(`${API}/inbound-trucks`).then(res => setTrucks(res.data)).catch(() => {});

  useEffect(() => { fetchTrucks(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg(null); setError(null);
    if (!number.trim()) { setError("Truck number is required."); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/inbound-trucks`, { truck_number: number.trim() });
      setMsg(`Inbound truck "${number.trim()}" registered successfully.`);
      setNumber("");
      fetchTrucks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create truck.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: "16px" }}>Register Inbound Truck</h3>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "16px" }}>
        <div className="form-group" style={{ minWidth: "200px" }}>
          <label className="form-label">Truck Number</label>
          <input className="input" value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. IB-101" />
        </div>
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? "Registering…" : "+ Register Truck"}
        </button>
      </form>

      {error && <div className="msg-error" style={{ marginBottom: "12px" }}>{error}</div>}
      {msg   && <div className="msg-success" style={{ marginBottom: "12px" }}>{msg}</div>}

      {trucks.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No inbound trucks registered yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Truck Number</th>
              <th>Arrival Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td style={{ fontWeight: 600 }}>{t.truck_number}</td>
                <td>{t.arrival_time ? new Date(t.arrival_time).toLocaleString() : "—"}</td>
                <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Outbound Tab ────────────────────────────────────────────────────── */
function OutboundTab({ isLeadman = false }) {
  const [trucks, setTrucks]      = useState([]);
  const [destinations, setDests] = useState([]);
  const [msg, setMsg]            = useState(null);
  const [error, setError]        = useState(null);
  const [loading, setLoading]    = useState(false);
  const [form, setForm] = useState({
    truck_number: "", destination_id: "", departure_deadline: "",
    max_weight: "", max_pallet_count: "",
  });

  const fetchTrucks = () =>
    axios.get(`${API}/outbound-trucks`).then(res => setTrucks(res.data)).catch(() => {});

  useEffect(() => {
    fetchTrucks();
    axios.get(`${API}/destinations`).then(res => setDests(res.data)).catch(() => {});
  }, []);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg(null); setError(null);
    const { truck_number, destination_id, departure_deadline, max_weight, max_pallet_count } = form;
    if (!truck_number.trim())  { setError("Truck number is required."); return; }
    if (!destination_id)       { setError("Destination is required."); return; }
    if (!departure_deadline)   { setError("Departure deadline is required."); return; }
    if (!max_weight || Number(max_weight) <= 0) { setError("Max weight must be a positive number."); return; }
    if (!max_pallet_count || Number(max_pallet_count) <= 0) { setError("Max pallet count must be a positive number."); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/outbound-trucks`, {
        truck_number:     truck_number.trim(),
        destination_id:   Number(destination_id),
        departure_deadline,
        max_weight:       Number(max_weight),
        max_pallet_count: Number(max_pallet_count),
      });
      setMsg(`Truck "${truck_number.trim()}" scheduled and assigned to a dock.`);
      setForm({ truck_number: "", destination_id: "", departure_deadline: "", max_weight: "", max_pallet_count: "" });
      fetchTrucks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create truck.");
    } finally {
      setLoading(false);
    }
  };

  const loadPct = (t) => {
    const pc = Math.round(((t.current_pallet_count ?? 0) / (t.max_pallet_count ?? 1)) * 100);
    return Math.min(100, pc);
  };

  return (
    <div>
      <h3 style={{ marginBottom: "16px" }}>Schedule Outbound Truck</h3>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "16px" }}>
        <div className="form-group" style={{ minWidth: "160px" }}>
          <label className="form-label">Truck Number</label>
          <input className="input" name="truck_number" value={form.truck_number} onChange={change} placeholder="e.g. OB-201" />
        </div>
        <div className="form-group" style={{ minWidth: "200px" }}>
          <label className="form-label">Destination</label>
          <select className="select" name="destination_id" value={form.destination_id} onChange={change}>
            <option value="">— Select —</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.region})</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: "190px" }}>
          <label className="form-label">Departure Deadline</label>
          <input className="input" type="datetime-local" name="departure_deadline" value={form.departure_deadline} onChange={change} />
        </div>
        <div className="form-group" style={{ minWidth: "130px" }}>
          <label className="form-label">Max Weight (kg)</label>
          <input className="input" type="number" name="max_weight" value={form.max_weight} onChange={change} placeholder="5000" min="1" />
        </div>
        <div className="form-group" style={{ minWidth: "130px" }}>
          <label className="form-label">Max Pallets</label>
          <input className="input" type="number" name="max_pallet_count" value={form.max_pallet_count} onChange={change} placeholder="20" min="1" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Scheduling…" : "+ Schedule Truck"}
        </button>
      </form>

      {error && <div className="msg-error" style={{ marginBottom: "12px" }}>{error}</div>}
      {msg   && <div className="msg-success" style={{ marginBottom: "12px" }}>{msg}</div>}

      {trucks.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No outbound trucks scheduled yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Truck #</th>
              <th>Dest ID</th>
              <th>Dock</th>
              <th>Deadline</th>
              <th>Pallet Load</th>
              <th>Weight Load</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(t => {
              const pPct = loadPct(t);
              const wPct = Math.min(100, Math.round(((t.current_weight ?? 0) / (t.max_weight ?? 1)) * 100));
              const isOverdue = t.departure_deadline && new Date(t.departure_deadline) < new Date() && t.status !== "departed";
              return (
                <tr key={t.id} style={{ background: isOverdue ? "#fffbeb" : undefined }}>
                  <td>{t.id}</td>
                  <td style={{ fontWeight: 600 }}>{t.truck_number}</td>
                  <td>{t.destination_name || t.destination_id}</td>
                  <td>{t.dock_location_id ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {t.departure_deadline ? (
                      <span style={{ color: isOverdue ? "#dc2626" : "inherit", fontWeight: isOverdue ? 700 : 400 }}>
                        {new Date(t.departure_deadline).toLocaleString()}
                        {isOverdue && " ⚠"}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ minWidth: "140px" }}>
                    <div style={{ fontSize: "11px", marginBottom: "3px" }}>
                      {t.current_pallet_count ?? 0} / {t.max_pallet_count}
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{
                        width: `${pPct}%`,
                        background: pPct >= 90 ? "#dc2626" : pPct >= 60 ? "#d97706" : "#2563eb",
                      }} />
                    </div>
                  </td>
                  <td style={{ minWidth: "140px" }}>
                    <div style={{ fontSize: "11px", marginBottom: "3px" }}>
                      {t.current_weight ?? 0} / {t.max_weight} kg
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{
                        width: `${wPct}%`,
                        background: wPct >= 90 ? "#dc2626" : wPct >= 60 ? "#d97706" : "#16a34a",
                      }} />
                    </div>
                  </td>
                  <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                  <td>
                    {isLeadman ? (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Manager only
                      </span>
                    ) : (
                      <DepartureButton truck={t} onDeparted={fetchTrucks} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── TruckManagement ─────────────────────────────────────────────────── */
function TruckManagement({ isLeadman = false }) {
  const [activeTab, setActiveTab] = useState("outbound");

  return (
    <div>
      <h2 style={{ marginBottom: "16px" }}>Truck Management</h2>
      <div className="tabs">
        <button className={`tab-btn ${activeTab === "outbound" ? "active" : ""}`} onClick={() => setActiveTab("outbound")}>
          Outbound Trucks
        </button>
        <button className={`tab-btn ${activeTab === "inbound" ? "active" : ""}`} onClick={() => setActiveTab("inbound")}>
          Inbound Trucks
        </button>
      </div>
      {activeTab === "outbound" ? <OutboundTab isLeadman={isLeadman} /> : <InboundTab />}
    </div>
  );
}

export default TruckManagement;
