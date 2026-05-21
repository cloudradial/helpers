---
name: setup
description: >
  First-time setup wizard for the CloudRadial UCP plugin. Run this BEFORE any
  other CloudRadial work in a session — every other skill depends on it.
  Triggers: "set up CloudRadial", "configure the plugin", "connect to my portal",
  "I just installed the CloudRadial plugin", a `setup_status` result with
  `configured: false`, or ANY CloudRadial MCP tool failing with a "credentials
  not configured" / 401 / 403 error. Also run proactively at the start of any
  CloudRadial-related conversation if you haven't checked setup_status yet.
metadata:
  version: "2.0.0"
---

# CloudRadial UCP Setup Wizard

## What this plugin needs

The plugin ships with a local **MCP server** (`@cloudradial/ucp-mcp`) that talks to the CloudRadial API V2 on your behalf. Setup has two questions:

1. Is the MCP server reachable (i.e. did the MCP client load it)?
2. Are your CloudRadial API keys stored in the OS keychain?

There is **no Azure Function, no Chrome extension, no separate server to deploy**. The MCP server runs as a local Node process spawned by your MCP client (Claude Desktop, Claude Code, Cowork).

---

## Step 1 — Check current state

Call the `setup_status` MCP tool first. Don't ask the user any questions until you've checked.

**Three possible outcomes:**

| `setup_status` result | What it means | What to do |
|---|---|---|
| Tool not available / "Unknown tool" | MCP server isn't registered with the client | Go to Step 2 (register server) |
| `{configured: false, source: null}` | Server is loaded but keys aren't stored | Go to Step 3 (collect keys) |
| `{configured: true, source: "keychain", publicKeyHint: "...abcd"}` | Already configured | Go to Step 4 (verify) |
| `{configured: true, source: "env"}` | Configured via env vars (developer mode) | Go to Step 4 (verify) — don't overwrite their env config |

---

## Step 2 — Register the MCP server (if not already)

If the `setup_status` tool isn't available, the MCP server isn't registered with this client. The plugin's `plugin.json` declares it under `mcpServers`, so reinstalling/reloading the plugin usually fixes this. Tell the user:

> "The CloudRadial MCP server isn't loaded yet. Please reload the plugin (Cowork: re-drop the `.plugin` file; Claude Code: `/plugin reload cloudradial-ucp`; Claude Desktop: restart). Then say 'set up CloudRadial' again."

If the user is using a custom config (Claude Desktop `claude_desktop_config.json` or Claude Code `~/.claude.json`), the entry they need is:

```json
{
  "mcpServers": {
    "cloudradial-ucp": {
      "command": "npx",
      "args": ["-y", "@cloudradial/ucp-mcp"]
    }
  }
}
```

Then have them restart their MCP client and re-run setup.

---

## Step 3 — Collect and store the keys

### 3a. Find the keys

The user gets these from their CloudRadial admin portal: **Settings → API** → Public Key + Private Key. If they don't see this menu, they don't have admin access — direct them to whoever does.

### 3b. Privacy note (state this once, before asking)

Tell the user, verbatim or close:

> "I'll need your CloudRadial public and private keys. Once I store them, they go straight into your OS keychain (Windows Credential Manager / macOS Keychain / Linux libsecret) — encrypted at rest, accessible only to your user account. **However:** when you paste them here, the keys will briefly appear in this conversation's transcript. If you'd rather avoid that, you can instead set them as environment variables in your MCP client config (`CLOUDRADIAL_PUBLIC_KEY`, `CLOUDRADIAL_PRIVATE_KEY`) and skip this wizard. Continue?"

If the user wants the env-var path, point them at the README and stop. Otherwise continue.

### 3c. Ask for the keys

Use `AskUserQuestion` for each so the keys are entered through the structured input UI rather than as a regular chat message:

- **Question 1:** "Paste your CloudRadial **public key**."
- **Question 2:** "Paste your CloudRadial **private key**."
- **Question 3 (only if non-default):** "Which CloudRadial region? Default is US." Options: `https://api.us.cloudradial.com` (US), `https://api.eu.cloudradial.com` (EU), `Other`.

### 3d. Store via the MCP tool

Call `configure_credentials` with `public_key`, `private_key`, and `base_url` (if they chose EU or Other). The tool will:

1. Make a live `GET /v2/odata/company/$count` against CloudRadial to validate the keys.
2. If validation passes, write them to the OS keychain.
3. If validation fails (401/403), it returns an error WITHOUT writing — ask the user to re-check the keys and try again.

**Do not log, echo, or repeat the keys back** in your reply. After a successful call, the tool returns `publicKeyHint` (last 4 chars only) — use that for confirmation.

---

## Step 4 — Verify

Make one real call to prove end-to-end works:

- Call the `search_companies` tool with `name: "a"` (broad search).
- Expected: a small array of company objects.

**If it succeeds:** Confirm with the user using the `publicKeyHint` returned by `setup_status`:

> "You're all set. Credentials stored in your OS keychain (public key ends in `...{hint}`). Here are some things I can do — `look up [company name]`, `give me an overview of company [id]`, `audit the portal for [company]`, etc."

**If it fails after Step 3:** Surface the exact error from the MCP tool. Common issues:

| Symptom | Cause | Fix |
|---|---|---|
| 401/403 from CloudRadial | Wrong keys | Re-run Step 3 with corrected keys |
| Network error / DNS | Wrong base URL | Re-run with the correct region |
| Tool returns "credentials not configured" | Keychain write silently failed (rare; SSH/headless Linux without libsecret) | Tell user to set `CLOUDRADIAL_PUBLIC_KEY` / `CLOUDRADIAL_PRIVATE_KEY` env vars in their MCP client config as a fallback |

---

## Reconfiguring

To rotate keys or switch portals: just re-run this wizard. `configure_credentials` overwrites whatever's in the keychain.

To remove the credentials entirely: call the `clear_credentials` tool. Note this only clears the keychain — env-var-based config is unaffected.

---

## What you should NEVER do in this skill

- Don't read or write any `.cloudradial/config.json` file. That was the old (Azure Function) flow. Credentials now live only in the OS keychain.
- Don't try to run `az`, `func`, `git clone`, or any Azure commands. There is no Azure Function in this version of the plugin.
- Don't log the user's keys back to them in chat, even partially. Use `publicKeyHint` from `setup_status` for confirmation.
- Don't proceed with other CloudRadial work in the same turn if setup fails — fix setup first.
