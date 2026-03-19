#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REVERB_PORT="$(awk -F= '/^REVERB_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"
APP_PORT="$(awk -F= '/^APP_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"
VITE_PORT="$(awk -F= '/^VITE_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"

if [[ -z "$REVERB_PORT" ]]; then REVERB_PORT="8081"; fi
if [[ -z "$APP_PORT" ]]; then APP_PORT="8000"; fi
if [[ -z "$VITE_PORT" ]]; then VITE_PORT="5173"; fi

stop_if_running() {
    local pattern="$1"
    local name="$2"

    if pgrep -f "$pattern" >/dev/null; then
        pkill -f "$pattern"
        sleep 1

        if pgrep -f "$pattern" >/dev/null; then
            echo "Failed to stop $name"
            exit 1
        fi

        echo "$name stopped"
    else
        echo "$name not running"
    fi
}

stop_if_running "artisan reverb:start --host=0.0.0.0 --port=$REVERB_PORT" "reverb"
stop_if_running "artisan serve --host=0.0.0.0 --port=$APP_PORT" "laravel-serve"
stop_if_running "vite --host localhost --port $VITE_PORT" "vite"

echo ""
echo "Dev services stopped."
