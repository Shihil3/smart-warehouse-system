function Navbar({ role, name, onLogout }) {
  return (
    <nav style={{
      background:    "var(--nav-bg)",
      color:         "var(--nav-text)",
      padding:       "0 24px",
      height:        "56px",
      display:       "flex",
      alignItems:    "center",
      justifyContent:"space-between",
      position:      "sticky",
      top:           0,
      zIndex:        100,
      boxShadow:     "0 1px 3px rgba(0,0,0,.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "20px" }}>🏭</span>
        <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: ".02em" }}>
          Smart Warehouse
        </span>
        {name && (
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "4px" }}>
            {name}
          </span>
        )}
        <span style={{
          background: "rgba(255,255,255,.1)",
          padding:    "2px 10px",
          borderRadius: "99px",
          fontSize:   "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginLeft: "8px",
        }}>
          {role}
        </span>
      </div>

      <button
        onClick={onLogout}
        style={{
          background:  "rgba(255,255,255,.08)",
          color:       "var(--nav-text)",
          border:      "1px solid rgba(255,255,255,.15)",
          borderRadius:"6px",
          padding:     "6px 14px",
          fontSize:    "13px",
          fontWeight:  600,
          cursor:      "pointer",
          transition:  "background .15s",
        }}
        onMouseEnter={e => e.target.style.background = "rgba(255,255,255,.15)"}
        onMouseLeave={e => e.target.style.background = "rgba(255,255,255,.08)"}
      >
        Sign out
      </button>
    </nav>
  );
}

export default Navbar;
