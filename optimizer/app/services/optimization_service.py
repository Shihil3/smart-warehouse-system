def optimize_sequence(data):

    pallets = data.get("pallets", [])
    trucks = data.get("trucks", [])

    results = []

    for pallet in pallets:
        score = pallet.get("priority", 3)

        results.append({
            "pallet_id": pallet["id"],
            "score": score
        })

    results.sort(key=lambda x: x["score"])

    sequence = []
    order = 1

    for item in results:
        sequence.append({
            "pallet_id": item["pallet_id"],
            "sequence_order": order
        })
        order += 1

    return sequence
