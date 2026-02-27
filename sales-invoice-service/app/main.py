from fastapi import FastAPI
from app.routers import invoices

app = FastAPI(title="Invoice Service")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(invoices.router)