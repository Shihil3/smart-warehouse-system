import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:4567";

const CATEGORY_COLORS = {
  electronics: "#2563eb",
  furniture:   "#7c3aed",
  food:        "#16a34a",
  clothing:    "#0891b2",
  machinery:   "#d97706",
  chemicals:   "#dc2626",
};

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category?.toLowerCase()] || "#64748b";
  return (
    <span style={{
      background: `${color}18`, color,
      borderRadius: "99px", padding: "2px 8px",
      fontSize: "11px", fontWeight: 700,
      textTransform: "capitalize",
    }}>
      {category || "—"}
    </span>
  );
}

function AddProductForm({ onAdded }) {
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ sku: "", name: "", category: "", weight: "", volume: "" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const reset = () => { setForm({ sku: "", name: "", category: "", weight: "", volume: "" }); setErr(null); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await axios.post(`${API}/products`, {
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        volume: form.volume ? parseFloat(form.volume) : null,
      });
      reset();
      setOpen(false);
      onAdded();
    } catch (ex) {
      setErr(ex.response?.data?.error || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => setOpen(true)}>
        + Add Product
      </button>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "10px", padding: "20px 24px", marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>Add New Product</h3>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setOpen(false); reset(); }}>
          Cancel
        </button>
      </div>

      {err && <div className="msg-error" style={{ marginBottom: "14px" }}>{err}</div>}

      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div className="form-group">
            <label className="form-label">SKU *</label>
            <input className="input" value={form.sku} onChange={e => set("sku", e.target.value)}
              placeholder="e.g. ELEC-001" required />
          </div>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="input" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. TV 55 inch" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">— Select —</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="food">Food</option>
              <option value="clothing">Clothing</option>
              <option value="machinery">Machinery</option>
              <option value="chemicals">Chemicals</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input className="input" type="number" step="0.1" min="0" value={form.weight}
              onChange={e => set("weight", e.target.value)} placeholder="e.g. 25.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Volume (m³)</label>
            <input className="input" type="number" step="0.01" min="0" value={form.volume}
              onChange={e => set("volume", e.target.value)} placeholder="e.g. 0.5" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  const load = () => {
    setLoading(true);
    axios.get(`${API}/products`)
      .then(res => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading products…</p>;

  return (
    <div>
      <AddProductForm onAdded={load} />

      {/* Search + count */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ maxWidth: "280px" }}
          placeholder="Search by name, SKU, or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: "10px", color: "var(--text-muted)" }}>
          {products.length === 0
            ? <>No products yet. Add one using the button above.</>
            : <>No products matching "{search}".</>}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Weight</th>
              <th>Volume</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "12px" }}>{p.sku || "—"}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><CategoryBadge category={p.category} /></td>
                <td>{p.weight ? `${p.weight} kg` : "—"}</td>
                <td>{p.volume ? `${p.volume} m³` : "—"}</td>
                <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProductManagement;
