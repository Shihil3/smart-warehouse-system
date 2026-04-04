import { useState, useCallback } from "react";

/* ── Global imperative API ────────────────────────────────────────────────
   Usage anywhere in the app:
     import { showToast } from "./components/Toast";
     showToast("Pallet moved", "success");
     showToast("Accident reported!", "danger", 8000);
   Types: "info" | "success" | "warning" | "danger"
──────────────────────────────────────────────────────────────────────────── */
let _addToast = null;

export function showToast(message, type = "info", duration = 5000) {
  if (_addToast) _addToast({ message, type, duration, id: Date.now() + Math.random() });
}

const STYLES = {
  info:    { bg: "#dbeafe", border: "#93c5fd", text: "#1e40af",  icon: "ℹ" },
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534",  icon: "✓" },
  warning: { bg: "#fef3c7", border: "#fde68a", text: "#92400e",  icon: "⚠" },
  danger:  { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b",  icon: "✕" },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Register the global adder once
  _addToast = useCallback((toast) => {
    setToasts(prev => [toast, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, toast.duration);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position:      "fixed",
      top:           "68px",
      right:         "16px",
      zIndex:        9999,
      display:       "flex",
      flexDirection: "column",
      gap:           "8px",
      maxWidth:      "380px",
      width:         "calc(100vw - 32px)",
    }}>
      {toasts.map(t => {
        const s = STYLES[t.type] || STYLES.info;
        return (
          <div key={t.id} style={{
            background:   s.bg,
            border:       `1px solid ${s.border}`,
            borderRadius: "8px",
            padding:      "12px 14px",
            display:      "flex",
            alignItems:   "flex-start",
            gap:          "10px",
            boxShadow:    "0 4px 16px rgba(0,0,0,.14)",
            animation:    "toast-in .2s ease",
          }}>
            <span style={{ fontSize: "15px", color: s.text, fontWeight: 700, flexShrink: 0, lineHeight: 1.4 }}>
              {s.icon}
            </span>
            <span style={{ fontSize: "13px", color: s.text, lineHeight: 1.45, flex: 1 }}>
              {t.message}
            </span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{
                marginLeft: "auto", background: "none", border: "none",
                cursor: "pointer", color: s.text, fontSize: "16px",
                fontWeight: 700, flexShrink: 0, lineHeight: 1, padding: "0 2px",
              }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
