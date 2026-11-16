#!/usr/bin/env bash
# Idempotent install of https://github.com/JDhruv14/line-art-animation (MIT). Needs network. Safe to re-run.
set -e; KIT="$(cd "$(dirname "$0")/.." && pwd)"; DEST="${1:-$KIT/vendor/line-art-animation}"
curl -sI -m 8 https://github.com >/dev/null 2>&1 || { echo "NO NETWORK: enable network access for the sandbox, then re-run: bash $0"; exit 1; }
mkdir -p "$(dirname "$DEST")"
if [ -d "$DEST/.git" ]; then git -C "$DEST" pull --ff-only; else git clone --depth 1 https://github.com/JDhruv14/line-art-animation "$DEST"; fi
NV=$(node -e 'const [a,b]=process.versions.node.split(".").map(Number);console.log(a>22||(a==22&&b>=18)?"ok":"old")'); echo "node: $(node -v) -> $NV (need >= 22.18)"
[ "$NV" = ok ] || { echo "Upgrade Node to >= 22.18"; exit 2; }
(cd "$DEST" && npm install --no-audit --no-fund && npm run typecheck)
mkdir -p "$HOME/.claude/skills" && [ -e "$HOME/.claude/skills/line-art-animation" ] || ln -s "$DEST" "$HOME/.claude/skills/line-art-animation"
echo "installed at $DEST"; echo "chrome/chromium for capture.ts:"; (command -v chromium || command -v google-chrome || echo "MISSING (set \$CHROME)")
