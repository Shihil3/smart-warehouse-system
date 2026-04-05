# Smart Warehouse System — Final Year Pitch

---

## The Speech

> *Deliver this standing, at a steady pace. Pause at the `[pause]` markers.*

---

Good morning/afternoon, everyone.

Imagine a warehouse receiving hundreds of pallets every single day. Workers are running around not knowing what to move, managers are shouting over radios, pallets are sitting in the wrong place, and trucks are leaving half-empty. This is the reality in most warehouses today — and it costs companies thousands of rupees every week in wasted time and misrouted goods.

`[pause]`

We built the **Smart Warehouse Management System** to solve exactly this.

Our system is a full-stack, real-time warehouse operations platform — built from the ground up as a final year project — that digitises and automates the entire flow of goods from the moment a truck arrives to the moment it departs.

`[pause]`

Here is how it works.

When an inbound truck arrives and a pallet is unloaded, a worker scans the pallet's QR code. In that single scan, our system makes a decision: does this pallet belong on an outbound truck right now — what we call **cross-docking** — or does it go into rack storage? If there is a matching outbound truck, our integrated **Python optimisation engine** sequences the cross-dock pallets in the most efficient order, minimising forklift travel distance. If not, it finds the rack with the most available space and assigns it there.

`[pause]`

The moment that decision is made, a **task is automatically generated and assigned to a worker** — no manager needed. The system distributes the workload evenly across available workers, always giving the next task to whoever has the lightest load at that moment.

`[pause]`

On the manager side, we have a full dashboard — live warehouse floor map, rack occupancy, KPIs, truck management, incident reports, and a task assignment panel where the manager can **reassign tasks, designate forklift operators, and monitor every pallet in the building in real time**.

Workers receive their tasks on a personal queue on their own device. They see exactly: which pallet, what product is on it, where to pick it up, and where to deliver it. One button to start, one button to complete — or they can scan the destination QR code for hands-free confirmation.

`[pause]`

Everything in the system updates in real time across all connected devices — no page refresh needed — using server-sent events. An accident report filed by a worker appears on the manager's screen within seconds.

`[pause]`

We built this using **Ruby and Sinatra** on the backend, **React and Vite** on the frontend, **Python and FastAPI** for the route optimisation engine, and **PostgreSQL** as the database. The system is designed to handle multiple concurrent workers, each on their own device, without any data conflicts.

`[pause]`

What makes this project meaningful is not just the technology — it is the **real problem it solves**. Warehouses are still running on whiteboards and radio calls. We believe a system like this, even at a small scale, can save hours of labour every single day.

Thank you. We are happy to give you a live demonstration now.

---

## Showcase Script — Step by Step

Run through this in order. Each step shows one complete feature.

---

### Before You Start

Make sure both terminals are running:
```
# Terminal 1 — Backend
cd backend && ruby app.rb

# Terminal 2 — Frontend
cd frontend && npm run dev
```
Open **two browser windows side by side** — one logged in as **manager**, one as **worker**.

---

### Step 1 — Show the Manager Dashboard

Log in as manager: `manager@warehouse.com / manager123`

**Say:** *"This is the manager's view. A live map of the entire warehouse floor showing every pallet's current location."*

- Point to the **stat cards** (Total Pallets, In Racks, At Staging, At Docks)
- Click **Rack Tracking** tab — show the occupancy bars
- Click **Truck Management** tab — show scheduled outbound trucks with destinations and deadlines

---

### Step 2 — Show the Worker Dashboard

In the second window, log in as worker: `worker@warehouse.com / worker123`

**Say:** *"This is what a worker sees on their device — their personal task queue, already pre-assigned by the system."*

- Show the **My Queue** tab with the pending task
- Point out: Pallet number, product name, Pick-up location → Delivery location
- Show the **"In Progress" badge** counter

---

### Step 3 — Start a Task (Live)

In the worker window:
- Click **Start** on a pending task
- Watch the button change to "Starting…" then the task flips to **In Progress**

Switch to the manager window → **Tasks tab**

**Say:** *"The manager can see in real time that this task is now in progress. The system auto-assigned it — but the manager can always override."*

- Click the **Assign Worker** dropdown on any pending task
- Show the forklift operators listed at the top in orange
- Assign it to a different worker

---

### Step 4 — Complete a Task via QR Scan

Back in the worker window:
- Click **Complete by QR Scan** tab
- Click **Scan Location QR** (or type a location code)

**Say:** *"In a real warehouse, the worker scans the QR code at the destination rack. The system confirms delivery and updates the pallet's location instantly."*

Alternatively, go back to **My Task Queue** and click **Complete** on the in-progress task.

---

### Step 5 — Receive a New Pallet (Full Flow Demo)

In the worker window → **Receive Pallet (QR)** tab

**Say:** *"Now watch what happens when a new pallet arrives."*

Scan or enter a pallet QR code (use the format: `PALLET|1|1|1|25|1`)

**Say:** *"The system instantly decides — cross-dock or storage — creates a task, and assigns it to the least-loaded worker. Zero manager input required."*

Switch to the manager window → **Tasks tab** — the new task appears, already assigned.

---

### Step 6 — Products and Inventory

Manager window → **Products tab**

**Say:** *"Every pallet is linked to a product. Managers can see the full product catalogue — SKU, category, weight, volume."*

Switch to **Inventory tab**

**Say:** *"The inventory view shows every pallet in storage — what product it is, which rack it is in, its priority, and lets the manager trigger a retrieval task with one click when a truck is ready."*

---

### Step 7 — Workers and Forklift Operators

Manager window → **Workers tab**

**Say:** *"The manager tracks every worker's productivity — tasks completed, average time per task, last active. They can promote workers to Leadman for truck scheduling, or designate them as forklift operators."*

- Click **🏗 Set Forklift Op.** on a worker card — show the badge appear
- Click a worker card to show their **task history**

---

### Step 8 — Incident Reporting (Real-Time)

Worker window → **Report Incident** tab
Fill in a quick accident report and submit.

**Say:** *"If a worker spots a safety hazard or near-miss, they report it instantly. The manager receives a live notification — no radio call needed."*

Switch to manager window → watch the **toast notification** appear in the top-right corner.

---

### Closing Statement

*"What you have just seen is a complete warehouse operations cycle — from truck arrival to rack storage to retrieval — automated, tracked, and visible to every stakeholder in real time. This is what modern warehouse management looks like."*

---

## Anticipated Questions

| Question | Answer |
|---|---|
| Why Sinatra instead of Rails? | Lightweight — we only need an API server, not a full MVC framework |
| How does the optimiser work? | It is a Python FastAPI microservice using a greedy sequencing algorithm based on pallet priority and truck departure deadlines |
| Can it scale to a real warehouse? | The architecture — separate API, frontend, and optimiser — is designed to scale each independently |
| How is real-time handled? | Server-Sent Events (SSE) — the backend pushes events to all connected clients without polling |
| What if the internet goes down? | The system is designed for a local network — all components run on-premises |
