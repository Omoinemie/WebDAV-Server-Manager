#!/bin/bash
# WebDAV Config Manager startup script (Gunicorn)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SETTINGS="${SCRIPT_DIR}/settings.json"

# Read settings from settings.json
if [ -f "$SETTINGS" ]; then
    PORT=$(python3 -c "import json; print(json.load(open('$SETTINGS')).get('web_port', 3080))" 2>/dev/null || echo 3080)
else
    PORT=3080
fi

# Allow env override
PORT="${PORT:-3080}"
export SETTINGS_PATH="$SETTINGS"
export PORT="$PORT"
export SECRET_KEY="${SECRET_KEY:-$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "change-me")}"

echo "========================================="
echo "  WebDAV Config Manager (Gunicorn)"
echo "========================================="
echo "  Settings: $SETTINGS"
echo "  Port: $PORT"
echo "========================================="

cd "$SCRIPT_DIR"

#exec gunicorn3 -k gevent -w 4 -b 0.0.0.0:$PORT server:app --timeout 120 --access-logfile - --error-logfile -

python3 "$SCRIPT_DIR/server.py"
