import { useState } from "react";
import axios from "axios";

function Login({ setUser }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4567/login", { email, password });
      localStorage.setItem("token",      res.data.token);
      localStorage.setItem("role",       res.data.role);
      localStorage.setItem("name",       res.data.name    || email);
      localStorage.setItem("user_id",    res.data.user_id || "");
      localStorage.setItem("is_leadman", res.data.is_leadman ? "true" : "false");
      setUser({ role: res.data.role, name: res.data.name, isLeadman: !!res.data.is_leadman });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:       "100vh",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      background:      "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      padding:         "20px",
    }}>
      <div style={{
        width:         "100%",
        maxWidth:      "380px",
        background:    "#fff",
        borderRadius:  "14px",
        boxShadow:     "0 20px 60px rgba(0,0,0,.35)",
        overflow:      "hidden",
      }}>
        {/* Header */}
        <div style={{
          background:  "#0f172a",
          padding:     "28px 32px 24px",
          textAlign:   "center",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏭</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "18px", letterSpacing: ".02em" }}>
            Smart Warehouse
          </div>
          <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
            Management System
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ padding: "28px 32px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "16px", color: "#1e293b" }}>Sign in to your account</h2>

          {error && <div className="msg-error" style={{ marginBottom: "16px" }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label className="form-label">Email address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@warehouse.com"
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "14px" }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{
          borderTop:   "1px solid #f1f5f9",
          padding:     "12px 32px",
          textAlign:   "center",
          fontSize:    "12px",
          color:       "#94a3b8",
        }}>
          Smart Warehouse v1.0 · Cross-Dock &amp; Inventory
        </div>
      </div>
    </div>
  );
}

export default Login;
