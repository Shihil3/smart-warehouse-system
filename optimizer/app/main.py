from fastapi import FastAPI
from app.services.optimization_service import optimize_sequence

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Warehouse Optimization Service Running"}

@app.post("/optimize")
def optimize(data: dict):

    pallets = data.get("pallets", [])
    trucks = data.get("trucks", [])
    locations = data.get("locations", [])

    sequence = optimize_sequence(pallets, trucks, locations)

    return {"sequence": sequence}
