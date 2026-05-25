#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_NAME="KICK-Log-Tool"
STAGING_PARENT="$(mktemp -d)"
STAGING_DIR="$STAGING_PARENT/$PACKAGE_NAME"

cleanup() {
  rm -rf "$STAGING_PARENT"
}
trap cleanup EXIT

VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$ROOT_DIR/manifest.json" | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
rm -f "$DIST_DIR/$PACKAGE_NAME.zip" "$DIST_DIR/$PACKAGE_NAME-v$VERSION.zip"
mkdir -p "$STAGING_DIR"

rsync -a \
  --exclude=".git" \
  --exclude=".DS_Store" \
  --exclude="*.log" \
  --exclude="*.zip" \
  --exclude="dist" \
  --exclude="build" \
  --exclude="node_modules" \
  "$ROOT_DIR/" "$STAGING_DIR/"

(
  cd "$STAGING_PARENT"
  zip -qr "$DIST_DIR/$PACKAGE_NAME.zip" "$PACKAGE_NAME"
)

cp "$DIST_DIR/$PACKAGE_NAME.zip" "$DIST_DIR/$PACKAGE_NAME-v$VERSION.zip"

echo "Created:"
echo "  $DIST_DIR/$PACKAGE_NAME.zip"
echo "  $DIST_DIR/$PACKAGE_NAME-v$VERSION.zip"
