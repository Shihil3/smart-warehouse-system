import { useEffect, useState } from "react";
import axios from "axios";
import TaskPanel          from "../components/TaskPanel";
import PalletScanner      from "../components/PalletScanner";
import DestinationScanner from "../components/DestinationScanner";
import AccidentReport     from "../components/AccidentReport";
import LeadmanTrucks      from "../components/LeadmanTrucks";

const API = "http://localhost:4567";

const BASE_TABS = [
  { key: "tasks",    label: "📋 Task Queue"          },
  { key: "complete", label: "📍 Complete by QR Scan" },
  { key: "receive",  label: "📷 Receive Pallet (QR)" },
  { key: "incident", label: "🚨 Report Incident"     },
];

const LEADMAN_TABS = [
  { key: "trucks",   label: "🚛 Truck Management"    },
];

function WorkerDashboard({ workerName, isLeadman: initialLeadman }) {
  const [activeTab,     setTab]      = useState("tasks");
  const [tasks,         setTasks]    = useState([]);
  const [scannedPallet, setScanned]  = useState(null);
  // Use local state so a manager-promoted leadman sees truck tabs without re-login
  const [isLeadman,     setIsLeadman] = useState(initialLeadman);

  const tabs = isLeadman ? [...BASE_TABS, ...LEADMAN_TABS] : BASE_TABS;

  const fetchTasks = () => {
    axios.get(`${API}/tasks`).then(res => setTasks(res.data)).catch(() => {});
  };

  useEffect(() => {
    // Fetch live profile so is_leadman reflects DB state, not stale JWT
    axios.get(`${API}/me`).then(res => {
      const live = res.data.is_leadman === true || res.data.is_leadman === 't';
      setIsLeadman(live);
      localStorage.setItem("is_leadman", live ? "true" : "false");
    }).catch(() => {});

    fetchTasks();
    const iv = setInterval(fetchTasks, 4000);
    return () => clearInterval(iv);
  }, []);

  const activeTasks  = tasks.filter(t => t.status === "in_progress").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h1>{workerName ? `Welcome, ${workerName}` : "Worker Dashboard"}</h1>
          {isLeadman && (
            <span style={{
              background: "#7c3aed22", color: "#7c3aed",
              border: "1px solid #7c3aed44",
              borderRadius: "99px", padding: "3px 12px",
              fontSize: "11px", fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".06em",
            }}>
              Leadman
            </span>
          )}
        </div>
        <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
          {isLeadman
            ? "Manage your tasks, truck scheduling, and incident reports"
            : "Manage your pallet tasks and confirm deliveries via QR scan"}
        </p>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{
          background: activeTasks > 0 ? "#fef3c7" : "#f1f5f9",
          border: `1px solid ${activeTasks > 0 ? "#fde68a" : "var(--border)"}`,
          borderRadius: "8px", padding: "10px 16px",
          display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                         letterSpacing: ".05em", color: "var(--text-muted)" }}>In Progress</span>
          <span style={{ fontSize: "22px", fontWeight: 800,
                         color: activeTasks > 0 ? "#d97706" : "var(--text)" }}>{activeTasks}</span>
        </div>

        <div style={{
          background: "#f1f5f9", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "10px 16px",
          display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                         letterSpacing: ".05em", color: "var(--text-muted)" }}>Pending</span>
          <span style={{ fontSize: "22px", fontWeight: 800 }}>{pendingTasks}</span>
        </div>

        <div style={{
          background: "#f1f5f9", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "10px 16px",
          display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                         letterSpacing: ".05em", color: "var(--text-muted)" }}>Total Tasks</span>
          <span style={{ fontSize: "22px", fontWeight: 800 }}>{tasks.length}</span>
        </div>

        {scannedPallet && (
          <div style={{
            background: "#dbeafe", border: "1px solid #93c5fd",
            borderRadius: "8px", padding: "10px 16px",
            display: "flex", flexDirection: "column", gap: "2px",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                           letterSpacing: ".05em", color: "#1e40af" }}>Last Scanned</span>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#1e40af" }}>P-{scannedPallet}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "complete" && activeTasks > 0 && (
              <span style={{
                marginLeft: "6px", background: "#f59e0b", color: "#fff",
                borderRadius: "99px", padding: "1px 7px", fontSize: "11px", fontWeight: 700,
              }}>{activeTasks}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "tasks" && (
        <div className="card">
          <h2 style={{ marginBottom: "16px" }}>My Task Queue</h2>
          <TaskPanel externalTasks={tasks} onRefresh={fetchTasks} />
        </div>
      )}

      {activeTab === "complete" && (
        <DestinationScanner tasks={tasks} onTaskCompleted={fetchTasks} />
      )}

      {activeTab === "receive" && (
        <div>
          <PalletScanner onPalletScanned={id => { setScanned(id); fetchTasks(); }} />
        </div>
      )}

      {activeTab === "incident" && (
        <div className="card">
          <h2 style={{ marginBottom: "4px" }}>Incident Reporting</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
            Report accidents, near-misses, or safety hazards immediately.
          </p>
          <AccidentReport />
        </div>
      )}

      {activeTab === "trucks" && isLeadman && <LeadmanTrucks />}
    </div>
  );
}

export default WorkerDashboard;
