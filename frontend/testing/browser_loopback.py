"""Read-only HTTP bridge for the container browser to the host loopback lab."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

class Bridge(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def forward(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))) or None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'connection')}
        headers['Host'] = 'localhost:5181'
        request = Request('http://host.docker.internal:5181' + self.path, data=body, headers=headers, method=self.command)
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

ThreadingHTTPServer(('127.0.0.1', 5181), Bridge).serve_forever()
