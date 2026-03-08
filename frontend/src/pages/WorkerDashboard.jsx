import TaskPanel from "../components/TaskPanel";
import PalletScanner from "../components/PalletScanner";

function WorkerDashboard() {

  return (
    <div>

      <h1>Worker Dashboard</h1>

      <PalletScanner />

      <TaskPanel />

    </div>
  );

}

export default WorkerDashboard;
