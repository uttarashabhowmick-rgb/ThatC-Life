#!/usr/bin/env bash
# Talk to the MCP server by hand with curl (Streamable HTTP, spec 2025-11-25).
set -euo pipefail
URL="${1:-http://localhost:8787/mcp?household=curl}"
H=(-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
echo "== initialize"
SID=$(curl -si "$URL" "${H[@]}" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' | tee /dev/stderr | awk -F': ' 'tolower($1)=="mcp-session-id"{print $2}' | tr -d '\r')
H+=(-H "Mcp-Session-Id: $SID" -H 'MCP-Protocol-Version: 2025-11-25')
curl -s "$URL" "${H[@]}" -d '{"jsonrpc":"2.0","method":"notifications/initialized"}' -o /dev/null -w "== initialized -> %{http_code}\n"
echo "== tools/list";  curl -s "$URL" "${H[@]}" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | head -c 400; echo " ..."
echo "== start_session"; curl -s "$URL" "${H[@]}" -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"start_session","arguments":{"goal":"investor presentation","minutes":120}}}'; echo
