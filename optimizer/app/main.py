from fastapi import FastAPI
from app.services.optimization_service import optimize_sequence

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Warehouse Optimization Service Running"}

@app.post("/optimize")
def optimize(data: dict):
    sequence = optimize_sequence(data)
    return {"sequence": sequence}
