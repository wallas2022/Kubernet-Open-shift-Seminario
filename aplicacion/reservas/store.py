from pathlib import Path
from uuid import UUID, uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from .config import Settings

DEMO_EVENT = UUID("00000000-0000-0000-0000-000000000001")


class BusinessError(Exception):
    def __init__(self, status: int, code: str):
        self.status = status
        self.code = code
        super().__init__(code)


def initialize(settings: Settings, capacity: int = 1000):
    if not 1 <= capacity <= 1_000_000:
        raise ValueError("Capacidad de semilla no valida")
    with psycopg.connect(settings.database_url, options=settings.connection_options, connect_timeout=5) as conn:
        conn.execute(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
        conn.execute(
            "INSERT INTO events(id,name,capacity,available) VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (DEMO_EVENT, "Evento del seminario", capacity, capacity),
        )


class Store:
    def __init__(self, settings: Settings):
        self.pool = ConnectionPool(
            settings.database_url, min_size=1, max_size=settings.pool_max,
            timeout=2, open=False,
            kwargs={"row_factory": dict_row, "options": settings.connection_options, "connect_timeout": 5},
        )

    def open(self):
        self.pool.open(wait=True, timeout=10)

    def close(self):
        self.pool.close()

    def ready(self):
        with self.pool.connection() as conn:
            conn.execute("SELECT id FROM events LIMIT 1").fetchall()

    def catalog(self):
        with self.pool.connection() as conn:
            return conn.execute("SELECT id,name,capacity,available FROM events ORDER BY id").fetchall()

    def availability(self, event_id: UUID):
        with self.pool.connection() as conn:
            row = conn.execute("SELECT id,capacity,available FROM events WHERE id=%s", (event_id,)).fetchone()
            if row is None:
                raise BusinessError(404, "event_not_found")
            return row

    def get_reservation(self, reservation_id: UUID, client_id: UUID):
        with self.pool.connection() as conn:
            row = conn.execute(
                "SELECT id,event_id,quantity,status,created_at FROM reservations WHERE id=%s AND client_id=%s",
                (reservation_id, client_id),
            ).fetchone()
            if row is None:
                raise BusinessError(404, "reservation_not_found")
            return row

    def reserve(self, client_id: UUID, key: str, event_id: UUID, quantity: int):
        # El indice unico decide un ganador por cliente y clave. ON CONFLICT
        # espera al competidor; el SELECT siguiente usa un snapshot nuevo
        # con READ COMMITTED y observa el resultado ya confirmado.
        with self.pool.connection() as conn:
            reservation_id = uuid4()
            inserted = conn.execute(
                """INSERT INTO reservations(id,client_id,idempotency_key,event_id,quantity,status)
                   VALUES(%s,%s,%s,%s,%s,'pending')
                   ON CONFLICT(client_id,idempotency_key) DO NOTHING RETURNING id""",
                (reservation_id, client_id, key, event_id, quantity),
            ).fetchone()
            if inserted is None:
                previous = conn.execute(
                    """SELECT id,event_id,quantity,status,created_at FROM reservations
                       WHERE client_id=%s AND idempotency_key=%s""", (client_id, key),
                ).fetchone()
                if previous is None:
                    raise BusinessError(503, "retry_later")
                if previous["event_id"] != event_id or previous["quantity"] != quantity:
                    raise BusinessError(409, "idempotency_conflict")
                return previous, False
            changed = conn.execute(
                """UPDATE events SET available=available-%s
                   WHERE id=%s AND available >= %s RETURNING available""",
                (quantity, event_id, quantity),
            ).fetchone()
            if changed is None:
                # La excepcion revierte tambien la fila pending y libera la clave.
                raise BusinessError(409, "sold_out")
            result = conn.execute(
                """UPDATE reservations SET status='confirmed' WHERE id=%s
                   RETURNING id,event_id,quantity,status,created_at""", (reservation_id,),
            ).fetchone()
            conn.execute(
                "INSERT INTO outbox(id,reservation_id,payload) VALUES(%s,%s,%s)",
                (uuid4(), reservation_id, Jsonb({"type": "reservation_confirmed", "reservation_id": str(reservation_id)})),
            )
            # La salida del contexto confirma descuento, reserva y outbox juntos.
            return result, True

    def process_batch(self, limit: int = 50):
        with self.pool.connection() as conn:
            rows = conn.execute(
                """SELECT id,reservation_id FROM outbox WHERE processed_at IS NULL
                   ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT %s""", (limit,),
            ).fetchall()
            for row in rows:
                # Receptor simulado en la misma base, sin correo ni llamadas externas.
                conn.execute(
                    """INSERT INTO notification_deliveries(event_id,reservation_id)
                       VALUES(%s,%s) ON CONFLICT(event_id) DO NOTHING""",
                    (row["id"], row["reservation_id"]),
                )
                conn.execute("UPDATE outbox SET processed_at=now() WHERE id=%s", (row["id"],))
            return len(rows)
