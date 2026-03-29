import TaskPanel from "../components/TaskPanel";
import PalletScanner from "../components/PalletScanner";

function WorkerDashboard({ onLogout }) {

  return (
    <div>

      <div className="flex justify-between items-center mb-4">
        <h1>Worker Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      <PalletScanner />

      <TaskPanel />

    </div>
  );

}

export default WorkerDashboard;
