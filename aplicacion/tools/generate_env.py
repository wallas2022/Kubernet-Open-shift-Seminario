"""Crear secretos locales fuera del repositorio sin imprimir sus valores."""
import argparse
import json
from pathlib import Path
import secrets


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    directory = args.directory.resolve()
    repo = Path(__file__).resolve().parents[2]
    if directory == repo or repo in directory.parents:
        parser.error("La carpeta de secretos debe estar fuera del repositorio")
    files = [directory / x for x in ("compose.env", "kubernetes.env", "client-access.json")]
    if any(path.exists() for path in files):
        parser.error("Ya existen secretos; no se sobrescribiran")
    password = secrets.token_hex(32)
    key = secrets.token_hex(32)
    client_id = "10000000-0000-0000-0000-000000000001"
    keys = json.dumps({key: client_id}, separators=(",", ":"))
    directory.mkdir(parents=True, exist_ok=True)
    files[0].write_text(f"POSTGRES_PASSWORD={password}\nCLIENT_KEYS_JSON='{keys}'\n", encoding="utf-8")
    files[1].write_text(
        f"POSTGRES_PASSWORD={password}\nCLIENT_KEYS_JSON={keys}\n"
        f"DATABASE_URL=postgresql://seminario:{password}@reservas-db:5432/reservas\n", encoding="utf-8")
    files[2].write_text(json.dumps({"api_key": key, "client_id": client_id}, indent=2), encoding="utf-8")
    for path in files:
        path.chmod(0o600)
        print(f"Creado: {path}")


if __name__ == "__main__":
    main()
