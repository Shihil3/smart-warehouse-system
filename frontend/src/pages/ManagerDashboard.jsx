import { useEffect, useState } from "react";
import axios from "axios";
import WarehouseGrid from "../components/WarehouseGrid";
import ManagerPanel from "../components/ManagerPanel";

function ManagerDashboard({ onLogout }) {

  const [layout, setLayout] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:4567/layout")
      .then(res => setLayout(res.data));
  }, []);

  if (!layout) return <p>Loading warehouse...</p>;

  return (
    <div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Manager Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      <WarehouseGrid
        locations={layout.locations}
        pallets={layout.pallets}
      />

      <ManagerPanel />

    </div>
  );

}

export default ManagerDashboard;
