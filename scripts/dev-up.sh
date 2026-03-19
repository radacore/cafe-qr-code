#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/storage/logs"

mkdir -p "$LOG_DIR"

REVERB_PORT="$(awk -F= '/^REVERB_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"
APP_PORT="$(awk -F= '/^APP_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"
VITE_PORT="$(awk -F= '/^VITE_PORT=/{gsub(/"/,"",$2); print $2; exit}' "$ROOT_DIR/.env")"

if [[ -z "$REVERB_PORT" ]]; then REVERB_PORT="8081"; fi
if [[ -z "$APP_PORT" ]]; then APP_PORT="8000"; fi
if [[ -z "$VITE_PORT" ]]; then VITE_PORT="5173"; fi

start_if_needed() {
    local pattern="$1"
    local command="$2"
    local name="$3"

    if pgrep -f "$pattern" >/dev/null; then
        echo "$name already running"
        return
    fi

    nohup bash -lc "$command" >> "$LOG_DIR/$name.log" 2>&1 &
    sleep 1

    if pgrep -f "$pattern" >/dev/null; then
        echo "$name started"
    else
        echo "Failed to start $name. Check $LOG_DIR/$name.log"
        exit 1
    fi
}

start_if_needed "artisan reverb:start" "cd '$ROOT_DIR' && php artisan reverb:start --host=0.0.0.0 --port=$REVERB_PORT" "reverb"
start_if_needed "artisan serve" "cd '$ROOT_DIR' && php artisan serve --host=0.0.0.0 --port=$APP_PORT" "laravel-serve"
start_if_needed "vite --host localhost --port $VITE_PORT" "cd '$ROOT_DIR' && npm run dev -- --host localhost --port $VITE_PORT" "vite"

echo ""
echo "Dev services ready:"
echo "- App:    http://127.0.0.1:$APP_PORT"
echo "- Vite:   http://localhost:$VITE_PORT"
echo "- Reverb: ws://127.0.0.1:$REVERB_PORT"
