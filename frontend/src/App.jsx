import { useState } from "react";
import Login from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";

function App() {

  const [user, setUser] = useState(
    localStorage.getItem("role")
      ? { role: localStorage.getItem("role") }
      : null
  );
  const [scannedPallet, setScannedPallet] = useState(null);

  if (!user) {
    return <Login setUser={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  if (user.role === "manager") {
    return <ManagerDashboard onLogout={handleLogout} />;
  }

  if (user.role === "worker") {
    return <WorkerDashboard onLogout={handleLogout} />;
  }

}

export default App;