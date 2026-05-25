#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' manifest.json | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

TAG="v$VERSION"
TITLE="KICK Log Tool $TAG"

if [[ -n "$(git status --short)" ]]; then
  echo "Working tree is not clean. Commit changes before publishing a release." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required. Install it with: brew install gh" >&2
  exit 1
fi

gh auth status >/dev/null

scripts/package-release.sh

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  git tag -a "$TAG" -m "$TITLE"
fi

git push origin main
git push origin "$TAG"

if gh release view "$TAG" >/dev/null 2>&1; then
  gh release upload "$TAG" dist/KICK-Log-Tool.zip "dist/KICK-Log-Tool-$TAG.zip" --clobber
else
  gh release create "$TAG" \
    dist/KICK-Log-Tool.zip \
    "dist/KICK-Log-Tool-$TAG.zip" \
    --title "$TITLE" \
    --notes "Release $TAG"
fi

echo "Published $TAG"
