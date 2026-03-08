import math

def get_location(locations, loc_id):

    return next(
        (l for l in locations if str(l["id"]) == str(loc_id)),
        None
    )


def distance(loc1, loc2):

    x1 = float(loc1["x_coordinate"])
    y1 = float(loc1["y_coordinate"])

    x2 = float(loc2["x_coordinate"])
    y2 = float(loc2["y_coordinate"])

    return math.sqrt((x1-x2)**2 + (y1-y2)**2)
    

def optimize_sequence(pallets, trucks, locations):

    pallet_scores = []

    dock_load = {}

    for pallet in pallets:

        truck = next(
            (t for t in trucks if str(t["id"]) == str(pallet["outbound_truck_id"])),
            None
        )

        if not truck:
            continue

        dock_id = truck.get("dock_location_id")

        dock_load[dock_id] = dock_load.get(dock_id, 0)

        priority = int(pallet.get("priority") or 3)

        pallet_loc = get_location(locations, pallet.get("current_location_id"))
        dock_loc = get_location(locations, dock_id)

        dist = 1
        if pallet_loc and dock_loc:
            dist = distance(pallet_loc, dock_loc)

        congestion_penalty = dock_load[dock_id] * 0.5

        score = (
            5 * (1 / priority)
            - 0.5 * dist
            - congestion_penalty
        )

        pallet_scores.append({
            "pallet_id": pallet["id"],
            "score": score,
            "dock": dock_id
        })

        dock_load[dock_id] += 1

    pallet_scores.sort(key=lambda x: x["score"], reverse=True)

    sequence = []

    for i, p in enumerate(pallet_scores):

        sequence.append({
            "pallet_id": p["pallet_id"],
            "sequence_order": i + 1
        })

    return sequence