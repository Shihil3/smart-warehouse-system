import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

function PalletScanner({ onPalletScanned }) {
  const [lastResult, setLastResult] = useState(null); // { pallet, truck } | null
  const [error, setError]           = useState(null);
  const lastScanRef                 = useRef("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 240 });

    scanner.render(decodedText => {
      if (decodedText === lastScanRef.current) return;
      lastScanRef.current = decodedText;
      setError(null);

      axios.post(`${API}/scan`, { pallet_code: decodedText })
        .then(res => {
          setLastResult(res.data);
          if (onPalletScanned && res.data.pallet?.id) {
            onPalletScanned(res.data.pallet.id);
          }
        })
        .catch(err => {
          setError(err.response?.data?.error || "Invalid QR code or scan failed.");
          lastScanRef.current = ""; // allow re-scan after error
        });
    });

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>📷</span> Scan Pallet QR
      </h3>

      <div id="scanner" style={{ maxWidth: "400px" }} />

      {error && (
        <div className="msg-error" style={{ marginTop: "12px" }}>{error}</div>
      )}

      {lastResult && (
        <div className="msg-success" style={{ marginTop: "12px" }}>
          <strong>Pallet P-{lastResult.pallet?.id} registered.</strong>
          {lastResult.assigned_truck
            ? ` Assigned to Truck T-${lastResult.assigned_truck.id}.`
            : " No truck assigned yet — will be stored in rack."}
        </div>
      )}

      <p style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
        Expected format: <code>PALLET|product_id|destination_id|priority|weight|inbound_truck_id</code>
      </p>
    </div>
  );
}

export default PalletScanner;
