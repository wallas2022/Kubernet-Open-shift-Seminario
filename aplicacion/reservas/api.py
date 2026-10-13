from collections import defaultdict
from contextlib import asynccontextmanager
import hmac
from datetime import datetime
import threading
import time
from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field, StrictInt
import psycopg
from psycopg_pool import PoolTimeout

from .config import Settings
from .store import BusinessError, Store


class ReservationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: UUID
    quantity: Annotated[StrictInt, Field(ge=1, le=100)]


class ReservationOutput(BaseModel):
    id: UUID
    event_id: UUID
    quantity: int
    status: Literal["confirmed"]
    created_at: datetime


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    store = Store(settings)
    counter = defaultdict(int)
    durations = defaultdict(float)
    counts = defaultdict(int)
    metrics_lock = threading.Lock()

    @asynccontextmanager
    async def lifespan(app):
        try:
            store.open()
            yield
        finally:
            store.close()

    app = FastAPI(title="Reservas del seminario", version="1.0.0", lifespan=lifespan)
    app.state.store = store

    def client(api_key: Annotated[str | None, Header(alias="X-Api-Key")] = None):
        if api_key:
            for expected, owner in settings.client_keys.items():
                if hmac.compare_digest(api_key.encode(), expected.encode()):
                    return UUID(owner)
        raise HTTPException(401, detail="invalid_credentials")

    @app.middleware("http")
    async def measure(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        route = getattr(request.scope.get("route"), "path", "unmatched")
        if route not in ("/metrics", "/health/live", "/health/ready"):
            with metrics_lock:
                counter[(route, response.status_code)] += 1
                durations[route] += time.perf_counter() - start
                counts[route] += 1
        return response

    @app.exception_handler(BusinessError)
    async def business_error(request, exc):
        return JSONResponse(status_code=exc.status, content={"error": exc.code})

    @app.exception_handler(psycopg.errors.ForeignKeyViolation)
    async def missing_event(request, exc):
        return JSONResponse(status_code=404, content={"error": "event_not_found"})

    async def database_unavailable(request, exc):
        # No exponer SQL, credenciales ni errores internos del driver al cliente.
        return JSONResponse(status_code=503, headers={"Retry-After": "1"}, content={"error": "database_unavailable"})

    app.add_exception_handler(psycopg.OperationalError, database_unavailable)
    app.add_exception_handler(psycopg.errors.QueryCanceled, database_unavailable)
    app.add_exception_handler(psycopg.errors.LockNotAvailable, database_unavailable)
    app.add_exception_handler(psycopg.errors.UndefinedTable, database_unavailable)
    app.add_exception_handler(PoolTimeout, database_unavailable)

    @app.get("/health/live")
    def live():
        return {"status": "live"}

    @app.get("/health/ready")
    def ready():
        store.ready()
        return {"status": "ready"}

    @app.get("/catalogo")
    def catalog(owner: UUID = Depends(client)):
        return {"events": store.catalog()}

    @app.get("/eventos/{event_id}/disponibilidad")
    def availability(event_id: UUID, owner: UUID = Depends(client)):
        return store.availability(event_id)

    @app.post("/reservas", response_model=ReservationOutput, status_code=201,
              responses={200: {"model": ReservationOutput, "description": "Reserva repetida"},
                         409: {"description": "Sin cupo o clave incompatible"},
                         401: {"description": "Credenciales invalidas"},
                         503: {"description": "Base no disponible"}})
    def reserve(
        body: ReservationInput,
        key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")],
        owner: UUID = Depends(client),
    ):
        result, created = store.reserve(owner, key, body.event_id, body.quantity)
        return JSONResponse(status_code=201 if created else 200,
                            content=jsonable_encoder(ReservationOutput.model_validate(result)))

    @app.get("/reservas/{reservation_id}")
    def reservation(reservation_id: UUID, owner: UUID = Depends(client)):
        return store.get_reservation(reservation_id, owner)

    @app.get("/metrics", response_class=PlainTextResponse)
    def metrics():
        lines = ["# TYPE http_requests_total counter", "# TYPE http_request_duration_seconds summary"]
        with metrics_lock:
            for (route, status), value in sorted(counter.items()):
                lines.append(f'http_requests_total{{route="{route}",status="{status}"}} {value}')
            for route in sorted(counts):
                lines.append(f'http_request_duration_seconds_count{{route="{route}"}} {counts[route]}')
                lines.append(f'http_request_duration_seconds_sum{{route="{route}"}} {durations[route]}')
        return "\n".join(lines) + "\n"

    return app
