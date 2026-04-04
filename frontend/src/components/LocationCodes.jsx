import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const TYPE_CONFIG = {
  rack:    { label: "Rack",    cls: "badge-blue"   },
  staging: { label: "Staging", cls: "badge-yellow" },
  dock:    { label: "Dock",    cls: "badge-green"  },
};

function copyToClipboard(text, setCopied, id) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  });
}

function LocationCodes() {
  const [locations, setLocations] = useState([]);
  const [filter, setFilter]       = useState("all");
  const [copied, setCopied]       = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    axios.get(`${API}/layout`)
      .then(res => setLocations(res.data.locations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading locations…</p>;

  const filtered = filter === "all"
    ? locations
    : locations.filter(l => l.location_type === filter);

  const counts = {
    rack:    locations.filter(l => l.location_type === "rack").length,
    staging: locations.filter(l => l.location_type === "staging").length,
    dock:    locations.filter(l => l.location_type === "dock").length,
  };

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
          Print these QR codes and attach them to their physical locations.
          Workers scan them to confirm deliveries. Format: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "3px" }}>LOC|&#123;id&#125;</code>
        </p>

        {/* Filter buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { key: "all",     label: `All (${locations.length})` },
            { key: "rack",    label: `Racks (${counts.rack})` },
            { key: "staging", label: `Staging (${counts.staging})` },
            { key: "dock",    label: `Docks (${counts.dock})` },
          ].map(f => (
            <button
              key={f.key}
              className={`tab-btn ${filter === f.key ? "active" : ""}`}
              style={{
                padding: "5px 14px", borderRadius: "6px", fontSize: "12px",
                border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No locations found.</p>
      ) : (
        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap:                 "12px",
        }}>
          {filtered.map(loc => {
            const qrCode  = `LOC|${loc.id}`;
            const name    = loc.rack_id || loc.label || `Location ${loc.id}`;
            const typeCfg = TYPE_CONFIG[loc.location_type] || { label: loc.location_type, cls: "badge-gray" };
            const isCopied = copied === loc.id;

            return (
              <div key={loc.id} style={{
                border:       "1px solid var(--border)",
                borderRadius: "10px",
                padding:      "14px 16px",
                background:   "var(--bg-card)",
                display:      "flex",
                flexDirection:"column",
                gap:          "10px",
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{name}</div>
                    {loc.label && loc.rack_id && loc.label !== loc.rack_id && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{loc.label}</div>
                    )}
                  </div>
                  <span className={`badge ${typeCfg.cls}`}>{typeCfg.label}</span>
                </div>

                {/* QR Code visual (text-based placeholder) */}
                <div style={{
                  background:    "#0f172a",
                  borderRadius:  "8px",
                  padding:       "14px",
                  textAlign:     "center",
                  fontFamily:    "monospace",
                  position:      "relative",
                  overflow:      "hidden",
                }}>
                  {/* Faux QR pattern */}
                  <div style={{
                    display:    "grid",
                    gridTemplateColumns: "repeat(7, 14px)",
                    gap:        "2px",
                    justifyContent: "center",
                    marginBottom: "10px",
                  }}>
                    {QR_PATTERN.map((cell, i) => (
                      <div key={i} style={{
                        width: "14px", height: "14px",
                        background: cell ? "#fff" : "transparent",
                        borderRadius: "1px",
                      }} />
                    ))}
                  </div>
                  <div style={{ color: "#fff", fontSize: "13px", fontWeight: 700, letterSpacing: ".05em" }}>
                    {qrCode}
                  </div>
                </div>

                {/* Copy button */}
                <button
                  className={`btn ${isCopied ? "btn-success" : "btn-ghost"}`}
                  style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "7px" }}
                  onClick={() => copyToClipboard(qrCode, setCopied, loc.id)}
                >
                  {isCopied ? "✓ Copied!" : "Copy QR Code"}
                </button>

                <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                  ID: {loc.id}
                  {loc.x_coordinate && ` · (${loc.x_coordinate}, ${loc.y_coordinate})`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--text-muted)" }}>
        Copy the QR code text and use any QR generator to print physical labels.
        Attach them at the corresponding warehouse location.
      </p>
    </div>
  );
}

// Simple fixed pattern for visual faux-QR decoration (7x7 = 49 cells)
const QR_PATTERN = [
  1,1,1,1,1,1,1,
  1,0,0,0,0,0,1,
  1,0,1,0,1,0,1,
  1,0,0,1,0,0,1,
  1,0,1,0,1,0,1,
  1,0,0,0,0,0,1,
  1,1,1,1,1,1,1,
];

export default LocationCodes;
