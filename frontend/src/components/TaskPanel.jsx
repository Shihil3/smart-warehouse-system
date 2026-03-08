import { useEffect, useState } from "react";
import axios from "axios";

function TaskPanel() {

  const [tasks, setTasks] = useState([]);

  const fetchTasks = () => {
    axios.get("http://localhost:4567/tasks")
      .then(res => setTasks(res.data))
      .catch(err => console.error(err));
  };

  const startTask = (id) => {
    axios.post(`http://localhost:4567/tasks/${id}/start`)
      .then(fetchTasks);
  };

  const completeTask = (id) => {
    axios.post(`http://localhost:4567/tasks/${id}/complete`)
      .then(fetchTasks);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{marginTop:"30px"}}>

      <h2>Worker Tasks</h2>

      {tasks.length === 0 && <p>No tasks available</p>}

      {tasks.map(task => (
        <div key={task.id} style={{
          border:"1px solid gray",
          padding:"10px",
          marginBottom:"10px"
        }}>

          <div>
            <strong>Pallet:</strong> {task.pallet_id}
          </div>

          <div>
            <strong>Truck:</strong> {task.truck_id}
          </div>

          <div>
            <strong>Status:</strong> {task.status}
          </div>

          {task.status === "pending" &&
            <button onClick={() => startTask(task.id)}>
              Start
            </button>
          }

          {task.status === "in_progress" &&
            <button onClick={() => completeTask(task.id)}>
              Complete
            </button>
          }

        </div>
      ))}

    </div>
  );
}

export default TaskPanel;
