import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function Overlay({ onClose, children }) {
  return (
    <div style={{
      position:  "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,.6)", backdropFilter: "blur(2px)",
      display:   "flex", alignItems: "center", justifyContent: "center",
      padding:   "20px",
    }} onClick={onClose}>
      <div style={{ maxWidth: "680px", width: "100%" }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ManifestModal({ truck, onClose, onDeparted }) {
  const [manifest, setManifest]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]         = useState(null);

  // Load full truck detail with pallets on open
  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/outbound-trucks/${truck.id}`)
      .then(res => setManifest(res.data))
      .catch(() => setError("Could not load truck details."))
      .finally(() => setLoading(false));
  }, [truck.id]);

  const confirmDepart = async () => {
    setConfirming(true); setError(null);
    try {
      const res = await axios.post(`${API}/outbound-trucks/${truck.id}/depart`);
      onDeparted(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Departure failed.");
    } finally {
      setConfirming(false);
    }
  };

  const isOverdue = truck.departure_deadline && new Date(truck.departure_deadline) < new Date();

  return (
    <div className="card" style={{ maxHeight: "85vh", overflowY: "auto", borderRadius: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h2 style={{ marginBottom: "4px" }}>Shipment Manifest</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Truck <strong>{truck.truck_number}</strong> → {truck.destination_name || `Dest ${truck.destination_id}`}
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: "18px", padding: "2px 10px" }} onClick={onClose}>×</button>
      </div>

      {isOverdue && (
        <div className="msg-error" style={{ marginBottom: "16px" }}>
          ⚠ Departure deadline has passed — this truck is overdue!
        </div>
      )}

      {error && <div className="msg-error" style={{ marginBottom: "12px" }}>{error}</div>}

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading manifest…</p>
      ) : manifest ? (
        <>
          {/* Truck summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "20px" }}>
            {[
              { label: "Dock",      value: manifest.dock_location_id ?? "—" },
              { label: "Pallets",   value: `${manifest.current_pallet_count ?? 0} / ${manifest.max_pallet_count}` },
              { label: "Weight",    value: `${manifest.current_weight ?? 0} / ${manifest.max_weight} kg` },
              { label: "Deadline",  value: manifest.departure_deadline ? new Date(manifest.departure_deadline).toLocaleString() : "—" },
              { label: "Status",    value: manifest.status },
              { label: "Pending tasks", value: manifest.pending_tasks ?? 0,
                warn: (manifest.pending_tasks ?? 0) > 0 },
            ].map(s => (
              <div key={s.label} style={{
                background: "#f8fafc", borderRadius: "8px", padding: "10px 14px",
                border: s.warn ? "1px solid #fde68a" : "1px solid var(--border)",
              }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontWeight: 700, color: s.warn ? "#d97706" : "var(--text)", fontSize: "14px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {(manifest.pending_tasks ?? 0) > 0 && (
            <div className="msg-info" style={{ marginBottom: "16px" }}>
              {manifest.pending_tasks} pallet task(s) are still pending or in progress.
              Confirming departure will cancel them.
            </div>
          )}

          {/* Pallet list */}
          <h3 style={{ marginBottom: "10px" }}>Pallets on this Truck ({manifest.pallets?.length ?? 0})</h3>
          {!manifest.pallets?.length ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No pallets assigned yet.</p>
          ) : (
            <table className="data-table" style={{ marginBottom: "20px" }}>
              <thead>
                <tr>
                  <th>Pallet</th>
                  <th>Product</th>
                  <th>Weight</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {manifest.pallets.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>P-{p.id}</td>
                    <td>{p.product_name || "—"}</td>
                    <td>{p.weight ? `${p.weight} kg` : "—"}</td>
                    <td>{p.location_name || `Loc ${p.current_location_id}`}</td>
                    <td><span className={`badge ${p.status === "delivered" ? "badge-green" : p.status === "assigned" ? "badge-blue" : "badge-gray"}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}

      {/* Actions */}
      {manifest?.status !== "departed" && (
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-success"
            onClick={confirmDepart}
            disabled={confirming || !manifest || manifest.pallets?.length === 0}
          >
            {confirming ? "Confirming…" : "✓ Confirm Departure"}
          </button>
        </div>
      )}

      {manifest?.status === "departed" && (
        <div className="msg-success" style={{ marginTop: "12px" }}>
          This truck has departed. Manifest is locked.
        </div>
      )}
    </div>
  );
}

export function DepartureButton({ truck, onDeparted }) {
  const [open, setOpen] = useState(false);

  if (truck.status === "departed") {
    return <span className="badge badge-red">Departed</span>;
  }

  return (
    <>
      <button
        className="btn btn-success"
        style={{ fontSize: "12px", padding: "5px 12px" }}
        onClick={() => setOpen(true)}
      >
        Depart →
      </button>

      {open && (
        <Overlay onClose={() => setOpen(false)}>
          <ManifestModal
            truck={truck}
            onClose={() => setOpen(false)}
            onDeparted={data => { setOpen(false); onDeparted?.(data); }}
          />
        </Overlay>
      )}
    </>
  );
}

export default DepartureButton;
