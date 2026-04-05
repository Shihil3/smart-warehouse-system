import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const STATUS_CONFIG = {
  stored:          { cls: "badge-blue",   label: "Stored"          },
  pending_storage: { cls: "badge-yellow", label: "Pending Storage" },
};

const PRIORITY_CONFIG = {
  1: { cls: "badge-red",    label: "High"   },
  2: { cls: "badge-yellow", label: "Medium" },
  3: { cls: "badge-gray",   label: "Low"    },
};

function RackSummaryBar({ summary }) {
  if (!summary || summary.length === 0) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ marginBottom: "12px" }}>Rack Occupancy</h3>
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap:                 "10px",
      }}>
        {summary.map(r => {
          const pct = parseInt(r.occupancy_pct) || 0;
          const barColor = pct >= 90 ? "#dc2626" : pct >= 60 ? "#d97706" : "#16a34a";
          return (
            <div key={r.rack_id} style={{
              background:   "var(--bg-card)",
              border:       "1px solid var(--border)",
              borderRadius: "8px",
              padding:      "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>{r.rack_name}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {r.stored_count}/{r.max_capacity}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                {pct}% full
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryView() {
  const [pallets, setPallets]   = useState([]);
  const [summary, setSummary]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [retrieving, setRetrieving] = useState(null); // pallet_id being retrieved
  const [messages, setMessages] = useState({});        // { pallet_id: { type, text } }

  const fetchData = () => {
    Promise.all([
      axios.get(`${API}/inventory`),
      axios.get(`${API}/inventory/summary`),
    ]).then(([invRes, sumRes]) => {
      setPallets(invRes.data);
      setSummary(sumRes.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 8000);
    return () => clearInterval(iv);
  }, []);

  const handleRetrieve = async (palletId) => {
    setRetrieving(palletId);
    setMessages(prev => ({ ...prev, [palletId]: null }));

    try {
      const res = await axios.post(`${API}/inventory/${palletId}/retrieve`);
      setMessages(prev => ({
        ...prev,
        [palletId]: { type: "success", text: res.data.message },
      }));
      fetchData();
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        [palletId]: {
          type: "error",
          text: err.response?.data?.error || "Retrieval failed.",
        },
      }));
    } finally {
      setRetrieving(null);
    }
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading inventory…</p>;

  return (
    <div>
      {/* Rack summary */}
      <RackSummaryBar summary={summary} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3>Stored Pallets ({pallets.length})</h3>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={fetchData}>
          Refresh
        </button>
      </div>

      {pallets.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          border: "2px dashed var(--border)", borderRadius: "10px",
          color: "var(--text-muted)",
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🏪</div>
          No pallets in storage. All pallets have been cross-docked or retrieved.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Pallet</th>
              <th>Product</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Weight</th>
              <th>Destination</th>
              <th>Location</th>
              <th>Stored Since</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pallets.map(p => {
              const stCfg   = STATUS_CONFIG[p.status]   || { cls: "badge-gray", label: p.status };
              const priCfg  = PRIORITY_CONFIG[parseInt(p.priority)] || { cls: "badge-gray", label: p.priority };
              const msg     = messages[p.id];
              const isBusy  = retrieving === p.id;

              return (
                <>
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>P-{p.id}</td>
                    <td>
                      {p.product_name
                        ? <><div style={{ fontWeight: 600 }}>{p.product_name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.product_sku}</div></>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td><span className={`badge ${stCfg.cls}`}>{stCfg.label}</span></td>
                    <td><span className={`badge ${priCfg.cls}`}>{priCfg.label}</span></td>
                    <td>{p.weight ? `${p.weight} kg` : "—"}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.destination_name || `Dest ${p.destination_id}`}</div>
                      {p.destination_region && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.destination_region}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.location_name || `Loc ${p.current_location_id}`}</div>
                      {p.location_type && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.location_type}</div>
                      )}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "5px 12px" }}
                        onClick={() => handleRetrieve(p.id)}
                        disabled={isBusy}
                        title="Assign this pallet to an available outbound truck and create a retrieval task"
                      >
                        {isBusy ? "Retrieving…" : "Retrieve →"}
                      </button>
                    </td>
                  </tr>
                  {msg && (
                    <tr key={`msg-${p.id}`}>
                      <td colSpan={9} style={{ padding: "6px 14px 10px" }}>
                        <div className={msg.type === "success" ? "msg-success" : "msg-error"}>
                          {msg.text}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
        Auto-refreshes every 8s · "Retrieve →" assigns a stored pallet to the next available truck and creates a worker task
      </p>
    </div>
  );
}

export default InventoryView;
