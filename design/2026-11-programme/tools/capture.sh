#!/usr/bin/env sh
# Regenerate the prototype screenshots on macOS.
# Requires Google Chrome and python3.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PORT="${PORT:-8099}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$ROOT/screenshots"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at $CHROME" >&2
  exit 1
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/tmp/vx-design-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1

shot() {
  name=$1
  path=$2
  w=$3
  h=$4
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --user-data-dir="/tmp/vx-shot-$name" --virtual-time-budget=1000 \
    --window-size="$w,$h" --screenshot="/tmp/vx-$name.png" \
    "http://127.0.0.1:$PORT/$path" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 90 "/tmp/vx-$name.png" --out "$OUT/$name.jpg" >/dev/null
  echo "wrote screenshots/$name.jpg"
}

shot web-discover "web.html?capture=1#discover" 1440 900
shot web-library "web.html?capture=1#library" 1440 900
shot web-detail "web.html?capture=1#detail/693134" 1440 900
shot web-player "web.html?capture=1#player/693134" 1440 900
shot web-collections "web.html?capture=1#collections" 1440 900

shot admin-intake "admin.html?capture=1&view=intake" 1440 900
shot admin-catalog "admin.html?capture=1&view=catalog" 1440 900
shot admin-editor "admin.html?capture=1&view=editor" 1440 900
shot admin-settings "admin.html?capture=1&view=settings" 1440 900

shot mobile-board "mobile.html" 1440 900
shot mobile-discover "mobile.html?screen=discover&capture=1" 390 844
shot mobile-library "mobile.html?screen=library&capture=1" 390 844
shot mobile-series "mobile.html?screen=library&entity=series&capture=1" 390 844
shot mobile-collections "mobile.html?screen=collections&capture=1" 390 844
shot mobile-detail "mobile.html?screen=detail&capture=1" 390 844
shot mobile-filters "mobile.html?screen=filters&capture=1" 390 844
shot mobile-player "mobile.html?screen=player&capture=1" 390 844

shot hub "index.html?capture=1" 1440 900
