import React from "react";

const ZONE_CONFIG = {
  rack:    { title: "Rack Storage",  color: "#dbeafe", border: "#93c5fd", icon: "📦" },
  staging: { title: "Staging Area",  color: "#fef9c3", border: "#fde047", icon: "🔄" },
  dock:    { title: "Dock Area",     color: "#dcfce7", border: "#86efac", icon: "🚛" },
};

function LocationCell({ loc, palletIds, scannedPallet }) {
  const cfg = ZONE_CONFIG[loc.location_type] || { color: "#f1f5f9", border: "#e2e8f0", icon: "📍" };
  const name = loc.rack_id || loc.label || `#${loc.id}`;
  const hasScanned = palletIds.includes(String(scannedPallet));

  return (
    <div style={{
      border:        `1px solid ${hasScanned ? "#f59e0b" : cfg.border}`,
      borderRadius:  "8px",
      padding:       "10px 12px",
      minHeight:     "90px",
      background:    hasScanned ? "#fef3c7" : cfg.color,
      display:       "flex",
      flexDirection: "column",
      gap:           "6px",
      transition:    "transform .1s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "12px", color: "#1e293b" }}>{name}</span>
        {palletIds.length > 0 && (
          <span style={{
            background:   "rgba(0,0,0,.12)",
            borderRadius: "99px",
            padding:      "1px 7px",
            fontSize:     "10px",
            fontWeight:   700,
          }}>
            {palletIds.length}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {palletIds.length === 0 ? (
          <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>empty</span>
        ) : (
          palletIds.map(pid => (
            <span key={pid} style={{
              background:   pid == scannedPallet ? "#f59e0b" : "rgba(0,0,0,.1)",
              borderRadius: "4px",
              padding:      "2px 6px",
              fontSize:     "11px",
              fontWeight:   600,
              color:        pid == scannedPallet ? "#fff" : "#1e293b",
            }}>
              P-{pid}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ZoneSection({ type, locations, palletsByLocation, scannedPallet }) {
  const cfg = ZONE_CONFIG[type] || { title: type, icon: "📍" };
  const zoneLocations = locations.filter(l => l.location_type === type);
  if (zoneLocations.length === 0) return null;

  const totalPallets = zoneLocations.reduce(
    (s, l) => s + (palletsByLocation[l.id]?.length || 0), 0
  );

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        display:     "flex",
        alignItems:  "center",
        gap:         "8px",
        marginBottom:"12px",
      }}>
        <span style={{ fontSize: "16px" }}>{cfg.icon}</span>
        <h3 style={{ margin: 0 }}>{cfg.title}</h3>
        <span className="badge badge-gray" style={{ marginLeft: "4px" }}>
          {zoneLocations.length} locations · {totalPallets} pallets
        </span>
      </div>
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap:                 "10px",
      }}>
        {zoneLocations.map(loc => (
          <LocationCell
            key={loc.id}
            loc={loc}
            palletIds={palletsByLocation[loc.id] || []}
            scannedPallet={scannedPallet}
          />
        ))}
      </div>
    </div>
  );
}

function WarehouseGrid({ locations, pallets, scannedPallet }) {
  const palletsByLocation = {};
  pallets.forEach(p => {
    const loc = String(p.current_location_id);
    if (!palletsByLocation[loc]) palletsByLocation[loc] = [];
    palletsByLocation[loc].push(String(p.id));
  });

  return (
    <div>
      <ZoneSection type="rack"    locations={locations} palletsByLocation={palletsByLocation} scannedPallet={scannedPallet} />
      <ZoneSection type="staging" locations={locations} palletsByLocation={palletsByLocation} scannedPallet={scannedPallet} />
      <ZoneSection type="dock"    locations={locations} palletsByLocation={palletsByLocation} scannedPallet={scannedPallet} />
    </div>
  );
}

export default WarehouseGrid;
