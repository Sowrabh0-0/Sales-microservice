from fastapi import FastAPI

app = FastAPI(title="sales-order-service")

@app.get("/health")
def health():
return {"status": "ok"}
