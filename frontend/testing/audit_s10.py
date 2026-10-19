"""Audit the exclusive database after the lost-after-commit recovery scenario."""
import json
import sys
sys.path.insert(0, '/app')
import psycopg
from reservas.config import Settings

settings = Settings.from_env()
if '@db:5432/reservas_s10' not in settings.database_url:
    raise RuntimeError('S10 audit requires its exclusive database')
with psycopg.connect(settings.database_url) as conn:
    available, capacity = conn.execute('SELECT available, capacity FROM events').fetchone()
    count, quantity = conn.execute("SELECT count(*),sum(quantity) FROM reservations WHERE status='confirmed'").fetchone()
    outbox = conn.execute('SELECT count(*) FROM outbox').fetchone()[0]
    duplicates = conn.execute('SELECT count(*) FROM (SELECT client_id,idempotency_key FROM reservations GROUP BY client_id,idempotency_key HAVING count(*)>1) x').fetchone()[0]
    assert (available, capacity, count, quantity, outbox, duplicates) == (23, 25, 1, 2, 1, 0)
print(json.dumps(dict(sprint='S10', passed=True, available=available, capacity=capacity,
                     reservations=count, reservedQuantity=quantity, outbox=outbox,
                     duplicateKeys=duplicates, credentialsRecorded=False)))
