# CloudRadial UCP Plugin — Deployment Guide

This plugin ships a bundled MCP server inside the `.plugin` file itself — no separate server to deploy, no npm package to install, no network access required at install time. Your MCP client extracts the plugin and spawns the bundled server (`server/index.mjs`) as a local Node process.

## Prerequisites

- **Node.js 18+** on the machine running your MCP client. Check with `node --version`. Install from <https://nodejs.org> if missing.
- **A CloudRadial admin account** with access to **Settings → API** (where you generate the public + private keys).
- **An MCP-capable Claude client**: Claude Desktop, Claude Code, or Cowork.

## Pick your `.plugin` file

The plugin is published as one `.plugin` per OS/arch — each contains a native keychain binary for that platform only. Pick the one that matches the machine running your MCP client:

| Your machine | File to download |
|---|---|
| Mac (M1/M2/M3/M4 — Apple Silicon) | `cloudradial-ucp-macos-arm64.plugin` |
| Mac (Intel) | `cloudradial-ucp-macos-x64.plugin` |
| Windows (most PCs) | `cloudradial-ucp-windows-x64.plugin` |
| Windows ARM (Surface Pro X, Copilot+ PCs) | `cloudradial-ucp-windows-arm64.plugin` |
| Linux x86_64 | `cloudradial-ucp-linux-x64.plugin` |
| Linux ARM64 | `cloudradial-ucp-linux-arm64.plugin` |

If you're not sure, on Mac run `uname -m` (`arm64` = Apple Silicon, `x86_64` = Intel); on Windows check Settings → System → About → System type. Grab the file from the [GitHub releases page](https://github.com/cloudradial/helpers/releases) of the plugin repo.

## Install — Cowork

1. Drag your downloaded `cloudradial-ucp-<os>.plugin` into your Cowork window.
2. Cowork prompts for plugin approval; accept.
3. Cowork restarts the MCP server bridge automatically.
4. In a new Cowork conversation, say **"Setup the CloudRadial Plugin."** The setup wizard handles the rest.

## Install — Claude Code

Download the `.plugin` for your OS, then from a terminal:

```bash
claude /plugin install /path/to/cloudradial-ucp-<os>.plugin
```

Restart Claude Code (or `/plugin reload cloudradial-ucp`). Confirm the MCP server loaded:

```bash
claude mcp list
```

You should see `cloudradial-ucp` in the list. Then in a new Claude Code conversation, say **"Setup the CloudRadial Plugin."**

## Install — Claude Desktop

1. Download the `.plugin` for your OS and drop it into Claude Desktop's plugins directory (or install via the plugin gallery if listed).
2. **Quit and reopen Claude Desktop** so it picks up the MCP server config.
3. In a new conversation, say **"Setup the CloudRadial Plugin."**

## Setup wizard — what to expect

The wizard (defined in `skills/setup/SKILL.md`) does the following:

1. **Checks the MCP server is loaded.** If `setup_status` isn't available, you'll be told to reload/restart your client.
2. **Asks where to get your keys.** CloudRadial admin portal → **Settings → API**.
3. **Asks you to paste the public + private keys** via the structured input UI.
4. **Asks for region** (defaults to US `https://api.us.cloudradial.com`; EU partners pick `https://api.eu.cloudradial.com`).
5. **Validates with a live API call** before writing anything. Bad keys never get saved.
6. **Stores credentials in your OS keychain.** Confirms with the last 4 chars of the public key.
7. **Verifies end-to-end** with a `search_companies` call. Tells you what to try first.

## Skipping the keychain (env-var credentials)

If you'd rather not store credentials via the wizard — for example, on a headless Linux box with no Secret Service running, or in a locked-down dev environment — the server reads these env vars before checking the keychain:

```
CLOUDRADIAL_PUBLIC_KEY=...
CLOUDRADIAL_PRIVATE_KEY=...
CLOUDRADIAL_BASE_URL=https://api.us.cloudradial.com   # optional, defaults to US
```

Set them in the OS environment **before** launching your MCP client (Cowork / Claude Code / Claude Desktop) and the server will pick them up. If both env vars and a keychain entry are present, env vars win.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `setup_status` tool isn't available | MCP server not registered with the client | Reinstall the plugin or restart your client. For Claude Code: `claude mcp list` to confirm. |
| `configure_credentials` returns 401/403 | Wrong CloudRadial keys | Re-check **Settings → API** in CloudRadial. The keys must be the V2 public + private pair. |
| "credentials not configured" on every call | Keychain write succeeded but read fails (rare; happens on Linux SSH sessions with no Secret Service running) | Switch to env-var credentials (see above) |
| Tool calls hang | MCP server process died | Restart your client. Check the client's MCP server log. |
| `node: command not found` in the client log | Node isn't on the GUI app's PATH | Install Node 18+ and ensure it's on the global PATH (not just your shell), then restart the MCP client. |

## Updating

Download the latest `cloudradial-ucp-<your-os>.plugin` from the [releases page](https://github.com/cloudradial/helpers/releases) and reinstall it the same way you installed the first one. Your stored credentials in the OS keychain survive the upgrade — no re-entering keys.

## Uninstalling

1. Remove the plugin from your MCP client (Cowork: remove from plugins panel; Claude Code: `claude /plugin uninstall cloudradial-ucp`; Claude Desktop: gallery → remove).
2. In a conversation, ask Claude to run `clear_credentials` to remove the keychain entries.

## Architecture details

- Source: [`../cloudradial-ucp-mcp/`](../cloudradial-ucp-mcp).
- Runtime: Node 18+, ESM. Shipped as a single esbuild-bundled `server/index.mjs` inside the `.plugin`.
- Auth to CloudRadial: HTTP Basic with `public:private`, base64-encoded.
- Credential storage: the `@napi-rs/keyring` native module (Windows Credential Manager / macOS Keychain / Linux libsecret). One platform's native binary ships per `.plugin` file.
- Transport: stdio MCP (single child process per session).

### Build-output layout

The keyring native module is shipped under `server/vendor/keyring/`, **not** `server/node_modules/`. The build vendors the `@napi-rs/keyring` wrapper to a flat, unscoped path and inlines the platform `.node` binary beside it (`server/vendor/keyring/keyring.<platform>.node`), then rewrites the bundle's `@napi-rs/keyring` import to `./vendor/keyring/index.js`. This is required because Cowork's plugin-upload validator rejects any zip entry whose path contains `@` (the npm scope separator), which scoped packages under `node_modules` can't avoid. The build also rewrites each zip entry's "version made by" byte to Unix (3) so strict macOS extractors accept the archive. Net result: every shipped `.plugin` has zero `@` in any path and no `node_modules/` directory.
