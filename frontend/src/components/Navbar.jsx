function Navbar({ role, name, onLogout, unread = 0, onClearUnread }) {
  return (
    <nav style={{
      background:     "var(--nav-bg)",
      color:          "var(--nav-text)",
      padding:        "0 24px",
      height:         "56px",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      position:       "sticky",
      top:            0,
      zIndex:         100,
      boxShadow:      "0 1px 3px rgba(0,0,0,.3)",
    }}>
      {/* ── Left: brand + user info ── */}
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
          background:     "rgba(255,255,255,.1)",
          padding:        "2px 10px",
          borderRadius:   "99px",
          fontSize:       "11px",
          fontWeight:     600,
          textTransform:  "uppercase",
          letterSpacing:  ".06em",
          marginLeft:     "8px",
        }}>
          {role}
        </span>
      </div>

      {/* ── Right: notification bell + sign out ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Bell — only shown when there are unread notifications */}
        <button
          onClick={onClearUnread}
          title={unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "No new notifications"}
          style={{
            position:       "relative",
            background:     unread > 0 ? "rgba(220,38,38,.2)" : "rgba(255,255,255,.07)",
            border:         `1px solid ${unread > 0 ? "rgba(220,38,38,.5)" : "rgba(255,255,255,.15)"}`,
            borderRadius:   "6px",
            width:          "36px",
            height:         "36px",
            color:          unread > 0 ? "#fca5a5" : "var(--nav-text)",
            cursor:         "pointer",
            fontSize:       "15px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            transition:     "background .15s, border-color .15s",
          }}
        >
          🔔
          {unread > 0 && (
            <span style={{
              position:       "absolute",
              top:            "-5px",
              right:          "-5px",
              background:     "#dc2626",
              color:          "#fff",
              borderRadius:   "99px",
              minWidth:       "18px",
              height:         "18px",
              fontSize:       "10px",
              fontWeight:     800,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              padding:        "0 4px",
            }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <button
          onClick={onLogout}
          style={{
            background:   "rgba(255,255,255,.08)",
            color:        "var(--nav-text)",
            border:       "1px solid rgba(255,255,255,.15)",
            borderRadius: "6px",
            padding:      "6px 14px",
            fontSize:     "13px",
            fontWeight:   600,
            cursor:       "pointer",
            transition:   "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
