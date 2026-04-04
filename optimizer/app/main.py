from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any
from app.services.optimization_service import optimize_sequence

app = FastAPI(
    title="Warehouse Optimization Service",
    description="EDF + aging + deadline urgency sequencer for cross-dock pallets",
    version="2.0.0",
)


# ── Request / Response models ───────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    pallets:   list[dict[str, Any]] = []
    trucks:    list[dict[str, Any]] = []
    locations: list[dict[str, Any]] = []


class OptimizeExplainRequest(OptimizeRequest):
    pass


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {
        "message": "Warehouse Optimization Service Running",
        "version": "2.0.0",
        "endpoints": ["/optimize", "/optimize/explain", "/health"]
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/optimize")
def optimize(data: OptimizeRequest):
    """
    Returns the optimized pallet sequence for cross-dock operations.
    Considers: priority, truck deadline urgency, pallet aging (anti-starvation),
    destination grouping, and dock congestion.
    """
    if not data.pallets:
        return {"sequence": []}

    sequence, _ = optimize_sequence(data.pallets, data.trucks, data.locations)
    return {"sequence": sequence}


@app.post("/optimize/explain")
def optimize_explain(data: OptimizeExplainRequest):
    """
    Same as /optimize but also returns the per-pallet score breakdown —
    useful for debugging why a pallet was ranked where it was.
    """
    if not data.pallets:
        return {"sequence": [], "scores": []}

    sequence, raw_scores = optimize_sequence(data.pallets, data.trucks, data.locations)

    return {
        "sequence": sequence,
        "scores": [
            {
                "pallet_id": s["pallet_id"],
                "total_score": s["score"],
                "dock": s["dock"],
                **s["breakdown"],
            }
            for s in raw_scores
        ]
    }
