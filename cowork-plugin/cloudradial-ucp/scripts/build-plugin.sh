#!/bin/bash
# Build the cloudradial-ucp.plugin file for distribution
# Run from the repo root: ./scripts/build-plugin.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_NAME="cloudradial-ucp"

echo "Packaging plugin..."
rm -f "$ROOT_DIR/$PLUGIN_NAME.plugin"
zip -r "/tmp/$PLUGIN_NAME.plugin" . \
  -x "*.DS_Store" \
  -x ".git/*" \
  -x ".gitignore" \
  -x "scripts/*" \
  -x "*.plugin" \
  -x ".github/*" \
  -x "azure-mcp-server/*" \
  -x "servers/*" \
  -x ".mcp.json" \
  -x "references/swagger.json" \
  -x "node_modules/*"

mv "/tmp/$PLUGIN_NAME.plugin" "$ROOT_DIR/$PLUGIN_NAME.plugin"

SIZE=$(du -h "$ROOT_DIR/$PLUGIN_NAME.plugin" | cut -f1)
echo ""
echo "Built: $PLUGIN_NAME.plugin ($SIZE)"
echo ""
echo "This plugin file does NOT include the Azure Function server code."
echo "Users must deploy their own Azure Function separately — see DEPLOYMENT.md."
