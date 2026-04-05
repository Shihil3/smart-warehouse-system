import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function getLoggedInUserId() {
  return localStorage.getItem("user_id") || null;
}

const STATUS_CONFIG = {
  pending:     { cls: "badge-gray",   label: "Pending"     },
  in_progress: { cls: "badge-yellow", label: "In Progress" },
  completed:   { cls: "badge-green",  label: "Completed"   },
};

function TaskCard({ task, onStart, onComplete, currentUserId }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  const st             = STATUS_CONFIG[task.status] || { cls: "badge-gray", label: task.status };
  const seq            = task.sequence_order;
  const assignedToOther = task.status === "pending" && task.worker_id &&
    String(task.worker_id) !== String(currentUserId);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await onStart(task.id);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to start task");
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    setBusy(true);
    setError(null);
    try {
      await onComplete(task.id);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to complete task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background:   "var(--bg-card)",
      border:       `1px solid ${task.status === "in_progress" ? "#fde68a" : assignedToOther ? "#e2e8f0" : "var(--border)"}`,
      borderLeft:   `4px solid ${task.status === "in_progress" ? "#f59e0b" : task.status === "completed" ? "#16a34a" : assignedToOther ? "#cbd5e1" : "#94a3b8"}`,
      borderRadius: "8px",
      padding:      "14px 16px",
      opacity:      assignedToOther ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Sequence badge */}
        <div style={{
          width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
          background: task.status === "completed" ? "#dcfce7" : task.status === "in_progress" ? "#fef3c7" : "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: "13px",
          color: task.status === "completed" ? "#16a34a" : task.status === "in_progress" ? "#d97706" : "#64748b",
        }}>
          {seq ?? "—"}
        </div>

        {/* Details */}
        <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "10px 24px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Pallet</div>
            <div style={{ fontWeight: 700 }}>P-{task.pallet_id}</div>
          </div>
          {task.product_name && (
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Product</div>
              <div style={{ fontWeight: 600 }}>{task.product_name}</div>
              {task.product_sku && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.product_sku}</div>}
            </div>
          )}
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
          {task.worker_name && (
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Assigned To</div>
              <div style={{ fontWeight: 600, fontSize: "13px" }}>{task.worker_name}</div>
            </div>
          )}
        </div>

        {/* Status + action */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span className={`badge ${st.cls}`}>{st.label}</span>

          {task.status === "pending" && !assignedToOther && (
            <button
              className="btn btn-primary"
              style={{ fontSize: "12px", padding: "6px 14px", minWidth: "72px" }}
              onClick={handleStart}
              disabled={busy}
            >
              {busy ? "Starting…" : "Start"}
            </button>
          )}

          {task.status === "pending" && assignedToOther && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
              Assigned to another
            </span>
          )}

          {task.status === "in_progress" && (
            <button
              className="btn btn-success"
              style={{ fontSize: "12px", padding: "6px 14px", minWidth: "88px" }}
              onClick={handleComplete}
              disabled={busy}
            >
              {busy ? "Saving…" : "Complete"}
            </button>
          )}
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <div style={{
          marginTop: "8px", padding: "6px 10px", borderRadius: "5px",
          background: "#fee2e2", color: "#991b1b", fontSize: "12px",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

function TaskPanel({ externalTasks, onRefresh }) {
  const [internalTasks,  setInternalTasks]  = useState([]);
  const [filter,         setFilter]         = useState("mine");
  // Optimistic overrides: { [taskId]: 'in_progress' | 'completed' }
  const [localOverrides, setLocalOverrides] = useState({});

  const currentUserId = getLoggedInUserId();
  const isControlled  = Array.isArray(externalTasks);

  // Merge server tasks with local optimistic overrides
  const rawTasks = isControlled ? externalTasks : internalTasks;
  const tasks    = rawTasks.map(t =>
    localOverrides[t.id] ? { ...t, status: localOverrides[t.id], worker_id: currentUserId } : t
  );

  const refresh = useCallback(() => {
    if (isControlled) { onRefresh?.(); return; }
    axios.get(`${API}/tasks`).then(res => setInternalTasks(res.data)).catch(() => {});
  }, [isControlled, onRefresh]);

  // Start: apply optimistic update immediately, then confirm with server
  const startTask = useCallback(async (id) => {
    setLocalOverrides(prev => ({ ...prev, [id]: "in_progress" }));
    setFilter("in_progress"); // jump to in_progress tab so worker sees it
    try {
      await axios.post(`${API}/tasks/${id}/start`);
      refresh();
      // Clear override once server confirms
      setLocalOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      // Rollback optimistic update on failure
      setLocalOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
      throw e; // re-throw so TaskCard shows the error
    }
  }, [refresh]);

  // Complete: same optimistic pattern
  const completeTask = useCallback(async (id) => {
    setLocalOverrides(prev => ({ ...prev, [id]: "completed" }));
    try {
      await axios.post(`${API}/tasks/${id}/complete`);
      refresh();
      setLocalOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      setLocalOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
      throw e;
    }
  }, [refresh]);

  useEffect(() => {
    if (isControlled) return;
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [refresh]);

  // "mine" = my pending (assigned to me or unassigned) + my in_progress + my completed
  const myTasks = tasks.filter(t => {
    if (t.status === "pending") {
      return !t.worker_id || String(t.worker_id) === String(currentUserId);
    }
    return !t.worker_id || String(t.worker_id) === String(currentUserId);
  });

  const viewTasks = filter === "mine" ? myTasks : tasks;
  const filtered  = filter === "mine" || filter === "all"
    ? viewTasks
    : viewTasks.filter(t => t.status === filter);

  const counts = {
    pending:     myTasks.filter(t => t.status === "pending").length,
    in_progress: myTasks.filter(t => t.status === "in_progress").length,
    completed:   myTasks.filter(t => t.status === "completed").length,
  };

  const assignedToMe = tasks.filter(t =>
    t.status === "pending" && String(t.worker_id) === String(currentUserId)
  ).length;

  return (
    <div>
      {assignedToMe > 0 && (
        <div className="msg-success" style={{ marginBottom: "12px" }}>
          {assignedToMe} task{assignedToMe !== 1 ? "s" : ""} pre-assigned to you — press Start when ready.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { key: "mine",        label: `My Queue (${myTasks.length})`        },
          { key: "in_progress", label: `In Progress (${counts.in_progress})` },
          { key: "pending",     label: `Pending (${counts.pending})`         },
          { key: "completed",   label: `Completed (${counts.completed})`     },
          { key: "all",         label: `All Tasks (${tasks.length})`         },
        ].map(f => (
          <button
            key={f.key}
            className={`tab-btn ${filter === f.key ? "active" : ""}`}
            style={{
              padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
              border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "in_progress" && counts.in_progress > 0 && (
              <span style={{
                marginLeft: "5px", background: "#f59e0b", color: "#fff",
                borderRadius: "99px", padding: "1px 6px", fontSize: "10px", fontWeight: 700,
              }}>{counts.in_progress}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          color: "var(--text-muted)", border: "2px dashed var(--border)", borderRadius: "10px",
        }}>
          {tasks.length === 0
            ? "No tasks in the system yet."
            : filter === "mine"
              ? "No tasks in your queue. Check 'All Tasks' to see everything."
              : `No ${filter.replace("_", " ")} tasks.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={startTask}
              onComplete={completeTask}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskPanel;
