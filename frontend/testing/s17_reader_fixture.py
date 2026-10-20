"""Local-only S17 reader fixture. Volatile data; never connects to the real API or database."""
import json
import re
import threading
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'dist'
EVENT = '00000000-0000-0000-0000-000000000001'
state = {'reservations': {}, 'operations': {}, 'lose_next': False}
lock = threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def respond(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-S17-Fixture', 'volatile-no-real-business')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        if self.headers.get('X-Api-Key') != 'S17-LECTOR':
            self.respond(401, {'error': 'invalid_credentials'})
            return False
        return True

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/_fixture':
            with lock:
                self.respond(200, {'fixture': 'S17', 'realBusiness': False, 'reservations': len(state['reservations']), 'loseNext': state['lose_next']})
            return
        if not path.startswith('/api/'):
            if path != '/' and not path.startswith('/assets/') and path != '/index.html':
                self.respond(404, {'error': 'fixture_route_not_found'})
                return
            super().do_GET()
            return
        if not self.authorized():
            return
        time.sleep(0.8)
        with lock:
            available = 25 - sum(r['quantity'] for r in state['reservations'].values())
            if path == '/api/catalogo':
                self.respond(200, {'events': [{'id': EVENT, 'name': 'Ensayo ficticio S17 del lector de pantalla', 'capacity': 25, 'available': available}]})
            elif path == f'/api/eventos/{EVENT}/disponibilidad':
                self.respond(200, {'id': EVENT, 'capacity': 25, 'available': available})
            elif path.startswith('/api/reservas/') and path.rsplit('/', 1)[1] in state['reservations']:
                self.respond(200, state['reservations'][path.rsplit('/', 1)[1]])
            else:
                self.respond(404, {'error': 'reservation_not_found'})

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length > 4096:
                raise ValueError()
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, TypeError):
            self.respond(422, {'error': 'validation_error'})
            return
        path = urlsplit(self.path).path
        if path == '/_fixture':
            with lock:
                if body == {'mode': 'reset'}:
                    state.update(reservations={}, operations={}, lose_next=False)
                elif body == {'mode': 'lose-next'}:
                    state['lose_next'] = True
                else:
                    self.respond(422, {'error': 'validation_error'})
                    return
            self.respond(200, {'fixture': 'S17', 'mode': body['mode'], 'realBusiness': False})
            return
        if path != '/api/reservas':
            self.respond(404, {'error': 'fixture_route_not_found'})
            return
        if not self.authorized():
            return
        time.sleep(1.2)
        key = self.headers.get('Idempotency-Key', '')
        if not re.fullmatch(r'[A-Za-z0-9._:-]{1,128}', key) or set(body) != {'event_id', 'quantity'} or body['event_id'] != EVENT or type(body['quantity']) is not int or not 1 <= body['quantity'] <= 100:
            self.respond(422, {'error': 'validation_error'})
            return
        with lock:
            if key in state['operations']:
                previous = state['operations'][key]
                if previous['event_id'] != body['event_id'] or previous['quantity'] != body['quantity']:
                    self.respond(409, {'error': 'idempotency_conflict'})
                else:
                    self.respond(200, previous)
                return
            available = 25 - sum(r['quantity'] for r in state['reservations'].values())
            if body['quantity'] > available:
                self.respond(409, {'error': 'sold_out'})
                return
            reservation = {'id': str(uuid.uuid4()), 'event_id': EVENT, 'quantity': body['quantity'], 'status': 'confirmed', 'created_at': '2026-10-19T12:00:00Z'}
            state['reservations'][reservation['id']] = reservation
            state['operations'][key] = reservation
            if state['lose_next']:
                state['lose_next'] = False
                self.respond(503, {'error': 'database_unavailable'})
            else:
                self.respond(201, reservation)

if __name__ == '__main__':
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('Build frontend first')
    ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
