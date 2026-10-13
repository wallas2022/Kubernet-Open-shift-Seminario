import pytest

from reservas.api import ReservationInput
from reservas.config import Settings


def test_rejects_short_credentials_and_schema_injection():
    url = "postgresql://example.invalid/laboratorio"
    with pytest.raises(ValueError):
        Settings(url, {"short": "10000000-0000-0000-0000-000000000001"})
    with pytest.raises(ValueError):
        Settings(url, {"a" * 32: "10000000-0000-0000-0000-000000000001"}, schema="public;DROP")


def test_client_identity_cannot_be_submitted_in_body():
    with pytest.raises(ValueError):
        ReservationInput(event_id="00000000-0000-0000-0000-000000000001", quantity=1,
                         client_id="10000000-0000-0000-0000-000000000099")
