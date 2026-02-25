from fastapi import FastAPI

app = FastAPI(title="sales-payment-service")

@app.get("/health")
def health():
return {"status": "ok"}
