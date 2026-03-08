import { useEffect, useState } from "react";
import axios from "axios";
import WarehouseGrid from "./components/WarehouseGrid";
import TaskPanel from "./components/TaskPanel";
import ManagerPanel from "./components/ManagerPanel";

function App() {

  const [layout, setLayout] = useState(null);

  const fetchLayout = () => {
    axios.get("http://localhost:4567/layout")
      .then(res => setLayout(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchLayout();

    const interval = setInterval(fetchLayout, 3000); // refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
  <div style={{
    padding:"20px",
    fontFamily:"Arial"
  }}>

    <h1 style={{marginBottom:"30px"}}>
      Smart Warehouse Control Dashboard
    </h1>

    {!layout && <p>Loading warehouse...</p>}

    {layout && (
      <>

        <div style={{
          display:"grid",
          gridTemplateColumns:"2fr 1fr",
          gap:"40px"
        }}>

          <div>
            <WarehouseGrid
              locations={layout.locations}
              pallets={layout.pallets}
            />
          </div>

          <div>
            <TaskPanel />
            <ManagerPanel />
          </div>

        </div>

      </>
    )}

  </div>
);
}

export default App;