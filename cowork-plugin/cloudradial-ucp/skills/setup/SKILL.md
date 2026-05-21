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
  version: "2.1.0"
---

# CloudRadial UCP Setup Wizard

The plugin ships with a local MCP server (bundled at `mcp-server/launch.cjs`) that talks to the CloudRadial API V2 on your behalf. Setup has three real questions:

1. Is **Node.js 18+** installed on this machine? (the bundled MCP server runs on Node)
2. Is the **MCP server reachable** to the MCP client?
3. Are your CloudRadial API keys stored in the **OS keychain**?

There is no Azure Function, no Chrome extension, no separate server to deploy.

---

## Step 1 — Probe the environment

Call the `setup_status` MCP tool FIRST. Don't ask the user anything until you've seen what it returns. Three outcomes:

### Outcome A — Tool not available / "Unknown tool: setup_status"

The MCP server isn't loaded into this client. Two possible causes: **the plugin isn't registered**, or **the MCP server crashed during spawn** (almost always because Node.js isn't installed).

Don't guess — use AskUserQuestion to determine the OS, then go to Step 2.

### Outcome B — Tool returns `{configured: false, ...}`

MCP server is running. Read the returned `platform.platform` (`darwin` | `win32` | `linux`) to know the OS. Check `keychain.ok`. Then go to Step 3.

### Outcome C — Tool returns `{configured: true, ...}`

Already configured. Confirm with the `publicKeyHint` (last 4 chars of the public key) and skip to Step 4 to verify the connection still works. Don't re-collect keys unless the user explicitly says they want to rotate.

If `source: "env"` (developer mode — keys set via env vars in the MCP client config), don't try to overwrite. Tell the user the env config is taking precedence and they'd need to remove those env vars first if they want to switch to keychain storage.

---

## Step 2 — Prerequisites (only if MCP server isn't loaded)

### 2a. Ask the OS

Use AskUserQuestion with options: **macOS**, **Windows**, **Linux**.

### 2b. Verify Node.js 18+ is installed

Ask the user to run, in their terminal:

| OS | Command |
|---|---|
| macOS | `node --version` (in Terminal or iTerm) |
| Windows | `node --version` (in PowerShell or Windows Terminal) |
| Linux | `node --version` |

Expected: `v18.x.x` or higher (v20 LTS or v22 LTS preferred). If they get "command not found" or a version below 18, walk them through install:

#### Install Node.js — macOS

Easiest path is the official installer:
- Visit <https://nodejs.org> and download the **LTS** `.pkg` installer.
- Double-click → follow the prompts.

Or via Homebrew, if they already have it:
```bash
brew install node@20
```

After installing, **open a new terminal window** and re-run `node --version`.

#### Install Node.js — Windows

Easiest path is the installer:
- Visit <https://nodejs.org> and download the **LTS** `.msi` installer.
- Run it → accept defaults → finish.

Or via `winget` (built into Windows 10/11):
```powershell
winget install OpenJS.NodeJS.LTS
```

After installing, **close and reopen any terminals or your MCP client** so the new PATH is picked up.

#### Install Node.js — Linux

Use [NodeSource](https://github.com/nodesource/distributions) for the LTS:

```bash
# Debian / Ubuntu
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora / RHEL
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo -E bash -
sudo dnf install -y nodejs
```

### 2c. Make sure the plugin is registered

The plugin's `plugin.json` declares the MCP server under `mcpServers`. If the client doesn't show the server, try:

| MCP client | What to do |
|---|---|
| **Cowork** | Re-drop the `.plugin` file into the Cowork window. Cowork re-registers the MCP server config on plugin install. |
| **Claude Code** | Run `/plugin reload cloudradial-ucp`. Confirm with `claude mcp list`. |
| **Claude Desktop (macOS)** | Cmd+Q to fully quit, then reopen. (Just closing the window leaves the daemon running.) |
| **Claude Desktop (Windows)** | Right-click the Claude tray icon → **Quit**, then reopen. |
| **Claude Desktop (Linux)** | Quit from the app menu, then reopen. |

### 2d. Re-probe

After Node is installed and the client restarted, ask the user to come back and say "set up CloudRadial" again. Then start over from Step 1.

If `setup_status` is now available, continue to Step 3. If still not: the MCP server is failing to start on launch. Check the MCP client's server log for the actual error — common ones include "EACCES" (permissions), "ENOENT: node" (Node still not on PATH for that process), or a Node version that's too old. **Linux note:** if `keychain.ok` is false with an error like "could not connect to Secret Service", the user is on a headless system without `gnome-keyring` or `kwallet` running. They'll need to install one (`sudo apt-get install gnome-keyring`) and start it for the current session, OR fall back to env-var-based credentials in their MCP client config (see Step 3a).

---

## Step 3 — Collect and store the keys

Branch on the `platform.platform` value returned by `setup_status`, plus the `keychain.ok` value.

### 3a. If `keychain.ok` is false

The OS keychain isn't usable on this machine. This is essentially never an issue on macOS or Windows — those backends are always available. It does happen on Linux (no libsecret daemon, headless SSH, container, etc.).

Tell the user:

> "The MCP server can't reach an OS keychain on this Linux system (error: *{keychain.error}*). Two options:
>
> 1. **Install and start a Secret Service provider** — usually `gnome-keyring` (`sudo apt-get install gnome-keyring`, then log out/in) or `kwallet` for KDE.
> 2. **Skip the keychain and use environment variables** — add `CLOUDRADIAL_PUBLIC_KEY` and `CLOUDRADIAL_PRIVATE_KEY` to your MCP client config under the `env` block for this server. Then restart the client. The server reads env vars first if set."

Stop the wizard until they pick a path. If they choose option 2, walk them through editing their config and re-checking `setup_status`.

### 3b. Find the keys

The user gets these from their CloudRadial admin portal: **Settings → API** → Public Key + Private Key. If the menu isn't visible, they don't have admin access — direct them to whoever does.

### 3c. Privacy note (state once, before asking)

Tell the user, verbatim or close:

> "I need your CloudRadial public and private keys. Once I have them, they go straight into your **{keychainBackend}** — encrypted at rest, accessible only to your user account. **But** when you paste them here, the keys will briefly appear in this conversation's transcript. If you'd rather avoid that, you can instead set them as environment variables in your MCP client config (`CLOUDRADIAL_PUBLIC_KEY`, `CLOUDRADIAL_PRIVATE_KEY`) and skip this wizard. Continue?"

Substitute `{keychainBackend}` with the value from `setup_status.platform.keychainBackend` ("macOS Keychain", "Windows Credential Manager", or "libsecret / Secret Service").

### 3d. Ask for the keys

Use `AskUserQuestion` for each so the keys arrive through the structured-input UI rather than as a normal chat message:

- **Question 1:** "Paste your CloudRadial **public key**."
- **Question 2:** "Paste your CloudRadial **private key**."
- **Question 3 (only if their portal isn't on the US default):** "Which CloudRadial region?" Options: `https://api.us.cloudradial.com` (US), `https://api.eu.cloudradial.com` (EU), `Other`.

### 3e. Store via the MCP tool

Call `configure_credentials` with `public_key`, `private_key`, and `base_url` (if EU or Other). The tool:

1. Makes a live `GET /v2/odata/company/$count` against CloudRadial to validate.
2. If validation passes → writes to the OS keychain.
3. If validation fails (401/403) → returns an error WITHOUT writing. Ask the user to re-check the keys and try again.

**Do not log, echo, or repeat the keys back** in your reply. The tool returns `publicKeyHint` (last 4 chars only) after success — use that for confirmation.

---

## Step 4 — Verify end-to-end

Make one real call to prove the full stack works:

- Call `search_companies` with `name: "a"` (broad search).
- Expected: a small array of company objects.

### If it succeeds

Confirm with the platform-aware summary, substituting `{label}`, `{keychainBackend}`, and `{publicKeyHint}` from `setup_status`:

> "You're all set on **{label}**. Credentials stored in **{keychainBackend}** (public key ends in `...{publicKeyHint}`). Here are some things I can do — *Look up [company name]*, *Give me an overview of company [id]*, *Audit the portal for [company]*, etc."

### If it fails

Surface the exact error from the MCP tool. Common issues:

| Symptom | Cause | Fix |
|---|---|---|
| 401/403 from CloudRadial | Wrong keys | Re-run Step 3 with corrected keys |
| Network error / DNS | Wrong base URL | Re-run Step 3 with the correct region |
| Tool returns "credentials not configured" right after writing | Keychain write silently failed | Re-check `setup_status.keychain.ok` and `.error`; switch to env-var config (Step 3a, option 2) |

---

## Reconfiguring

To rotate keys or switch portals: re-run this wizard. `configure_credentials` overwrites whatever's in the keychain.

To remove the credentials entirely: call the `clear_credentials` tool. This only clears the keychain — env-var-based config is unaffected.

---

## What you should NEVER do in this skill

- Don't read or write any `.cloudradial/config.json` file. That was the old (Azure Function) flow. Credentials now live only in the OS keychain or env vars.
- Don't try to run `az`, `func`, `git clone`, or any Azure commands. There is no Azure Function in this version of the plugin.
- Don't log the user's keys back to them in chat, even partially. Use `publicKeyHint` from `setup_status` for confirmation.
- Don't proceed with other CloudRadial work in the same turn if setup fails — fix setup first.
- Don't assume the platform — always read `setup_status.platform.platform` if the tool is available, or ask via AskUserQuestion if it isn't.
