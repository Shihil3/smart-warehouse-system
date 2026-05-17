"""
generate_qr_codes.py
Generates QR code PNG files for all pallets in the warehouse database.
Saves PNGs to backend/generated_qrs/
Updates pallets.qr_code field with the pipe-delimited QR content.

Usage:
    cd backend
    python scripts/generate_qr_codes.py
"""

import os
import sys
import json

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: qrcode or Pillow not installed.")
    print("Run: pip install qrcode[pil] Pillow")
    sys.exit(1)

# ── Config ─────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host":     "127.0.0.1",
    "port":     5432,
    "dbname":   "warehouse_db",
    "user":     "warehouse_user",
    "password": "warehouse_pass",
}

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR   = os.path.join(BACKEND_DIR, "generated_qrs")

# Priority labels for display
PRIORITY_LABELS = {1: "HIGH", 2: "MEDIUM", 3: "LOW"}

# ── Helpers ────────────────────────────────────────────────────────────────

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"  QR output folder: {OUTPUT_DIR}")


def connect_db():
    return psycopg2.connect(**DB_CONFIG)


def fetch_pallets(cur):
    cur.execute("""
        SELECT
            p.id,
            p.qr_code,
            p.weight,
            p.priority,
            p.status,
            p.inbound_truck_id,
            p.outbound_truck_id,
            pr.name        AS product_name,
            pr.sku         AS product_sku,
            pr.category    AS product_category,
            d.name         AS destination_name,
            d.region       AS destination_region,
            it.truck_number AS inbound_truck_number,
            ot.truck_number AS outbound_truck_number
        FROM pallets p
        LEFT JOIN products      pr ON pr.id = p.product_id
        LEFT JOIN destinations   d ON  d.id = p.destination_id
        LEFT JOIN inbound_trucks it ON it.id = p.inbound_truck_id
        LEFT JOIN outbound_trucks ot ON ot.id = p.outbound_truck_id
        ORDER BY p.id ASC
    """)
    return cur.fetchall(), [desc[0] for desc in cur.description]


def build_qr_content(row):
    """
    QR content embeds key pallet metadata as JSON for scanning.
    The scan endpoint also accepts the legacy pipe format:
        PALLET|product_id|destination_id|priority|weight|inbound_truck_id
    We embed richer JSON so the physical label is more useful.
    """
    return json.dumps({
        "pallet_id":       row["id"],
        "product":         row["product_name"] or "Unknown",
        "destination":     row["destination_name"] or "Unknown",
        "priority":        PRIORITY_LABELS.get(int(row["priority"] or 2), "MEDIUM"),
        "weight_kg":       float(row["weight"] or 0),
        "inbound_truck":   row["inbound_truck_number"] or "N/A",
        "outbound_truck":  row["outbound_truck_number"] or "Unassigned",
        "status":          row["status"] or "unknown",
    }, ensure_ascii=False)


def generate_qr_image(qr_content: str, pallet_id: int, product_name: str,
                      destination: str, priority: int, weight: float) -> Image.Image:
    """Generates a labeled QR code card as a PIL Image."""

    priority_label = PRIORITY_LABELS.get(int(priority or 2), "MEDIUM")
    priority_color = {"HIGH": "#d32f2f", "MEDIUM": "#f57c00", "LOW": "#388e3c"}.get(priority_label, "#333")

    # QR code
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=2,
    )
    qr.add_data(qr_content)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_w, qr_h = qr_img.size
    card_w = max(qr_w + 40, 380)
    card_h = qr_h + 160
    card = Image.new("RGB", (card_w, card_h), "white")
    draw = ImageDraw.Draw(card)

    # Header band
    draw.rectangle([0, 0, card_w, 44], fill="#1565c0")
    draw.text((14, 10), f"PALLET-{pallet_id:03d}", fill="white")

    # Priority badge
    badge_x = card_w - 110
    draw.rectangle([badge_x, 8, badge_x + 90, 36], fill=priority_color)
    draw.text((badge_x + 8, 12), f"◆ {priority_label}", fill="white")

    # QR image
    qr_x = (card_w - qr_w) // 2
    card.paste(qr_img, (qr_x, 50))

    # Info block
    y = qr_h + 58
    draw.line([10, y, card_w - 10, y], fill="#e0e0e0", width=1)
    y += 8

    product_short = (product_name or "Unknown")[:35]
    dest_short    = (destination or "Unknown")[:35]

    draw.text((14, y),      f"Product:  {product_short}", fill="#212121")
    draw.text((14, y + 22), f"Dest:     {dest_short}", fill="#212121")
    draw.text((14, y + 44), f"Weight:   {weight:.1f} kg", fill="#555555")

    # Footer
    draw.rectangle([0, card_h - 22, card_w, card_h], fill="#eceff1")
    draw.text((14, card_h - 17), "Smart Warehouse System", fill="#607d8b")

    return card


def generate_all(conn, cur):
    rows_raw, cols = fetch_pallets(cur)
    rows = [dict(zip(cols, row)) for row in rows_raw]

    if not rows:
        print("  No pallets found. Run reset_and_seed_demo.rb first.")
        return 0

    generated = 0
    for row in rows:
        pallet_id    = row["id"]
        product_name = row["product_name"] or "Unknown Product"
        destination  = row["destination_name"] or "Unknown"
        priority     = int(row["priority"] or 2)
        weight       = float(row["weight"] or 0)

        # Build QR content
        qr_content = build_qr_content(row)

        # Generate image
        try:
            img = generate_qr_image(qr_content, pallet_id, product_name, destination, priority, weight)
        except Exception as e:
            print(f"  ERROR generating QR for pallet {pallet_id}: {e}")
            continue

        # Save PNG
        filename = f"PALLET_{pallet_id:03d}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        img.save(filepath, "PNG", optimize=True)

        # Update qr_code field in DB with pipe format (for scan endpoint compatibility)
        # Legacy format: PALLET|product_id|destination_id|priority|weight|inbound_truck_id
        cur.execute("SELECT product_id, destination_id, inbound_truck_id FROM pallets WHERE id=%s", (pallet_id,))
        p = cur.fetchone()
        if p:
            product_id, destination_id, inbound_truck_id = p
            qr_db = f"PALLET|{product_id}|{destination_id}|{priority}|{weight}|{inbound_truck_id or ''}"
            cur.execute("UPDATE pallets SET qr_code=%s WHERE id=%s", (qr_db, pallet_id))

        generated += 1
        print(f"  [{generated:02d}/{len(rows)}] {filename} — {product_name[:30]}")

    conn.commit()
    return generated


def main():
    print("\n==============================================")
    print("  Smart Warehouse — QR Code Generator")
    print("==============================================\n")

    ensure_output_dir()

    print("Connecting to database...")
    try:
        conn = connect_db()
        cur  = conn.cursor()
    except Exception as e:
        print(f"ERROR: Cannot connect to PostgreSQL: {e}")
        print(f"Config: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
        sys.exit(1)

    print("Generating QR codes...\n")
    count = generate_all(conn, cur)

    cur.close()
    conn.close()

    print(f"\n==============================================")
    print(f"  Done! {count} QR code PNGs generated.")
    print(f"  Folder: {OUTPUT_DIR}")
    print(f"==============================================\n")


if __name__ == "__main__":
    main()
