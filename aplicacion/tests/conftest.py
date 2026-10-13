import os
from uuid import uuid4

import psycopg
from psycopg import sql
import pytest
from fastapi.testclient import TestClient

from reservas.api import create_app
from reservas.config import Settings
from reservas.store import initialize

CLIENT_A = "10000000-0000-0000-0000-000000000001"
CLIENT_B = "10000000-0000-0000-0000-000000000002"
KEY_A = "test-client-a-" + "a" * 32
KEY_B = "test-client-b-" + "b" * 32


@pytest.fixture
def settings():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("TEST_DATABASE_URL es obligatorio: estas pruebas requieren PostgreSQL real")
    schema = "test_" + uuid4().hex
    try:
        connection = psycopg.connect(url, autocommit=True, connect_timeout=5)
    except psycopg.OperationalError:
        pytest.exit("PostgreSQL de pruebas no accesible; no se ejecutaron pruebas de integracion", returncode=2)
    with connection as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    config = Settings(url, {KEY_A: CLIENT_A, KEY_B: CLIENT_B}, schema=schema, pool_max=32)
    initialize(config, capacity=25)
    yield config
    with psycopg.connect(url, autocommit=True, connect_timeout=5) as conn:
        # Solo borrar el esquema aleatorio creado por esta fixture.
        conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def connection(settings):
    with psycopg.connect(settings.database_url, options=settings.connection_options, connect_timeout=5) as conn:
        yield conn
