from dataclasses import dataclass
import json
import os
import re
from uuid import UUID


@dataclass(frozen=True)
class Settings:
    database_url: str
    client_keys: dict[str, str]
    schema: str = "public"
    pool_max: int = 10

    def __post_init__(self):
        if not self.database_url:
            raise ValueError("DATABASE_URL es obligatorio")
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", self.schema):
            raise ValueError("DB_SCHEMA no valido")
        if not 1 <= self.pool_max <= 50:
            raise ValueError("POOL_MAX debe estar entre 1 y 50")
        if not self.client_keys:
            raise ValueError("CLIENT_KEYS_JSON debe contener clientes")
        for key, client in self.client_keys.items():
            if not isinstance(key, str) or len(key) < 32:
                raise ValueError("Cada clave de cliente requiere al menos 32 caracteres")
            UUID(client)

    @classmethod
    def from_env(cls):
        return cls(
            database_url=os.environ.get("DATABASE_URL", ""),
            client_keys=json.loads(os.environ.get("CLIENT_KEYS_JSON", "{}")),
            schema=os.environ.get("DB_SCHEMA", "public"),
            pool_max=int(os.environ.get("POOL_MAX", "10")),
        )

    @property
    def connection_options(self):
        return f"-c search_path={self.schema},public -c statement_timeout=3000 -c lock_timeout=2000"
