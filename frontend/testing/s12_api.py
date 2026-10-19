"""API real con base exclusiva de S12; no usa la base del laboratorio habitual."""
import sys
sys.path.insert(0, "/app")
import uvicorn
from reservas.api import create_app
from reservas.config import Settings
from reservas.store import initialize

settings = Settings.from_env()
if "@db:5432/reservas_s12" not in settings.database_url:
    raise RuntimeError("S12 requiere su base exclusiva")
initialize(settings, capacity=1)
uvicorn.run(create_app(settings), host="0.0.0.0", port=8080, access_log=False)
