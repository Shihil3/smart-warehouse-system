import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const STATUS_CONFIG = {
  pending:     { cls: "badge-gray",   label: "Pending"     },
  in_progress: { cls: "badge-yellow", label: "In Progress" },
  completed:   { cls: "badge-green",  label: "Completed"   },
};

function TaskCard({ task, onStart, onComplete }) {
  const st  = STATUS_CONFIG[task.status] || { cls: "badge-gray", label: task.status };
  const seq = task.sequence_order;

  return (
    <div style={{
      background:    "var(--bg-card)",
      border:        `1px solid ${task.status === "in_progress" ? "#fde68a" : "var(--border)"}`,
      borderLeft:    `4px solid ${task.status === "in_progress" ? "#f59e0b" : task.status === "completed" ? "#16a34a" : "#94a3b8"}`,
      borderRadius:  "8px",
      padding:       "14px 16px",
      display:       "flex",
      alignItems:    "center",
      gap:           "16px",
    }}>
      {/* Sequence number */}
      <div style={{
        width:         "34px",
        height:        "34px",
        borderRadius:  "50%",
        background:    task.status === "completed" ? "#dcfce7" : task.status === "in_progress" ? "#fef3c7" : "#f1f5f9",
        display:       "flex",
        alignItems:    "center",
        justifyContent:"center",
        fontWeight:    800,
        fontSize:      "13px",
        color:         task.status === "completed" ? "#16a34a" : task.status === "in_progress" ? "#d97706" : "#64748b",
        flexShrink:    0,
      }}>
        {seq ?? "—"}
      </div>

      {/* Details */}
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "10px 24px", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Pallet</div>
          <div style={{ fontWeight: 700 }}>P-{task.pallet_id}</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>From</div>
          <div style={{ fontWeight: 600 }}>{task.source_label || `Loc ${task.source_location_id ?? "—"}`}</div>
          {task.source_type && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.source_type}</div>}
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Deliver to</div>
          <div style={{ fontWeight: 700, color: task.status === "in_progress" ? "#d97706" : "var(--text)" }}>
            {task.dest_label || `Loc ${task.destination_location_id ?? "—"}`}
          </div>
          {task.dest_type && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.dest_type}</div>}
        </div>
        {task.truck_id && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Truck</div>
            <div style={{ fontWeight: 600 }}>T-{task.truck_id}</div>
          </div>
        )}
      </div>

      {/* Status + action */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <span className={`badge ${st.cls}`}>{st.label}</span>
        {task.status === "pending" && (
          <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => onStart(task.id)}>
            Start
          </button>
        )}
        {task.status === "in_progress" && (
          <button className="btn btn-success" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => onComplete(task.id)}>
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

// If externalTasks is provided, TaskPanel uses that data and calls onRefresh
// instead of managing its own polling. This avoids duplicate fetches when
// WorkerDashboard already owns the tasks state.
function TaskPanel({ externalTasks, onRefresh }) {
  const [internalTasks, setInternalTasks] = useState([]);
  const [filter, setFilter]               = useState("all");

  const isControlled = Array.isArray(externalTasks);
  const tasks        = isControlled ? externalTasks : internalTasks;

  const refresh = () => {
    if (isControlled) { onRefresh?.(); return; }
    axios.get(`${API}/tasks`).then(res => setInternalTasks(res.data)).catch(() => {});
  };

  const startTask    = id => axios.post(`${API}/tasks/${id}/start`).then(refresh);
  const completeTask = id => axios.post(`${API}/tasks/${id}/complete`).then(refresh);

  useEffect(() => {
    if (isControlled) return; // parent owns polling
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, []);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    pending:     tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed:   tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { key: "all",         label: `All (${tasks.length})` },
          { key: "pending",     label: `Pending (${counts.pending})` },
          { key: "in_progress", label: `In Progress (${counts.in_progress})` },
          { key: "completed",   label: `Completed (${counts.completed})` },
        ].map(f => (
          <button
            key={f.key}
            className={`tab-btn ${filter === f.key ? "active" : ""}`}
            style={{ padding: "6px 14px", borderRadius: "6px", border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)", fontSize: "12px" }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          color: "var(--text-muted)", border: "2px dashed var(--border)", borderRadius: "10px",
        }}>
          {tasks.length === 0 ? "No tasks assigned yet." : `No ${filter.replace("_"," ")} tasks.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={startTask}
              onComplete={completeTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskPanel;
