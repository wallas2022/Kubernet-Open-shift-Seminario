from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from reservas.api import create_app
from reservas.store import DEMO_EVENT, Store
from .conftest import CLIENT_A, CLIENT_B, KEY_A, KEY_B


def reserve(client, key, quantity=1, api_key=KEY_A, event_id=DEMO_EVENT):
    return client.post("/reservas", headers={"X-Api-Key": api_key, "Idempotency-Key": key},
                       json={"event_id": str(event_id), "quantity": quantity})


def test_contract_and_owner_isolation(client):
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200
    assert client.get("/catalogo").status_code == 401
    assert client.get("/catalogo", headers={"X-Api-Key": KEY_A}).json()["events"][0]["available"] == 25
    created = reserve(client, "first", 2)
    assert created.status_code == 201
    replay = reserve(client, "first", 2)
    assert replay.status_code == 200
    assert replay.json() == created.json()
    rid = created.json()["id"]
    assert client.get(f"/reservas/{rid}", headers={"X-Api-Key": KEY_A}).status_code == 200
    assert client.get(f"/reservas/{rid}", headers={"X-Api-Key": KEY_B}).status_code == 404


@pytest.mark.parametrize("quantity", [0, -1, 101, True, "2", 1.5])
def test_invalid_quantity_does_not_mutate(client, connection, quantity):
    assert reserve(client, "invalid", quantity).status_code == 422
    assert connection.execute("SELECT available FROM events").fetchone()[0] == 25
    assert connection.execute("SELECT count(*) FROM reservations").fetchone()[0] == 0


def test_key_conflict_and_client_scoping(client, connection):
    first = reserve(client, "shared", 2)
    assert first.status_code == 201
    assert reserve(client, "shared", 3).json()["error"] == "idempotency_conflict"
    assert reserve(client, "shared", 1, api_key=KEY_B).status_code == 201
    assert connection.execute("SELECT available FROM events").fetchone()[0] == 22


def test_missing_event_and_missing_key(client, connection):
    assert reserve(client, "missing", event_id=uuid4()).status_code == 404
    response = client.post("/reservas", headers={"X-Api-Key": KEY_A},
                           json={"event_id": str(DEMO_EVENT), "quantity": 1})
    assert response.status_code == 422
    assert connection.execute("SELECT count(*) FROM reservations").fetchone()[0] == 0


def test_concurrent_requests_never_oversell(client, connection):
    with ThreadPoolExecutor(max_workers=24) as executor:
        responses = list(executor.map(lambda i: reserve(client, f"race-{i}"), range(80)))
    assert sum(r.status_code == 201 for r in responses) == 25
    assert sum(r.status_code == 409 and r.json()["error"] == "sold_out" for r in responses) == 55
    available, capacity = connection.execute("SELECT available,capacity FROM events").fetchone()
    total, count = connection.execute("SELECT coalesce(sum(quantity),0),count(*) FROM reservations WHERE status='confirmed'").fetchone()
    assert available == 0 and available + total == capacity == 25
    assert count == connection.execute("SELECT count(*) FROM outbox").fetchone()[0] == 25
    assert connection.execute("SELECT count(*) FROM reservations WHERE status='pending'").fetchone()[0] == 0


def test_idempotency_across_two_api_instances(settings, connection):
    with TestClient(create_app(settings)) as api_a, TestClient(create_app(settings)) as api_b:
        with ThreadPoolExecutor(max_workers=16) as executor:
            responses = list(executor.map(lambda i: reserve(api_a if i % 2 else api_b, "same-key", 3), range(40)))
    assert sum(r.status_code == 201 for r in responses) == 1
    assert sum(r.status_code == 200 for r in responses) == 39
    assert len({r.json()["id"] for r in responses}) == 1
    assert connection.execute("SELECT available FROM events").fetchone()[0] == 22
    assert connection.execute("SELECT count(*) FROM outbox").fetchone()[0] == 1


def test_same_key_with_different_payload_race(client, connection):
    with ThreadPoolExecutor(max_workers=12) as executor:
        responses = list(executor.map(lambda i: reserve(client, "different-payload", 1 if i % 2 else 2), range(30)))
    assert sum(r.status_code == 201 for r in responses) == 1
    assert all(r.status_code in (200, 201, 409) for r in responses)
    assert any(r.status_code == 409 for r in responses)
    confirmed = connection.execute("SELECT quantity FROM reservations").fetchall()
    assert len(confirmed) == 1
    assert connection.execute("SELECT available FROM events").fetchone()[0] == 25 - confirmed[0][0]


def test_transaction_rolls_back_if_outbox_fails(client, connection):
    # Fallo posterior al descuento: comprobar atomicidad ante error real SQL.
    connection.execute("ALTER TABLE outbox ADD CONSTRAINT fail_fixture CHECK (false)")
    connection.commit()
    with pytest.raises(psycopg.errors.CheckViolation):
        reserve(client, "rollback", 5)
    connection.rollback()
    assert connection.execute("SELECT available FROM events").fetchone()[0] == 25
    assert connection.execute("SELECT count(*) FROM reservations").fetchone()[0] == 0


def test_worker_parallel_and_replay(client, settings, connection):
    for i in range(10):
        assert reserve(client, f"worker-{i}").status_code == 201
    worker_a, worker_b = Store(settings), Store(settings)
    worker_a.open()
    worker_b.open()
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda s: s.process_batch(), [worker_a, worker_b]))
        assert sum(results) == 10
        assert worker_a.process_batch() == 0
        assert connection.execute("SELECT count(*) FROM notification_deliveries").fetchone()[0] == 10
        # Simular repeticion de un evento ya recibido.
        connection.execute("UPDATE outbox SET processed_at=NULL")
        connection.commit()
        assert worker_b.process_batch() == 10
        assert connection.execute("SELECT count(*) FROM notification_deliveries").fetchone()[0] == 10
    finally:
        worker_a.close()
        worker_b.close()


def test_metrics_do_not_include_keys(client):
    reserve(client, "metrics")
    metrics = client.get("/metrics").text
    assert 'http_requests_total{route="/reservas",status="201"} 1' in metrics
    assert KEY_A not in metrics and "metrics\"" not in metrics


def test_readiness_fails_without_schema_but_liveness_survives(client, connection):
    connection.execute("DROP TABLE events CASCADE")
    connection.commit()
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 503


def test_worker_failure_preserves_pending_events(client, settings, connection):
    assert reserve(client, "worker-rollback").status_code == 201
    connection.execute("ALTER TABLE notification_deliveries ADD CONSTRAINT fail_delivery CHECK (false)")
    connection.commit()
    worker = Store(settings)
    worker.open()
    try:
        with pytest.raises(psycopg.errors.CheckViolation):
            worker.process_batch()
        assert connection.execute("SELECT count(*) FROM outbox WHERE processed_at IS NULL").fetchone()[0] == 1
        connection.execute("ALTER TABLE notification_deliveries DROP CONSTRAINT fail_delivery")
        connection.commit()
        assert worker.process_batch() == 1
        assert connection.execute("SELECT count(*) FROM notification_deliveries").fetchone()[0] == 1
    finally:
        worker.close()
