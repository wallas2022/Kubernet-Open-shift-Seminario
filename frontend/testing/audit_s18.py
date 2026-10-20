"""Read-only audit of the exclusive S18 database after verify-deployment.mjs."""
import json
import os
import psycopg

url = os.environ["DATABASE_URL"]
if "@db:5432/reservas_s18" not in url:
    raise RuntimeError("S18 audit requires the exclusive S18 database")
with psycopg.connect(url, options="-c default_transaction_read_only=on") as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*), coalesce(sum(quantity),0), count(DISTINCT idempotency_key) FROM reservations")
        reservations, reserved, keys = cur.fetchone()
        cur.execute("SELECT count(*) FROM outbox")
        outbox = cur.fetchone()[0]
        cur.execute("SELECT available FROM events WHERE id='00000000-0000-0000-0000-000000000001'")
        available = cur.fetchone()[0]
assert (reservations, reserved, keys, outbox, available) == (2, 4, 2, 2, 21), "Unexpected S18 database counts"
print(json.dumps({"sprint": "S18", "database": "reservas_s18", "readOnlyAudit": True, "reservations": reservations, "reserved": reserved, "uniqueOperationKeys": keys, "outbox": outbox, "available": available, "status": "pass"}))
