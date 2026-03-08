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

  if (user.role === "manager") {
    return <ManagerDashboard />;
  }

  if (user.role === "worker") {
    return <WorkerDashboard />;
  }

}

export default App;