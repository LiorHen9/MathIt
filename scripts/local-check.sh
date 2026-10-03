#!/bin/bash
# Build and test without npm (npm is blocked in the Claude work environment).
# Preact comes from GitHub, bun builds, tsc type-checks, Playwright tests at phone size.
# Usage: scripts/local-check.sh <scratch-dir> [--no-e2e]
# Output: <scratch-dir>/dist (the site), <scratch-dir>/shots (screenshots).
# The real build is `npm run build` (Vite + vite-plugin-pwa) in GitHub Actions; this one has no
# manifest or Service Worker, and bun puts all CSS in main.css.
set -euo pipefail
S=$(realpath "${1:?scratch dir}")
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PREACT_TAG=10.29.8
mkdir -p "$S"

if [ ! -d "$S/preact" ]; then
  git clone -q --depth 1 --branch "$PREACT_TAG" https://github.com/preactjs/preact "$S/preact" 2>/dev/null
fi

cat > "$S/local.d.ts" <<'X'
declare module '*.css';
X
cat > "$S/tsconfig.local.json" <<X
{
  "extends": "$ROOT/tsconfig.json",
  "compilerOptions": {
    "types": [],
    "paths": {
      "preact": ["$S/preact/src/index.d.ts"],
      "preact/hooks": ["$S/preact/hooks/src/index.d.ts"],
      "preact/jsx-runtime": ["$S/preact/jsx-runtime/src/index.d.ts"]
    }
  },
  "include": ["$ROOT/src", "$S/local.d.ts"]
}
X
cat > "$S/tsconfig.bun.json" <<X
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "paths": {
      "preact": ["$S/preact/src/index.js"],
      "preact/hooks": ["$S/preact/hooks/src/index.js"],
      "preact/jsx-runtime": ["$S/preact/jsx-runtime/src/index.js"],
      "preact/jsx-dev-runtime": ["$S/preact/jsx-runtime/src/index.js"]
    }
  }
}
X

cd "$ROOT"
echo "== typecheck"
tsc -p "$S/tsconfig.local.json"

echo "== build"
VERSION=$(node -p "require('./package.json').version")
rm -rf "$S/dist" && mkdir -p "$S/dist"
# bun prints a harmless "Internal error: directory mismatch" line with --tsconfig-override.
bun build src/main.tsx --outdir "$S/dist" --splitting --minify --tsconfig-override="$S/tsconfig.bun.json" \
  --external '/fonts/*' --entry-naming '[name].[ext]' --chunk-naming 'chunk-[hash].[ext]' --asset-naming '[name]-[hash].[ext]' \
  --define "__APP_VERSION__=\"$VERSION\"" --define "__BUILD_TIME__=\"$(date -u +%FT%TZ)\"" --define '__COMMIT__=""' 2>&1 | grep -v 'directory mismatch' || true
[ -f "$S/dist/main.js" ] || { echo "build failed"; exit 1; }
cp -r public/* "$S/dist/"
sed -e 's#<script type="module" src="/src/main.tsx"></script>#<link rel="stylesheet" href="/main.css" /><script type="module" src="/main.js"></script>#' index.html > "$S/dist/index.html"
FIRST=0
for f in "$S/dist/main.js" "$S/dist/main.css" "$S/dist/index.html" "$S/dist/fonts/rubik.woff2"; do FIRST=$((FIRST + $(gzip -9c "$f" | wc -c))); done
echo "first load ≈ $((FIRST / 1024))KB gzip (budget 300KB)"

echo "== unit checks"
bun tests/core/check.ts
bun --tsconfig-override="$S/tsconfig.bun.json" tests/profiles/check.ts 2>&1 | grep -v "directory mismatch"
bun --tsconfig-override="$S/tsconfig.bun.json" tests/worlds/check.ts 2>&1 | grep -v 'directory mismatch'

if [ "${2:-}" != "--no-e2e" ]; then
  echo "== e2e"
  # An old server from another session may hold the port: always serve this build.
  pkill -f "[h]ttp.server 4173" 2>/dev/null || true
  (python3 -m http.server 4173 -d "$S/dist" >/dev/null 2>&1 &)
  sleep 1
  mkdir -p "$S/shots"
  for t in tests/e2e/phase*.cjs; do
    echo "-- $t"
    NODE_PATH=$(npm root -g) node "$t" "$S/shots"
  done
fi
echo "== all good"
