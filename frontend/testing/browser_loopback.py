"""Read-only HTTP bridge for the container browser to the host loopback lab."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5181
if port not in (5181, 5182, 5183):
    raise ValueError('Only isolated laboratory ports are allowed')

class Bridge(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def forward(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))) or None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'connection')}
        headers['Host'] = f'localhost:{port}'
        request = Request(f'http://host.docker.internal:{port}' + self.path, data=body, headers=headers, method=self.command)
        try:
            response = urlopen(request, timeout=20)
        except HTTPError as error:
            response = error
        with response:
            data = response.read()
            self.send_response(response.status)
            for key, value in response.headers.items():
                if key.lower() not in ('content-length', 'transfer-encoding', 'connection'):
                    self.send_header(key, value)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    do_GET = do_POST = forward

ThreadingHTTPServer(('127.0.0.1', port), Bridge).serve_forever()
