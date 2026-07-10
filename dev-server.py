#!/usr/bin/env python3
"""Local dev server that always sends Cache-Control: no-store, so a plain
browser refresh (not just a hard-refresh) always picks up the latest
edited files instead of serving a stale cached copy."""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8791


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=PORT)
