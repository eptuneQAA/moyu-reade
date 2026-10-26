#!/bin/sh
set -e

find_major() {
  "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0
}

NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ] && command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
fi

if [ -n "$NODE_BIN" ]; then
  major="$(find_major "$NODE_BIN")"
  if [ "$major" -lt 22 ] 2>/dev/null; then
    NODE_BIN=""
  fi
fi

if [ -z "$NODE_BIN" ]; then
  for candidate in \
    "$HOME"/.config/nvm/versions/node/*/bin/node \
    "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$candidate" ] || continue
    major="$(find_major "$candidate")"
    if [ "$major" -ge 22 ] 2>/dev/null; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo "moyu: 需要 Node.js 22 或更高版本（可以用 nvm 安装）。" >&2
  exit 1
fi

export MOYU_WEB_DIR="${MOYU_WEB_DIR:-/usr/share/moyu/web}"
exec "$NODE_BIN" "${MOYU_LIB:-/usr/lib/moyu/moyu.bundle.js}" "$@"
