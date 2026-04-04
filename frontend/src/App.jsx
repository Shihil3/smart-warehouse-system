import { useState } from "react";
import Login            from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import WorkerDashboard  from "./pages/WorkerDashboard";
import Navbar           from "./components/Navbar";

function App() {
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("name");
    return role ? { role, name } : null;
  });

  const handleLogout = () => {
    ["token", "role", "name", "user_id"].forEach(k => localStorage.removeItem(k));
    setUser(null);
  };

  if (!user) return <Login setUser={setUser} />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar role={user.role} name={user.name} onLogout={handleLogout} />
      {user.role === "manager" && <ManagerDashboard />}
      {user.role === "worker"  && <WorkerDashboard  workerName={user.name} />}
    </div>
  );
}

export default App;
