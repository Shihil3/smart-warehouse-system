import { useState } from "react";
import Login            from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import WorkerDashboard  from "./pages/WorkerDashboard";
import Navbar           from "./components/Navbar";
import { ToastContainer, showToast } from "./components/Toast";
import { useSSE } from "./hooks/useSSE";

/* ── Inner component so hooks run only when the user is logged in ─────── */
function AppContent({ user, onLogout }) {
  const [unread, setUnread] = useState(0);

  useSSE((type, data) => {
    if (type === "accident_report") {
      const sev = (data.severity || "").toUpperCase();
      const isUrgent = data.severity === "critical" || data.severity === "high";
      showToast(
        `Accident Report [${sev}]: ${data.title}`,
        isUrgent ? "danger" : "warning",
        8000,
      );
      if (user.role === "manager") setUnread(n => n + 1);
    }

    if (type === "accident_update" && data.status === "resolved") {
      showToast(`Resolved: ${data.title}`, "success", 4000);
    }

    if (type === "task_event" && data.type === "completed") {
      showToast(`Task #${data.task_id} completed`, "success", 3000);
    }

    if (type === "warehouse_event") {
      if (data.event_type === "PALLET_MOVED") {
        showToast(data.notes || "Pallet moved", "info", 3000);
      }
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar
        role={user.role}
        name={user.name}
        onLogout={onLogout}
        unread={unread}
        onClearUnread={() => setUnread(0)}
      />
      {user.role === "manager" && <ManagerDashboard />}
      {user.role === "worker"  && <WorkerDashboard workerName={user.name} isLeadman={user.isLeadman} />}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("name");
    const isLeadman = localStorage.getItem("is_leadman") === "true";
    return role ? { role, name, isLeadman } : null;
  });

  const handleLogout = () => {
    ["token", "role", "name", "user_id", "is_leadman"].forEach(k => localStorage.removeItem(k));
    setUser(null);
  };

  if (!user) return <Login setUser={setUser} />;

  return (
    <>
      <AppContent user={user} onLogout={handleLogout} />
      <ToastContainer />
    </>
  );
}

export default App;
