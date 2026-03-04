#!/bin/sh

echo "Waiting for DB..."
sleep 5

echo "Creating tables..."
python -m app.init_db

echo "Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000