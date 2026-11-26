#!/usr/bin/env sh
# Regenerate screenshots for the code-driven design prototype.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PORT="${PORT:-8109}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$ROOT/screenshots"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at $CHROME" >&2
  exit 1
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/tmp/vx-film-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1

shot() {
  name=$1
  path=$2
  w=$3
  h=$4
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --user-data-dir="/tmp/vx-film-$name" --virtual-time-budget=1000 \
    --window-size="$w,$h" --screenshot="/tmp/vx-film-$name.png" \
    "http://127.0.0.1:$PORT/$path" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 90 "/tmp/vx-film-$name.png" --out "$OUT/$name.jpg" >/dev/null
  echo "screenshots/$name.jpg"
}

shot web-discover "web.html?capture=1#discover" 1440 900
shot web-library "web.html?capture=1#library" 1440 900
shot web-detail "web.html?capture=1#detail/693134" 1440 900
shot web-player "web.html?capture=1#player/693134" 1440 900
shot web-collections "web.html?capture=1#collections" 1440 900
shot web-profile "web.html?capture=1#profile" 1440 900

shot admin-intake "admin.html?capture=1&view=intake" 1440 900
shot admin-intake-drawer "admin.html?capture=1&view=intake&drawer=d1" 1440 900
shot admin-media "admin.html?capture=1&view=media" 1440 900
shot admin-media-cards "admin.html?capture=1&view=media&mode=poster" 1440 900
shot admin-people "admin.html?capture=1&view=people" 1440 900
shot admin-person "admin.html?capture=1&view=person&record=1190668" 1440 900
shot admin-franchises "admin.html?capture=1&view=franchises" 1440 900
shot admin-franchise "admin.html?capture=1&view=franchise&record=1" 1440 900
shot admin-categories "admin.html?capture=1&view=categories" 1440 900
shot admin-tags "admin.html?capture=1&view=tags" 1440 900
shot admin-organizations "admin.html?capture=1&view=organizations" 1440 900
shot admin-collections "admin.html?capture=1&view=collections" 1440 900
shot admin-jobs "admin.html?capture=1&view=jobs" 1440 900
shot admin-settings "admin.html?capture=1&view=settings" 1440 900
shot admin-enrich "admin.html?capture=1&view=enrich" 1440 900
shot admin-archive "admin.html?capture=1&view=archive" 1440 900
shot admin-editor "admin.html?capture=1&view=editor" 1440 900
shot admin-editor-versions "admin.html?capture=1&view=editor&tab=版本与文件" 1440 900

shot mobile-board "mobile.html" 1440 900
shot mobile-discover "mobile.html?screen=discover&capture=1" 390 844
shot mobile-library "mobile.html?screen=library&capture=1" 390 844
shot mobile-series "mobile.html?screen=library&entity=series&capture=1" 390 844
shot mobile-collections "mobile.html?screen=collections&capture=1" 390 844
shot mobile-profile "mobile.html?screen=profile&capture=1" 390 844
shot mobile-detail "mobile.html?screen=detail&capture=1" 390 844
shot mobile-filters "mobile.html?screen=filters&capture=1" 390 844
shot mobile-player "mobile.html?screen=player&capture=1" 390 844

shot hub "index.html?capture=1" 1440 900
