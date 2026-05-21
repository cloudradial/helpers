# CloudRadial UCP Cowork Plugin

A Claude Code / Cowork / Claude Desktop plugin that connects your AI assistant to the CloudRadial UCP Portal via a local MCP server. Query companies, users, endpoints, articles, feedback, and 27 other resource types — including full read/write support — directly from your AI conversations.

## What's here

- **[`cloudradial-ucp/`](cloudradial-ucp)** — the plugin itself: 11 skills covering portal lookup, content management, endpoint reporting, course management, assessment compliance, feedback analysis, service management, reporting/admin, and an interactive setup wizard. The MCP server (`@cloudradial/ucp-mcp`) is bundled inside at `cloudradial-ucp/mcp-server/` so partners get a single drag-and-drop install — no Azure deployment, no Chrome extension, no separate server to host.

## Quick start

**For partners installing the plugin:**

1. Download the latest `.plugin` from [GitHub Releases](https://github.com/cloudradial/helpers/releases).
2. Drag it into Cowork (or `/plugin install` in Claude Code; install via gallery in Claude Desktop).
3. In a new conversation, say **"Set up CloudRadial."** The setup wizard collects your API keys, validates them with a live call, and stores them encrypted in your OS keychain.
4. Start using it — *"Look up Acme Corp"*, *"Give me an overview of company 42"*, *"Create a KB article about password resets"*, etc.

The first MCP tool call after install takes ~10 seconds while the bundled MCP server installs its production dependencies locally; subsequent calls are instant.

**For developers / contributors:**

```bash
git clone https://github.com/cloudradial/helpers.git
cd helpers/cowork-plugin/cloudradial-ucp/mcp-server
npm install
npm run build
```

Then point your MCP client at `cloudradial-ucp/mcp-server/launch.cjs` (see [DEPLOYMENT.md](cloudradial-ucp/DEPLOYMENT.md#manual-install-advanced) for client-specific config).

## Architecture at a glance

```
You in Cowork/Claude
       |
       |  MCP tool calls (stdio JSON-RPC)
       v
mcp-server/launch.cjs  (auto-installs deps on first run)
       |
       |  spawns
       v
mcp-server/dist/index.js  (the MCP server)
       |
       |  HTTPS + HTTP Basic auth (keys from OS keychain)
       v
CloudRadial API V2
```

## Documentation

- **[cloudradial-ucp/README.md](cloudradial-ucp/README.md)** — plugin overview: skills, MCP tools, supported resources.
- **[cloudradial-ucp/DEPLOYMENT.md](cloudradial-ucp/DEPLOYMENT.md)** — install steps for Cowork, Claude Code, and Claude Desktop, plus troubleshooting.
- **[cloudradial-ucp/CAPABILITIES.md](cloudradial-ucp/CAPABILITIES.md)** — tool reference with examples.
- **[cloudradial-ucp/mcp-server/README.md](cloudradial-ucp/mcp-server/README.md)** — MCP server details (for developers).
- **[cloudradial-ucp/references/api-reference.md](cloudradial-ucp/references/api-reference.md)** — CloudRadial API V2 field-level schema reference.

## Legacy Azure Function

`cloudradial-ucp/azure-mcp-server/` retains the pre-v2.0 Azure Function proxy as a deprecation reference. No skill or current configuration references it; it will be removed in a future release. Partners on v1.x can keep their Azure deployment running until they upgrade, then decommission it.

## License

MIT
