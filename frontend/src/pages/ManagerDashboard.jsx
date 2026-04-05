import { useEffect, useState } from "react";
import axios from "axios";
import WarehouseGrid       from "../components/WarehouseGrid";
import ManagerPanel        from "../components/ManagerPanel";
import TruckManagement     from "../components/TruckManagement";
import RackView            from "../components/RackView";
import LocationCodes       from "../components/LocationCodes";
import InventoryView       from "../components/InventoryView";
import DashboardCharts     from "../components/DashboardCharts";
import WorkerProductivity  from "../components/WorkerProductivity";
import KpiDashboard        from "../components/KpiDashboard";
import AccidentReport      from "../components/AccidentReport";
import TaskAssignment     from "../components/TaskAssignment";
import ProductManagement  from "../components/ProductManagement";

const TABS = [
  { key: "overview",   label: "📊 Overview"          },
  { key: "inventory",  label: "🏪 Inventory"          },
  { key: "tasks",      label: "✅ Tasks"               },
  { key: "products",   label: "📦 Products"            },
  { key: "racks",      label: "🗄️ Rack Tracking"     },
  { key: "trucks",     label: "🚛 Truck Management"   },
  { key: "workers",    label: "👷 Workers"            },
  { key: "kpis",       label: "📈 KPIs"               },
  { key: "incidents",  label: "🚨 Incidents"          },
  { key: "locations",  label: "🏷️ Location QR Codes" },
  { key: "alerts",     label: "⚠️ Alerts"             },
];

function ManagerDashboard() {
  const [layout, setLayout]       = useState(null);
  const [layoutError, setLayoutError] = useState(null);
  const [activeTab, setTab]       = useState("overview");

  const loadLayout = () => {
    setLayoutError(null);
    axios.get("http://localhost:4567/layout")
      .then(res => setLayout(res.data))
      .catch(() => setLayoutError("Could not load warehouse layout. Check the backend server."));
  };

  useEffect(() => { loadLayout(); }, []);

  if (!layout && !layoutError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading warehouse…</p>
      </div>
    );
  }

  if (layoutError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "40vh", gap: "12px" }}>
        <div className="msg-error">{layoutError}</div>
        <button className="btn btn-primary" onClick={loadLayout}>Retry</button>
      </div>
    );
  }

  const totalPallets   = layout.pallets.length;
  const dockPallets    = layout.pallets.filter(p => {
    const loc = layout.locations.find(l => String(l.id) === String(p.current_location_id));
    return loc?.location_type === "dock";
  }).length;
  const rackPallets    = layout.pallets.filter(p => {
    const loc = layout.locations.find(l => String(l.id) === String(p.current_location_id));
    return loc?.location_type === "rack";
  }).length;
  const stagingPallets = totalPallets - dockPallets - rackPallets;

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h1>Manager Dashboard</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
          Live warehouse overview — pallets, racks, and trucks
        </p>
      </div>

      {/* Top-level stats */}
      <div className="stat-grid" style={{ marginBottom: "28px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Pallets</span>
          <span className="stat-value">{totalPallets}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">In Racks</span>
          <span className="stat-value" style={{ color: "var(--accent)" }}>{rackPallets}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">At Staging</span>
          <span className="stat-value" style={{ color: "#d97706" }}>{stagingPallets}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">At Docks</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>{dockPallets}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Locations</span>
          <span className="stat-value">{layout.locations.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card">
        {activeTab === "overview" && (
          <div>
            <DashboardCharts />
            <h2 style={{ marginBottom: "16px" }}>Warehouse Floor Map</h2>
            <WarehouseGrid locations={layout.locations} pallets={layout.pallets} />
          </div>
        )}

        {activeTab === "inventory" && (
          <div>
            <h2 style={{ marginBottom: "4px" }}>Warehouse Inventory</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Pallets currently stored in racks. Click "Retrieve →" to assign a pallet to an outbound truck.
            </p>
            <InventoryView />
          </div>
        )}

        {activeTab === "racks" && (
          <div>
            <h2 style={{ marginBottom: "16px" }}>Rack Occupancy</h2>
            <RackView />
          </div>
        )}

        {activeTab === "tasks" && (
          <div>
            <h2 style={{ marginBottom: "4px" }}>Task Assignment</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Assign pending tasks to workers. Forklift operators are highlighted in the assignment dropdown.
            </p>
            <TaskAssignment />
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <h2 style={{ marginBottom: "4px" }}>Products</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Manage the product catalogue. Products are linked to pallets when they arrive.
            </p>
            <ProductManagement />
          </div>
        )}

        {activeTab === "trucks" && <TruckManagement />}

        {activeTab === "workers" && (
          <div>
            <h2 style={{ marginBottom: "4px" }}>Worker Productivity</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Click a worker card to view their full task history.
            </p>
            <WorkerProductivity />
          </div>
        )}

        {activeTab === "kpis" && <KpiDashboard />}

        {activeTab === "incidents" && (
          <div>
            <h2 style={{ marginBottom: "4px" }}>Incident Reports</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Review and resolve accident and hazard reports from workers.
            </p>
            <AccidentReport />
          </div>
        )}

        {activeTab === "locations" && (
          <div>
            <h2 style={{ marginBottom: "16px" }}>Location QR Codes</h2>
            <LocationCodes />
          </div>
        )}

        {activeTab === "alerts" && <ManagerPanel />}
      </div>
    </div>
  );
}

export default ManagerDashboard;
