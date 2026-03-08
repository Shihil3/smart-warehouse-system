function WarehouseGrid({ locations, pallets }) {

  const palletsByLocation = {};

  pallets.forEach(p => {
    if (!palletsByLocation[p.current_location_id]) {
      palletsByLocation[p.current_location_id] = [];
    }
    palletsByLocation[p.current_location_id].push(p.id);
  });

  const getColor = (type) => {
    if (type === "rack") return "#e3f2fd";
    if (type === "staging") return "#fff3cd";
    if (type === "dock") return "#d4edda";
    return "#f5f5f5";
  };

  const renderZone = (type, title) => {

    const zoneLocations = locations.filter(l => l.location_type === type);

    return (
      <div style={{marginBottom:"30px"}}>

        <h3>{title}</h3>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(4,120px)",
          gap:"15px"
        }}>

          {zoneLocations.map(loc => {

            const palletList = palletsByLocation[loc.id] || [];

            return (
              <div
                key={loc.id}
                style={{
                  border:"2px solid #333",
                  borderRadius:"8px",
                  padding:"10px",
                  background:getColor(loc.location_type),
                  minHeight:"80px"
                }}
              >

                <strong>{loc.code}</strong>

                <div style={{
                  fontSize:"12px",
                  marginTop:"5px",
                  color:"#555"
                }}>
                  {palletList.length} pallets
                </div>

                {palletList.map(pid => (
                  <div key={pid} style={{fontSize:"12px"}}>
                    📦 {pid}
                  </div>
                ))}

              </div>
            );

          })}

        </div>

      </div>
    );

  };

  return (
    <div style={{marginTop:"20px"}}>

      {renderZone("rack","Rack Storage")}
      {renderZone("staging","Staging Area")}
      {renderZone("dock","Dock Area")}

    </div>
  );

}

export default WarehouseGrid;