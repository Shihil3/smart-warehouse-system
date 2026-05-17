# Smart Warehouse System — Demo Scenario Guide
## Presentation: May 19, 2026

---

## Pre-Demo Checklist

Run this **before** the presentation (takes ~30 seconds):

```
reset_demo.bat
start-backend.bat     (port 4567)
start-optimizer.bat   (port 8000)
start-frontend.bat    (port 5173)
```

Open browser: `http://localhost:5173`

---

## Login Credentials

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| Manager | manager@warehouse.com     | manager123  |
| Worker  | worker@warehouse.com      | worker123   |
| Leadman | worker3@warehouse.com     | worker123   |

---

## What the Demo Data Shows

### Warehouse State at Demo Start

| Status           | Count | Description |
|------------------|-------|-------------|
| Stored (Racks)   | 20    | Pallets in rack storage from overnight processing |
| In Transit       | 10    | Active cross-dock pallets assigned to outbound trucks |
| Staging          |  8    | Freshly arrived pallets waiting for routing |
| Pending Storage  |  4    | Overflow from delayed truck TN-44-DD-0004 |
| Delivered        |  8    | Yesterday's completed shipments (KPI history) |

---

## Suggested Presentation Flow

### Scene 1 — Dashboard Overview (2 min)
Log in as **Manager**.

Point out:
- **KPI panel**: 8 tasks completed, throughput chart showing 3 days of activity
- **Inventory breakdown**: 20 stored / 10 in_transit / 8 staging
- **5 scheduled outbound trucks** with different urgency windows
- **1 congestion alert** on Dock-1 (pre-loaded for demo)

**Talking point**: "The system gives the warehouse manager a real-time view of every pallet and truck."

---

### Scene 2 — Urgent Shipment in Progress (2 min)
Still as **Manager**, open **Truck Management**.

Point to **TN-OB-AA-0001 → Chennai Central Hub**:
- Departure deadline: **13:00 today** (4-hour window)
- 2 pallets already assigned (PLT-021, PLT-022)
- PLT-021 is **in_progress** — a worker is currently moving it

**Talking point**: "The system prioritises the Chennai truck because it has the earliest deadline. Cross-dock tasks are sequenced automatically."

---

### Scene 3 — Cross-Dock Sequencing (2 min)
Open **Task Panel** (log in as **Worker** in a second tab).

Show:
- PLT-021 task: status `in_progress`, source Staging-1 → Dock-1
- 9 other pending tasks queued in sequence order
- Task cards show product name, source rack/staging, destination dock

Switch back to **Manager** tab.
Click **Assign Task** on a pending task — reassign from worker2 to worker3.

**Talking point**: "The optimizer scores each pallet using priority, deadline urgency, distance, and congestion. Workers receive tasks in the optimal order."

---

### Scene 4 — New Pallet Arrival / QR Scan (3 min)
As **Manager**, go to **Pallet Scanner** (or Worker dashboard scanner).

Scan or manually enter a QR code from the printed QR cards (in `backend/generated_qrs/`).

Demo pallet QR string (copy-paste into scanner):
```
PALLET|1|1|1|18.5|1
```
(Product 1 = Laptop Units, Destination 1 = Chennai, Priority 1, 18.5kg, Inbound Truck 1)

Watch:
1. Pallet is created
2. System immediately assigns it to TN-OB-AA-0001 (Chennai, matching destination)
3. Optimizer re-runs, cross-dock task sequence updates
4. New task appears in worker's task list within seconds

**Talking point**: "Scan the QR on arrival, and the system instantly decides: cross-dock or store? It assigns the best outbound truck and adds the task to the worker queue."

---

### Scene 5 — Delayed Truck / Overflow Handling (2 min)
Go to **Inbound Trucks** list.

Point to **TN-44-DD-0004** (status: `pending`, arrival: 11:30):
- This truck is delayed — scheduled for late morning
- Its 4 pallets (PLT-047 to PLT-050) are `pending_storage`
- Storage tasks auto-generated to move them to available racks

**Talking point**: "When a truck arrives late or no outbound truck matches the destination, the system routes pallets to available rack storage automatically. Workers get storage tasks with rack assignments."

---

### Scene 6 — Congestion Alert (1 min)
In Manager dashboard, scroll to **Alerts** section.

Show: "Dock-1 approaching capacity — 3 trucks scheduled, recommend redirecting to Dock-2"

**Talking point**: "The congestion detector monitors dock assignment density in real time and alerts the manager before bottlenecks form."

---

### Scene 7 — Truck Departure / Manifest (2 min)
Go to outbound truck **TN-OB-BB-0002 → Coimbatore** (less urgent, good for a safe demo of departure).

Click **Depart Truck**:
- System marks all pallets as `delivered`
- Cancels any remaining pending tasks
- Generates a departure manifest with total weight, pallet list, timestamp

**Talking point**: "When the truck leaves, the system closes out the shipment, updates inventory, and stores the manifest for audit."

---

### Scene 8 — Worker Productivity / KPIs (1 min)
Back in Manager dashboard, open **KPI Charts**.

Point to:
- **Worker Productivity table**: Selvam Rajan — 3 tasks completed, avg 28 min/task
- **Throughput chart**: tasks completed per day over last 3 days
- **Avg dwell time**: pallets in the system on average

**Talking point**: "Every task gets timestamped. The system tracks who completed what, how fast, and which workers are most loaded."

---

## Key APIs to Show (if technical audience)

| Endpoint | Demo Value |
|---|---|
| `GET /pallets` | Full live inventory with location & status |
| `GET /outbound-trucks` | All trucks with load weight, pallet count |
| `POST /scan` | Pallet creation from QR |
| `GET /tasks` | Optimised task queue |
| `POST /tasks/:id/complete` | Complete a task, moves pallet |
| `GET /kpis` | Full KPI payload for dashboard |
| `POST /outbound-trucks/:id/depart` | Close shipment |
| `GET /stream` | SSE real-time event stream |

---

## QR Code Cards

Printed QR PNG cards are in: `backend/generated_qrs/`

Use `PALLET_001.png` through `PALLET_050.png` for physical scanning demo.

To print all cards for the physical demo, open `pallet-qr-codes.html` in a browser.

---

## If Something Goes Wrong

| Problem | Fix |
|---|---|
| Optimizer not responding | System degrades gracefully — cross-dock still works, tasks just use FIFO order |
| No pallets in staging | Run `reset_demo.bat` again |
| Task panel empty | Log in as worker, not manager |
| Pallet scan fails | Check QR format: `PALLET\|{product_id}\|{dest_id}\|{priority}\|{weight}\|{truck_id}` |
| KPI charts empty | Completed tasks need `created_at` within last 7 days — reset_demo handles this |
| Port conflict | Kill process on 4567/8000/5173 and restart |

---

## Reset Before Final Presentation

```
reset_demo.bat
```

This takes ~30 seconds and reloads all 50 pallets, 6 inbound trucks, 5 outbound trucks, 18 products, historical tasks, and events fresh.
