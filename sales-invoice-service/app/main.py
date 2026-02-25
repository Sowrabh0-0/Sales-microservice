from fastapi import FastAPI

app = FastAPI(title="sales-invoice-service")

@app.get("/health")
def health():
return {"status": "ok"}
