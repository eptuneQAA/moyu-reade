#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "moyu: Node.js 22+ is required to build the package." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "moyu: Node.js 22+ is required (current: $(node -v))." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  npm ci
fi

if [ "${MOYU_SKIP_TESTS:-0}" != "1" ]; then
  npm test
fi

npm run build:bundle
npm run build:web

rm -rf release
mkdir -p release

DPKG_FLAGS=()
if [ -n "${MOYU_DPKG_FLAGS:-}" ]; then
  # CI installs the build tools explicitly; allow -d to skip dpkg-checkbuilddeps.
  # shellcheck disable=SC2206
  DPKG_FLAGS=(${MOYU_DPKG_FLAGS})
fi

dpkg-buildpackage "${DPKG_FLAGS[@]}" -us -uc -b

VERSION="$(dpkg-parsechangelog -SVersion)"
DEB="$(ls -1 ../moyu_"${VERSION}"_*.deb 2>/dev/null | head -n 1)"
if [ -z "$DEB" ]; then
  echo "moyu: deb package was not produced." >&2
  exit 1
fi

mv "$DEB" "release/moyu_${VERSION}_all.deb"
rm -f ../moyu_"${VERSION}".dsc ../moyu_"${VERSION}"_*.changes ../moyu_"${VERSION}"_*.buildinfo

(
  cd release
  sha256sum "moyu_${VERSION}_all.deb" > SHA256SUMS
)

echo "Built: release/moyu_${VERSION}_all.deb"
echo "Checksum: release/SHA256SUMS"
