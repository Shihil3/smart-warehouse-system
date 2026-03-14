import { useEffect, useState } from "react";
import axios from "axios";

function ManagerPanel() {

  const [trucks, setTrucks] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const fetchData = () => {
    axios.get("http://localhost:4567/outbound-trucks")
      .then(res => setTrucks(res.data));

    axios.get("http://localhost:4567/alerts")
      .then(res => setAlerts(res.data));
  };

 useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{marginTop:"30px"}}>

      <h2>Manager Panel</h2>

      <h3>Outbound Trucks</h3>

      {trucks.map(t => (
        <div key={t.id}>
          Truck {t.truck_number} → Dock {t.dock_location_id}
        </div>
      ))}

      <h3 style={{marginTop:"20px"}}>Congestion Alerts</h3>

      {alerts.length === 0 && <p>No alerts</p>}

      {alerts.map(a => (
        <div key={a.id} style={{color:"red"}}>
          ⚠ {a.message}
        </div>
      ))}

    </div>
  );
}

export default ManagerPanel;
