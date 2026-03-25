import React from "react";

function WarehouseGrid({ locations, pallets, scannedPallet }) {

  // group pallets by location
  const palletsByLocation = {};

  pallets.forEach(p => {
    const loc = p.current_location_id;

    if (!palletsByLocation[loc]) {
      palletsByLocation[loc] = [];
    }

    palletsByLocation[loc].push(p.id);
  });

  const getColor = (type) => {

    if (type === "rack") return "#e3f2fd";
    if (type === "staging") return "#fff3cd";
    if (type === "dock") return "#d4edda";

    return "#f5f5f5";
  };

  const renderZone = (type, title) => {

    const zoneLocations = locations.filter(
      l => l.location_type === type
    );

    return (

      <div style={{ marginBottom: "30px" }}>

        <h3>{title}</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 140px)",
            gap: "15px"
          }}
        >

          {zoneLocations.map(loc => {

            const palletList = palletsByLocation[loc.id] || [];

            return (

              <div
                key={loc.id}
                style={{
                  border: "2px solid #333",
                  borderRadius: "8px",
                  padding: "10px",
                  minHeight: "100px",
                  background: getColor(loc.location_type)
                }}
              >

                <strong>{loc.code}</strong>

                <div
                  style={{
                    fontSize: "12px",
                    marginTop: "4px",
                    color: "#555"
                  }}
                >
                  {palletList.length} pallets
                </div>

                <div style={{ marginTop: "5px" }}>

                  {palletList.map(pid => (

                    <div
                      key={pid}
                      style={{
                        fontSize: "12px",
                        padding: "2px",
                        marginBottom: "2px",
                        borderRadius: "4px",
                        fontWeight: "bold", color: "#333",
                        background:
                          pid == scannedPallet
                            ? "#ffeb3b"
                            : "transparent"
                      }}
                    >
                      📦 {pid}
                    </div>

                  ))}

                </div>

              </div>

            );

          })}

        </div>

      </div>

    );

  };

  return (

    <div style={{ marginTop: "20px" }}>

      {renderZone("rack", "Rack Storage")}
      {renderZone("staging", "Staging Area")}
      {renderZone("dock", "Dock Area")}

    </div>

  );

}

export default WarehouseGrid;