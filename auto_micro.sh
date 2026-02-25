#!/usr/bin/env bash

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
echo "❌ Please provide service name"
exit 1
fi

echo "🚀 Creating service: $SERVICE_NAME"

# ---------- Detect Python ----------

if command -v python >/dev/null 2>&1; then
PYTHON=python
elif command -v python3 >/dev/null 2>&1; then
PYTHON=python3
elif [ -f "/c/Python313/python.exe" ]; then
PYTHON="/c/Python313/python.exe"
else
echo "❌ Python not found. Install or provide path."
exit 1
fi

echo "🐍 Using Python: $PYTHON"

# ---------- Create folders ----------

mkdir -p "$SERVICE_NAME/app/models"
mkdir -p "$SERVICE_NAME/app/routers"
mkdir -p "$SERVICE_NAME/app/services"

touch "$SERVICE_NAME/app/__init__.py"
touch "$SERVICE_NAME/app/models/__init__.py"
touch "$SERVICE_NAME/app/routers/__init__.py"
touch "$SERVICE_NAME/app/services/__init__.py"

# ---------- requirements ----------

cat <<EOF > "$SERVICE_NAME/requirements.txt"
fastapi
uvicorn
sqlalchemy
pymysql
python-dotenv
pydantic
EOF

# ---------- .env ----------

cat <<EOF > "$SERVICE_NAME/.env"
DB_USER=admin
DB_PASS=password
DB_HOST=localhost
DB_PORT=3307
DB_NAME=sales_db
EOF

# ---------- database ----------

cat <<EOF > "$SERVICE_NAME/app/database.py"
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = (
f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}"
f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()
EOF

# ---------- schemas ----------

touch "$SERVICE_NAME/app/schemas.py"

# ---------- main ----------

cat <<EOF > "$SERVICE_NAME/app/main.py"
from fastapi import FastAPI

app = FastAPI(title="$SERVICE_NAME")

@app.get("/health")
def health():
return {"status": "ok"}
EOF

# ---------- run.sh ----------

cat <<EOF > "$SERVICE_NAME/run.sh"
#!/usr/bin/env bash
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
uvicorn app.main:app --reload --port 8001
EOF

chmod +x "$SERVICE_NAME/run.sh"

# ---------- Create venv ----------

echo "🐍 Creating virtual environment..."
"$PYTHON" -m venv "$SERVICE_NAME/venv" || { echo "❌ venv creation failed"; exit 1; }

# ---------- Activate ----------

echo "📦 Installing dependencies..."

if [ -f "$SERVICE_NAME/venv/Scripts/activate" ]; then
source "$SERVICE_NAME/venv/Scripts/activate"
else
source "$SERVICE_NAME/venv/bin/activate"
fi

python -m pip install --upgrade pip
python -m pip install -r "$SERVICE_NAME/requirements.txt"

echo ""
echo "✅ Service created successfully!"
echo ""
echo "👉 Run:"
echo "cd $SERVICE_NAME && bash run.sh"
