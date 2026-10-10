import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")
DATABASE_PATH = os.getenv("DATABASE_PATH", "").strip() or str(BASE_DIR / "routewise.db")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "").strip()
SERPAPI_TIMEOUT_SECONDS = max(5, int(os.getenv("SERPAPI_TIMEOUT_SECONDS", "20")))
CORS_ORIGINS = [
    x.strip().rstrip("/") for x in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173"
    ).split(",") if x.strip()
]
