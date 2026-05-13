#!/bin/bash
# Build the cloudradial-ucp.plugin file for distribution
# Run from the repo root: ./scripts/build-plugin.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_NAME="cloudradial-ucp"

echo "Installing dependencies..."
cd "$ROOT_DIR/servers"
npm install --production
cd "$ROOT_DIR"

echo "Packaging plugin..."
rm -f "$ROOT_DIR/$PLUGIN_NAME.plugin"
zip -r "/tmp/$PLUGIN_NAME.plugin" . \
  -x "*.DS_Store" \
  -x ".git/*" \
  -x ".gitignore" \
  -x "scripts/*" \
  -x "*.plugin" \
  -x ".github/*"

mv "/tmp/$PLUGIN_NAME.plugin" "$ROOT_DIR/$PLUGIN_NAME.plugin"

SIZE=$(du -h "$ROOT_DIR/$PLUGIN_NAME.plugin" | cut -f1)
echo ""
echo "Built: $PLUGIN_NAME.plugin ($SIZE)"
echo "Upload this file as a GitHub Release asset, or share directly with partners."
