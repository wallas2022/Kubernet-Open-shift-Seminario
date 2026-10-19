"""Verificar efectos reales de verify-creation.mjs en la base exclusiva de S08."""
import json
import sys
sys.path.insert(0, "/app")
import psycopg
from reservas.config import Settings

settings = Settings.from_env()
if "@db:5432/reservas_s08" not in settings.database_url:
    raise RuntimeError("La auditoria requiere la base exclusiva S08")
with psycopg.connect(settings.database_url) as conn:
    available, capacity = conn.execute("SELECT available,capacity FROM events").fetchone()
    count, quantity = conn.execute("SELECT count(*),sum(quantity) FROM reservations WHERE status='confirmed'").fetchone()
    outbox = conn.execute("SELECT count(*) FROM outbox").fetchone()[0]
    pending = conn.execute("SELECT count(*) FROM reservations WHERE status='pending'").fetchone()[0]
    duplicate_keys = conn.execute("SELECT count(*) FROM (SELECT client_id,idempotency_key FROM reservations GROUP BY client_id,idempotency_key HAVING count(*)>1) x").fetchone()[0]
    assert available == 0 and capacity == quantity == 25
    assert count == outbox == 23 and pending == duplicate_keys == 0
report = {"sprint": "S08", "database": "exclusive ephemeral reservas_s08", "passed": True,
          "available": available, "capacity": capacity, "reservedQuantity": quantity,
          "reservations": count, "outbox": outbox, "pendingRows": pending, "duplicateKeys": duplicate_keys,
          "credentialsRecorded": False}
print(json.dumps(report))
