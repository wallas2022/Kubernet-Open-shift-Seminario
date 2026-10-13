import argparse

from .config import Settings
from .store import initialize


def main():
    parser = argparse.ArgumentParser(description="Inicializar esquema y semilla sin reiniciar datos existentes")
    parser.add_argument("command", choices=["init"])
    parser.add_argument("--capacity", type=int, default=1000)
    args = parser.parse_args()
    initialize(Settings.from_env(), args.capacity)
    print("Esquema preparado; la semilla existente no se modifica.")


if __name__ == "__main__":
    main()
