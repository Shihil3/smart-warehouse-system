import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const STATUS_CFG = {
  pending:     { cls: "badge-gray",   label: "Pending"     },
  in_progress: { cls: "badge-yellow", label: "In Progress" },
  completed:   { cls: "badge-green",  label: "Completed"   },
};

function AssignDropdown({ task, workers, onAssigned }) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState(null);

  const assign = async (workerId) => {
    setSaving(true);
    setErr(null);
    try {
      await axios.post(`${API}/tasks/${task.id}/assign`, { worker_id: workerId });
      setOpen(false);
      onAssigned();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  const currentWorker = task.worker_id
    ? workers.find(w => String(w.id) === String(task.worker_id))
    : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-primary"
        style={{ fontSize: "12px", padding: "5px 12px" }}
        onClick={() => setOpen(v => !v)}
        disabled={saving}
      >
        {saving ? "Saving…" : currentWorker ? `↑ ${currentWorker.name.split(" ")[0]}` : "Assign Worker"}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,.15)",
          zIndex: 100, minWidth: "220px", overflow: "hidden",
        }}>
          {err && (
            <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--danger)", borderBottom: "1px solid var(--border)" }}>
              {err}
            </div>
          )}

          {/* Unassign option */}
          {task.worker_id && (
            <div
              style={{
                padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                color: "var(--text-muted)", borderBottom: "1px solid var(--border)",
              }}
              onClick={() => assign(null)}
            >
              Remove assignment
            </div>
          )}

          {/* Forklift operators first */}
          {workers.filter(w => w.is_forklift_operator === true || w.is_forklift_operator === "t").length > 0 && (
            <div style={{ padding: "6px 12px 2px", fontSize: "10px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Forklift Operators
            </div>
          )}
          {workers
            .filter(w => w.is_forklift_operator === true || w.is_forklift_operator === "t")
            .map(w => (
              <WorkerOption key={w.id} worker={w} task={task} onSelect={assign} />
            ))
          }

          {/* Other workers */}
          {workers.filter(w => !(w.is_forklift_operator === true || w.is_forklift_operator === "t")).length > 0 && (
            <div style={{ padding: "6px 12px 2px", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Other Workers
            </div>
          )}
          {workers
            .filter(w => !(w.is_forklift_operator === true || w.is_forklift_operator === "t"))
            .map(w => (
              <WorkerOption key={w.id} worker={w} task={task} onSelect={assign} />
            ))
          }

          {workers.length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-muted)" }}>
              No workers available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkerOption({ worker, task, onSelect }) {
  const isAssigned = String(task.worker_id) === String(worker.id);
  const isFork = worker.is_forklift_operator === true || worker.is_forklift_operator === "t";
  return (
    <div
      onClick={() => onSelect(worker.id)}
      style={{
        padding: "9px 14px", cursor: "pointer", fontSize: "13px",
        background: isAssigned ? "rgba(37,99,235,.08)" : "transparent",
        display: "flex", alignItems: "center", gap: "8px",
        borderBottom: "1px solid var(--border)",
        transition: "background .1s",
      }}
      onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.background = "var(--bg)"; }}
      onMouseLeave={e => { if (!isAssigned) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: "26px", height: "26px", borderRadius: "50%",
        background: isFork ? "#d97706" : "#2563eb",
        color: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "11px", fontWeight: 800, flexShrink: 0,
      }}>
        {worker.name ? worker.name[0].toUpperCase() : "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: isAssigned ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {worker.name}
          {isFork && <span style={{ marginLeft: "6px", fontSize: "10px", color: "#d97706" }}>🏗 Forklift</span>}
        </div>
        {worker.active_tasks > 0 && (
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{worker.active_tasks} active task(s)</div>
        )}
      </div>
      {isAssigned && <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>✓ Assigned</span>}
    </div>
  );
}

function TaskRow({ task, workers, onRefresh }) {
  const st = STATUS_CFG[task.status] || { cls: "badge-gray", label: task.status };

  return (
    <tr>
      <td style={{ fontWeight: 700, fontSize: "13px" }}>#{task.id}</td>
      <td style={{ fontWeight: 600 }}>P-{task.pallet_id}</td>
      <td>
        {task.product_name
          ? <><div style={{ fontWeight: 600 }}>{task.product_name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.product_sku}</div></>
          : <span style={{ color: "var(--text-muted)" }}>—</span>}
      </td>
      <td>
        <div style={{ fontWeight: 600 }}>{task.source_label || `Loc ${task.source_location_id}`}</div>
        {task.source_type && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.source_type}</div>}
      </td>
      <td>
        <div style={{ fontWeight: 600 }}>{task.dest_label || `Loc ${task.destination_location_id}`}</div>
        {task.dest_type && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.dest_type}</div>}
      </td>
      <td>{task.truck_id ? `T-${task.truck_id}` : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
      <td>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </td>
      <td>
        {task.worker_name
          ? <div>
              <div style={{ fontWeight: 600, fontSize: "13px" }}>{task.worker_name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{task.status === "pending" ? "Pre-assigned" : "Working"}</div>
            </div>
          : <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Unassigned</span>
        }
      </td>
      <td>
        {task.status === "pending" && (
          <AssignDropdown task={task} workers={workers} onAssigned={onRefresh} />
        )}
      </td>
    </tr>
  );
}

function TaskAssignment() {
  const [tasks,        setTasks]        = useState([]);
  const [workers,      setWorkers]      = useState([]);
  const [filter,       setFilter]       = useState("pending");
  const [initialLoad,  setInitialLoad]  = useState(true);

  const load = (isBackground = false) => {
    Promise.all([
      axios.get(`${API}/tasks`),
      axios.get(`${API}/workers`),
    ]).then(([tRes, wRes]) => {
      setTasks(tRes.data);
      setWorkers(wRes.data);
    }).catch(() => {})
      .finally(() => { if (!isBackground) setInitialLoad(false); });
  };

  useEffect(() => {
    load(false);
    const iv = setInterval(() => load(true), 5000);
    return () => clearInterval(iv);
  }, []);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    pending:     tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed:   tasks.filter(t => t.status === "completed").length,
  };

  const unassignedPending = tasks.filter(t => t.status === "pending" && !t.worker_id).length;

  if (initialLoad) return <p style={{ color: "var(--text-muted)" }}>Loading tasks…</p>;

  return (
    <div>
      {/* Summary bar */}
      {unassignedPending > 0 && (
        <div className="msg-warning" style={{ marginBottom: "16px" }}>
          {unassignedPending} pending task{unassignedPending !== 1 ? "s" : ""} have no assigned worker.
          Use the "Assign Worker" button to pre-assign them.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { key: "all",         label: `All (${tasks.length})`                },
          { key: "pending",     label: `Pending (${counts.pending})`          },
          { key: "in_progress", label: `In Progress (${counts.in_progress})`  },
          { key: "completed",   label: `Completed (${counts.completed})`      },
        ].map(f => (
          <button
            key={f.key}
            className={`tab-btn ${filter === f.key ? "active" : ""}`}
            style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12px",
              border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)" }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button className="btn btn-ghost" style={{ fontSize: "12px", marginLeft: "auto" }} onClick={load}>
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: "10px", color: "var(--text-muted)" }}>
          No {filter.replace("_", " ")} tasks.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pallet</th>
                <th>Product</th>
                <th>From</th>
                <th>To</th>
                <th>Truck</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <TaskRow key={t.id} task={t} workers={workers} onRefresh={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
        Auto-refreshes every 5s · Forklift operators are highlighted in the assignment dropdown
      </p>
    </div>
  );
}

export default TaskAssignment;
