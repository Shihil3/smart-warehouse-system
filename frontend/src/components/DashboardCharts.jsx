import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

// ── Colour palette ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  created:         "#3b82f6",  // blue      – just arrived
  pending_storage: "#f59e0b",  // amber     – waiting for rack
  stored:          "#0891b2",  // cyan      – in a rack
  assigned:        "#8b5cf6",  // violet    – truck assigned
  in_transit:      "#f97316",  // orange    – being moved
  delivered:       "#16a34a",  // green     – at dock/truck
};

const STATUS_LABELS = {
  created:         "Arrived",
  pending_storage: "Queued for Rack",
  stored:          "In Rack",
  assigned:        "Truck Assigned",
  in_transit:      "In Transit",
  delivered:       "Delivered",
};

// ── SVG Donut ───────────────────────────────────────────────────────────────
function DonutChart({ slices, total, cx = 80, cy = 80, r = 62, inner = 38 }) {
  if (total === 0) {
    return (
      <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
        <circle cx={cx} cy={cy} r={r}   fill="#f1f5f9" />
        <circle cx={cx} cy={cy} r={inner} fill="#fff" />
        <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="13" fill="#94a3b8">No</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="13" fill="#94a3b8">data</text>
      </svg>
    );
  }

  const toRad = d => (d * Math.PI) / 180;
  let angle = -90;

  const paths = slices
    .filter(s => s.value > 0)
    .map(s => {
      const sweep     = (s.value / total) * 360;
      const endAngle  = angle + sweep;
      const large     = sweep > 180 ? 1 : 0;

      const x1 = cx + r     * Math.cos(toRad(angle));
      const y1 = cy + r     * Math.sin(toRad(angle));
      const x2 = cx + r     * Math.cos(toRad(endAngle));
      const y2 = cy + r     * Math.sin(toRad(endAngle));
      const xi1= cx + inner * Math.cos(toRad(angle));
      const yi1= cy + inner * Math.sin(toRad(angle));
      const xi2= cx + inner * Math.cos(toRad(endAngle));
      const yi2= cy + inner * Math.sin(toRad(endAngle));

      const d = [
        `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        `L ${xi2.toFixed(2)} ${yi2.toFixed(2)}`,
        `A ${inner} ${inner} 0 ${large} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
        "Z",
      ].join(" ");

      angle = endAngle;
      return { ...s, d };
    });

  return (
    <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
      {paths.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} opacity={0.92}>
          <title>{s.label}: {s.value}</title>
        </path>
      ))}
      {/* white inner ring */}
      <circle cx={cx} cy={cy} r={inner - 1} fill="#fff" />
      {/* center label */}
      <text x={cx} y={cy - 5}  textAnchor="middle" fontSize="22" fontWeight="800" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#64748b">pallets</text>
    </svg>
  );
}

// ── Horizontal bar chart ────────────────────────────────────────────────────
function RackBars({ racks }) {
  if (!racks || racks.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "13px" }}>No rack data.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {racks.map(r => {
        const pct = Math.min(100, parseInt(r.occupancy_pct) || 0);
        const bar = pct >= 90 ? "#dc2626" : pct >= 60 ? "#f59e0b" : "#2563eb";

        return (
          <div key={r.rack_id}>
            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              fontSize:       "12px",
              marginBottom:   "3px",
              fontWeight:     600,
              color:          "var(--text)",
            }}>
              <span>{r.rack_name}</span>
              <span style={{ color: bar }}>{r.stored_count}/{r.max_capacity}</span>
            </div>
            <div className="progress-bar-bg" style={{ height: "10px" }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%`, background: bar, height: "10px" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini sparkline (recent pallet arrivals) ─────────────────────────────────
function Sparkline({ points, color = "#2563eb", width = 120, height = 36 }) {
  if (!points || points.length < 2) {
    return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>
    </div>;
  }

  const max = Math.max(...points, 1);
  const step = width / (points.length - 1);

  const coords = points.map((v, i) => [
    i * step,
    height - (v / max) * (height - 4) - 2,
  ]);

  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");

  const fill = [
    ...coords.map(c => `${c[0].toFixed(1)},${c[1].toFixed(1)}`),
    `${width},${height}`,
    `0,${height}`,
  ].join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={fill} fill={color} opacity={0.12} />
      <polyline points={coords.map(c => c.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
function DashboardCharts() {
  const [pallets, setPallets] = useState([]);
  const [racks, setRacks]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    // Fetch independently so a rack summary failure doesn't kill the pallet chart
    axios.get(`${API}/pallets`)
      .then(res => setPallets(res.data))
      .catch(() => {});

    axios.get(`${API}/inventory/summary`)
      .then(res => setRacks(res.data))
      .catch(() => setRacks([]))   // silently degrade — chart just shows empty bars
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return <div style={{ height: "200px", display: "flex", alignItems: "center",
                         justifyContent: "center", color: "var(--text-muted)" }}>
      Loading charts…
    </div>;
  }

  // ── Compute status breakdown for donut ──────────────────────────────────
  const counts = {};
  pallets.forEach(p => {
    counts[p.status] = (counts[p.status] || 0) + 1;
  });

  const donutSlices = Object.entries(STATUS_COLORS).map(([key, color]) => ({
    label: STATUS_LABELS[key] || key,
    value: counts[key] || 0,
    color,
  }));

  const totalPallets = pallets.length;

  // ── Compute sparkline from hourly buckets (last 7 entries) ──────────────
  // Group pallets by hour of creation (last 12 hours, 2-hour buckets)
  const now = Date.now();
  const BUCKET_MS = 2 * 60 * 60 * 1000; // 2-hour buckets
  const BUCKETS   = 6;
  const sparkData = Array(BUCKETS).fill(0);
  pallets.forEach(p => {
    if (!p.created_at) return;
    const age = now - new Date(p.created_at).getTime();
    const bucket = Math.floor(age / BUCKET_MS);
    if (bucket >= 0 && bucket < BUCKETS) sparkData[BUCKETS - 1 - bucket]++;
  });

  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr)",
      gap:                 "16px",
      marginBottom:        "28px",
    }}>

      {/* ── Card 1: Pallet state donut ─────────────────────────────────── */}
      <div className="card" style={{ padding: "20px 20px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "14px" }}>
          Pallet States
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <DonutChart slices={donutSlices} total={totalPallets} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
            {donutSlices.filter(s => s.value > 0).map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px",
                              background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flex: 1,
                               whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
                  {s.value}
                </span>
              </div>
            ))}
            {donutSlices.every(s => s.value === 0) && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No pallets yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Card 2: Rack utilization bars ──────────────────────────────── */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "14px",
                      display: "flex", justifyContent: "space-between" }}>
          <span>Rack Utilization</span>
          <span style={{ fontWeight: 400, fontSize: "12px", color: "var(--text-muted)" }}>
            {racks.reduce((s, r) => s + parseInt(r.stored_count || 0), 0)} stored
          </span>
        </div>
        <RackBars racks={racks} />
      </div>

      {/* ── Card 3: Throughput sparkline ────────────────────────────────── */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
          Recent Throughput
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>
          Pallets received — 2h buckets
        </div>
        <Sparkline points={sparkData} color="#2563eb" width={160} height={48} />
        <div style={{ display: "flex", justifyContent: "space-between",
                      marginTop: "6px", fontSize: "10px", color: "var(--text-muted)" }}>
          <span>12h ago</span>
          <span>Now</span>
        </div>

        {/* quick totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
          {[
            { label: "Cross-docked", value: counts.created || 0,          color: "#3b82f6" },
            { label: "In Rack",      value: (counts.stored || 0) + (counts.pending_storage || 0), color: "#0891b2" },
          ].map(m => (
            <div key={m.label} style={{
              background: "#f8fafc", borderRadius: "6px", padding: "8px 10px",
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: ".04em" }}>{m.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: m.color, lineHeight: 1.2 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default DashboardCharts;
