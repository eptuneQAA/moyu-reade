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
  echo "moyu: 需要 Node.js 22 或更高版本，但没找到可用的 node。" >&2
  echo "  当前系统 node: $(command -v node >/dev/null 2>&1 && node -v || echo '未安装')" >&2
  echo "  安装方式（任选其一）：" >&2
  echo "    1) nvm:  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash" >&2
  echo "             nvm install 22            # 之后 moyu 会自动在 ~/.config/nvm 下找到它" >&2
  echo "    2) 发行版仓库里有 nodejs>=22 时，装上即可" >&2
  exit 1
fi

export MOYU_WEB_DIR="${MOYU_WEB_DIR:-/usr/share/moyu/web}"
exec "$NODE_BIN" "${MOYU_LIB:-/usr/lib/moyu/moyu.bundle.js}" "$@"
