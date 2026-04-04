import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

/* Small component showing the active (in_progress) tasks */
function ActiveTasksHint({ tasks }) {
  const active = tasks.filter(t => t.status === "in_progress");

  if (active.length === 0) {
    return (
      <div style={{
        background: "#f8fafc", border: "1px dashed #cbd5e1",
        borderRadius: "8px", padding: "14px 16px",
        fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px",
      }}>
        No tasks currently in progress. Start a task from the Task Queue first.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".05em", color: "var(--text-muted)", marginBottom: "8px" }}>
        Active tasks — scan the destination QR to complete
      </p>
      {active.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "12px",
          background: "#fefce8", border: "1px solid #fde68a",
          borderLeft: "4px solid #f59e0b",
          borderRadius: "8px", padding: "10px 14px", marginBottom: "8px",
        }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "50%",
            background: "#f59e0b", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "12px", flexShrink: 0,
          }}>
            {t.sequence_order ?? "?"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>
              Pallet P-{t.pallet_id}
            </div>
            <div style={{ fontSize: "12px", color: "#92400e", marginTop: "2px" }}>
              Deliver to:{" "}
              <strong>{t.dest_label || `Location ${t.destination_location_id}`}</strong>
              {t.dest_type && <span> ({t.dest_type})</span>}
              {" — "}scan QR code <code style={{ background: "#fff8e1", padding: "1px 5px", borderRadius: "3px", fontSize: "11px" }}>
                LOC|{t.destination_location_id}
              </code>
            </div>
          </div>
          <span className="badge badge-yellow">In Progress</span>
        </div>
      ))}
    </div>
  );
}

/* Result banner after scan */
function ScanResult({ result }) {
  if (!result) return null;

  const isSuccess = result.type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px",
      background: isSuccess ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${isSuccess ? "#86efac" : "#fca5a5"}`,
      borderLeft: `4px solid ${isSuccess ? "#16a34a" : "#dc2626"}`,
      borderRadius: "8px", padding: "14px 16px", marginTop: "12px",
    }}>
      <span style={{ fontSize: "22px", flexShrink: 0 }}>
        {isSuccess ? "✅" : "❌"}
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: "13px",
                      color: isSuccess ? "#166534" : "#991b1b" }}>
          {isSuccess ? "Delivery Confirmed" : "Wrong Location"}
        </div>
        <div style={{ fontSize: "13px", marginTop: "3px",
                      color: isSuccess ? "#15803d" : "#b91c1c" }}>
          {result.message}
        </div>
        {result.expected_name && (
          <div style={{ fontSize: "12px", marginTop: "6px", color: "#64748b" }}>
            Expected destination:{" "}
            <strong>{result.expected_name}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function DestinationScanner({ tasks, onTaskCompleted }) {
  const [scanResult, setScanResult]   = useState(null);
  const [scanning, setScanning]       = useState(false);
  const lastScanRef                   = useRef("");
  const scannerRef                    = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("dest-scanner", { fps: 10, qrbox: 240 });
    scannerRef.current = scanner;

    scanner.render(async (decodedText) => {
      if (decodedText === lastScanRef.current) return;
      lastScanRef.current = decodedText;
      setScanning(true);
      setScanResult(null);

      try {
        const res = await axios.post(`${API}/scan-complete`, { location_code: decodedText });
        setScanResult({ type: "success", message: res.data.message });
        if (onTaskCompleted) onTaskCompleted();
      } catch (err) {
        const errData = err.response?.data || {};
        setScanResult({
          type:          "error",
          message:       errData.error || "Scan failed. Try again.",
          expected_name: errData.expected_name,
        });
        lastScanRef.current = ""; // allow retry
      } finally {
        setScanning(false);
      }
    });

    return () => { scanner.clear().catch(() => {}); };
  }, []);

  // Auto-dismiss success after 4 seconds and reset for next scan
  useEffect(() => {
    if (scanResult?.type === "success") {
      const t = setTimeout(() => {
        setScanResult(null);
        lastScanRef.current = "";
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [scanResult]);

  return (
    <div className="card">
      <h3 style={{ marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>📍</span> Complete Task by Scanning Destination
      </h3>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
        Move the pallet to its destination, then scan the QR code posted at that location.
      </p>

      <ActiveTasksHint tasks={tasks} />

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div id="dest-scanner" style={{ maxWidth: "380px" }} />
          {scanning && (
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>
              Verifying location…
            </p>
          )}
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <ScanResult result={scanResult} />

          <div style={{
            marginTop: "20px", background: "#f8fafc",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "14px 16px",
          }}>
            <p style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase",
                        letterSpacing: ".05em", color: "var(--text-muted)", marginBottom: "8px" }}>
              How it works
            </p>
            <ol style={{ paddingLeft: "18px", fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.8" }}>
              <li>Start a task in the Task Queue</li>
              <li>Physically move the pallet to the destination</li>
              <li>Scan the QR label posted at that location</li>
              <li>System validates and marks the task complete</li>
            </ol>
            <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
              Location QR format: <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "3px" }}>LOC|&#123;id&#125;</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DestinationScanner;
