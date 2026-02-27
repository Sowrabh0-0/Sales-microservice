from fastapi import FastAPI
from app.routers import orders

app = FastAPI(title="Order Service")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(orders.router)