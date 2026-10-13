import logging
import signal
import threading

import psycopg
from psycopg_pool import PoolTimeout

from .config import Settings
from .store import Store


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    stopped = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stopped.set())
    store = Store(Settings.from_env())
    store.open()
    try:
        while not stopped.is_set():
            try:
                processed = store.process_batch()
                if processed:
                    logging.info("outbox_processed=%d", processed)
                else:
                    stopped.wait(0.5)
            except (psycopg.Error, PoolTimeout):
                logging.warning("outbox_database_error; retry_in_seconds=2")
                stopped.wait(2)
    finally:
        store.close()


if __name__ == "__main__":
    main()
