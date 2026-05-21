# CloudRadial UCP Plugin — Deployment Guide

This plugin ships an MCP server config in `.claude-plugin/plugin.json` plus the MCP server source under `mcp-server/`. On first use, a small bootstrap (`mcp-server/launch.cjs`) installs production dependencies locally and starts the server — no Azure Function to deploy, no npm package to install yourself.

## Prerequisites

- **Node.js 18+** on the machine running your MCP client. Check with `node --version`. Install from <https://nodejs.org> if missing.
- **A CloudRadial admin account** with access to **Settings → API** (where you generate the public + private keys).
- **An MCP-capable Claude client**: Claude Desktop, Claude Code, or Cowork.

The first MCP tool call may take 5–10 seconds while `npx` downloads the package; subsequent calls are instant.

## Install — Cowork

1. Drag `cloudradial-ucp.plugin` into your Cowork window.
2. Cowork prompts for plugin approval; accept.
3. Cowork restarts the MCP server bridge automatically.
4. In a new Cowork conversation, say **"Set up CloudRadial."** The setup wizard handles the rest.

## Install — Claude Code

```bash
claude /plugin install cloudradial-ucp
```

Then restart Claude Code (or `/plugin reload cloudradial-ucp`). Confirm the MCP server loaded:

```bash
claude mcp list
```

You should see `cloudradial-ucp` in the list. Then in a new Claude Code conversation, say **"Set up CloudRadial."**

## Install — Claude Desktop

1. Install the plugin via the Claude Desktop plugin gallery (or manually drop the `.plugin` file in the plugins directory).
2. **Quit and reopen Claude Desktop** so it picks up the MCP server config.
3. In a new conversation, say **"Set up CloudRadial."**

## Setup wizard — what to expect

The wizard (defined in `skills/setup/SKILL.md`) does the following:

1. **Checks the MCP server is loaded.** If `setup_status` isn't available, you'll be told to reload/restart your client.
2. **Asks where to get your keys.** CloudRadial admin portal → **Settings → API**.
3. **Asks you to paste the public + private keys** via the structured input UI.
4. **Asks for region** (defaults to US `https://api.us.cloudradial.com`; EU partners pick `https://api.eu.cloudradial.com`).
5. **Validates with a live API call** before writing anything. Bad keys never get saved.
6. **Stores credentials in your OS keychain.** Confirms with the last 4 chars of the public key.
7. **Verifies end-to-end** with a `search_companies` call. Tells you what to try first.

## Manual install (advanced)

If you can't or don't want to use the plugin format, you can register the MCP server directly with your client.

If you've extracted the plugin contents somewhere on disk (e.g. `~/cloudradial-ucp/`), you can point an MCP client at the bundled launcher directly. Substitute `<plugin-path>` for the absolute path to the extracted `cloudradial-ucp/` directory.

### Claude Desktop — `claude_desktop_config.json`

Open via **Settings → Developer → Edit Config**:

```json
{
  "mcpServers": {
    "cloudradial-ucp": {
      "command": "node",
      "args": ["<plugin-path>/mcp-server/launch.cjs"]
    }
  }
}
```

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add cloudradial-ucp -- node <plugin-path>/mcp-server/launch.cjs
```

### Env-var-based credentials (skip the wizard)

If you'd rather not have your keys pass through a chat conversation, add them as environment variables instead of using `configure_credentials`:

```json
{
  "mcpServers": {
    "cloudradial-ucp": {
      "command": "node",
      "args": ["<plugin-path>/mcp-server/launch.cjs"],
      "env": {
        "CLOUDRADIAL_PUBLIC_KEY": "...",
        "CLOUDRADIAL_PRIVATE_KEY": "...",
        "CLOUDRADIAL_BASE_URL": "https://api.us.cloudradial.com"
      }
    }
  }
}
```

The server reads env vars first; if set, it skips the keychain entirely.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `setup_status` tool isn't available | MCP server not registered with the client | Reinstall the plugin or restart your client. For Claude Code: `claude mcp list` to confirm. |
| First tool call is slow (~10–30 s) | Bootstrap is running `npm install` for production deps | Normal one-time cost. Watch for `[cloudradial-ucp-mcp] Dependencies installed.` in the MCP server log. Subsequent spawns are <1 s. |
| `configure_credentials` returns 401/403 | Wrong CloudRadial keys | Re-check **Settings → API** in CloudRadial. The keys must be the V2 public + private pair. |
| "credentials not configured" on every call | Keychain write succeeded but read fails (rare; happens on Linux SSH sessions with no Secret Service running) | Switch to env-var config (see above) |
| Tool calls hang | MCP server process died | Restart your client. Check the client's MCP server log. |
| `npm install failed` in bootstrap log | Bootstrap couldn't reach the npm registry on first run | Open a terminal, `cd` to `<plugin>/mcp-server`, run `npm install --omit=dev --ignore-scripts` manually, then retry. |

## Updating

Reinstall the latest plugin from [GitHub Releases](https://github.com/cloudradial/helpers/releases) (drag the new `.plugin` file into Cowork, or `/plugin update cloudradial-ucp` in Claude Code). Your stored credentials in the OS keychain survive updates — no need to re-run the setup wizard.

If you want to force the bundled MCP server to refresh its deps after a major version bump, delete `mcp-server/.install-complete` and `mcp-server/node_modules` from the installed plugin location; the next spawn will reinstall.

## Uninstalling

1. Remove the plugin from your MCP client (Cowork: remove from plugins panel; Claude Code: `claude /plugin uninstall cloudradial-ucp`; Claude Desktop: gallery → remove).
2. In a conversation, ask Claude to run `clear_credentials` to remove the keychain entries.

## Architecture details

- Source: [`mcp-server/`](mcp-server) (bundled inside the plugin).
- Runtime: Node 18+, ESM, TypeScript-compiled to `dist/`.
- Auth to CloudRadial: HTTP Basic with `public:private`, base64-encoded.
- Credential storage: `@napi-rs/keyring` (Windows Credential Manager / macOS Keychain / Linux libsecret).
- Transport: stdio MCP (single child process per session).
