from fastapi import FastAPI
from app.routers import customers

app = FastAPI(title="Customer Service")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(customers.router)