#!/bin/bash
cd "$(dirname "$0")"

# if a server is already running on this port, just reuse it
if ! curl -s -o /dev/null "http://localhost:8791/index.html"; then
  (python3 -m http.server 8791 &>/dev/null &)
  sleep 1
fi

open "http://localhost:8791/index.html"
