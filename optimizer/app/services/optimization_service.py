import math
from datetime import datetime, timezone


# ── Helpers ────────────────────────────────────────────────────────────────

def get_location(locations, loc_id):
    return next(
        (l for l in locations if str(l["id"]) == str(loc_id)),
        None
    )


def euclidean(loc1, loc2):
    try:
        x1, y1 = float(loc1["x_coordinate"]), float(loc1["y_coordinate"])
        x2, y2 = float(loc2["x_coordinate"]), float(loc2["y_coordinate"])
        return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
    except (TypeError, ValueError):
        return 1.0


def parse_utc(dt_str):
    """Parse ISO timestamp to UTC-aware datetime. Returns None on failure."""
    if not dt_str:
        return None
    try:
        # Handle both '+00:00' and 'Z' suffixes, and naive timestamps
        s = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, AttributeError):
        return None


def now_utc():
    return datetime.now(timezone.utc)


# ── Scoring weights ─────────────────────────────────────────────────────────
# Tune these constants to adjust relative importance of each factor.

W_PRIORITY    = 5.0   # base weight for priority 1 pallet
W_DISTANCE    = 0.4   # penalty per unit of Euclidean distance
W_CONGESTION  = 0.5   # penalty per extra pallet already queued at same dock
W_GROUPING    = 0.3   # small bonus when batching pallets to the same dock
AGING_RATE    = 0.25  # priority bonus per hour spent waiting
AGING_CAP     = 4.0   # maximum aging bonus (prevents runaway scores)


def deadline_bonus(truck):
    """
    Returns an urgency bonus based on how soon the truck departs.
    Overdue trucks get the highest bonus to flush them first.
    """
    departure = truck.get("departure_deadline")
    dt = parse_utc(departure)
    if dt is None:
        return 0.0

    hours_left = (dt - now_utc()).total_seconds() / 3600.0

    if hours_left <= 0:
        return 10.0   # truck is overdue — highest urgency
    elif hours_left <= 1:
        return 7.0
    elif hours_left <= 3:
        return 4.0
    elif hours_left <= 8:
        return 2.0
    elif hours_left <= 24:
        return 0.8
    else:
        return 0.0


def aging_bonus(pallet):
    """
    Returns a small bonus that grows the longer a pallet has been waiting.
    Prevents low-priority pallets from being starved indefinitely.
    """
    created = parse_utc(pallet.get("created_at"))
    if created is None:
        return 0.0

    hours_waiting = max(0.0, (now_utc() - created).total_seconds() / 3600.0)
    return min(AGING_CAP, hours_waiting * AGING_RATE)


# ── Main sequencing function ────────────────────────────────────────────────

def optimize_sequence(pallets, trucks, locations):
    """
    Scores each pallet and returns a sorted sequence.

    Score = priority_score
           + deadline_bonus      (how urgently the truck needs to leave)
           + aging_bonus         (how long the pallet has been waiting)
           + grouping_bonus      (batching pallets to the same dock)
           - distance_penalty    (how far the pallet is from the dock)
           - congestion_penalty  (how many pallets are already queued to same dock)
    """
    dock_load    = {}   # dock_id → number of pallets already scored for that dock
    pallet_scores = []

    for pallet in pallets:
        truck = next(
            (t for t in trucks if str(t["id"]) == str(pallet.get("outbound_truck_id"))),
            None
        )
        if not truck:
            continue

        dock_id  = truck.get("dock_location_id")
        priority = int(pallet.get("priority") or 3)

        # 1. Priority (lower number → higher score)
        p_score = W_PRIORITY / priority

        # 2. Deadline urgency
        d_bonus = deadline_bonus(truck)

        # 3. Aging (anti-starvation)
        a_bonus = aging_bonus(pallet)

        # 4. Distance penalty
        pallet_loc = get_location(locations, pallet.get("current_location_id"))
        dock_loc   = get_location(locations, dock_id)
        dist       = euclidean(pallet_loc, dock_loc) if (pallet_loc and dock_loc) else 1.0
        d_penalty  = W_DISTANCE * dist

        # 5. Dock congestion penalty
        current_load = dock_load.get(dock_id, 0)
        c_penalty    = W_CONGESTION * current_load

        # 6. Destination grouping bonus (reward batching to the same dock)
        g_bonus = W_GROUPING if current_load > 0 else 0.0

        score = p_score + d_bonus + a_bonus + g_bonus - d_penalty - c_penalty

        pallet_scores.append({
            "pallet_id": pallet["id"],
            "score":     round(score, 4),
            "dock":      dock_id,
            "breakdown": {
                "priority_score":    round(p_score, 3),
                "deadline_bonus":    round(d_bonus, 3),
                "aging_bonus":       round(a_bonus, 3),
                "grouping_bonus":    round(g_bonus, 3),
                "distance_penalty":  round(d_penalty, 3),
                "congestion_penalty":round(c_penalty, 3),
            }
        })

        dock_load[dock_id] = current_load + 1

    pallet_scores.sort(key=lambda x: x["score"], reverse=True)

    sequence = [
        {
            "pallet_id":      p["pallet_id"],
            "sequence_order": i + 1,
            "score":          p["score"],
        }
        for i, p in enumerate(pallet_scores)
    ]

    return sequence, pallet_scores   # return raw scores too for /explain
