# CloudRadial Codex Plugin

A Claude Code / Codex plugin that connects your AI assistant to the CloudRadial UCP Portal via a local MCP server. Query companies, users, endpoints, articles, feedback, and 27 other resource types — including full read/write support — directly from your AI conversations.

## Install

### Step 1 — Download the right file for your computer

Go to the [**releases page**](https://github.com/cloudradial/helpers/releases) and download the **one** file that matches your computer:

| Your computer | File to download |
|---|---|
| Mac — Apple Silicon (M1/M2/M3/M4) | `cloudradial-codex-macos-arm64.plugin` |
| Mac — Intel (older) | `cloudradial-codex-macos-x64.plugin` |
| Windows — most PCs | `cloudradial-codex-windows-x64.plugin` |
| Windows on ARM (Surface Pro X, Copilot+ PC) | `cloudradial-codex-windows-arm64.plugin` |
| Linux | `cloudradial-codex-linux-x64.plugin` (or `-linux-arm64`) |

**Not sure which Mac you have?** Click the Apple menu → **About This Mac**. If the "Chip" line starts with "Apple," choose **arm64**. If it says "Intel," choose **x64**.

### Step 2 — Install it

- **Claude Code:** run `claude /plugin install <path-to-the-downloaded-file>`, then restart Claude Code.
- **Claude Desktop:** drag the file into the app (or add it from the plugin gallery), then **quit and reopen** Claude Desktop.
- **Cowork:** drag the downloaded file into the Cowork window, and approve it when asked.

### Step 3 — Set it up

Start a new conversation and type:

> **Setup the CloudRadial Plugin**

Claude will ask for your CloudRadial **public key** and **private key** (find them in your CloudRadial admin portal under **Settings → API**), check that they work, and store them securely in your computer's keychain.

### Step 4 — Try something

Pick anything from the skills below, or just ask Claude in your own words.

## Skills (12)

| Skill | What it does |
|-------|--------------|
| **[setup](cloudradial-codex/skills/setup/)** | First-run plugin setup + credential management |
| **[portal-setup](cloudradial-codex/skills/portal-setup/)** | Walk a client through their 5-session CloudRadial implementation |
| **[portal-lookup](cloudradial-codex/skills/portal-lookup/)** | Look up companies, check portal status, prepare for meetings |
| **[content-management](cloudradial-codex/skills/content-management/)** | Create and manage KB articles, catalogs, menus |
| **[user-management](cloudradial-codex/skills/user-management/)** | Look up users by email/name, list users by company |
| **[endpoint-reporting](cloudradial-codex/skills/endpoint-reporting/)** | Device inventory, warranty reports, software audits |
| **[course-management](cloudradial-codex/skills/course-management/)** | Create training courses from topics, docs, or YouTube links |
| **[assessment-compliance](cloudradial-codex/skills/assessment-compliance/)** | Security assessments, compliance tracking |
| **[feedback-analysis](cloudradial-codex/skills/feedback-analysis/)** | CSAT trends, satisfaction reporting |
| **[service-management](cloudradial-codex/skills/service-management/)** | Services, domains, products |
| **[reporting-admin](cloudradial-codex/skills/reporting-admin/)** | Archives, certificates, company groups, API tokens |
| **[company-management](cloudradial-codex/skills/company-management/)** | Create, update, organize, and audit companies |

## Architecture

```
You in Claude Code / Codex
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

## Credentials & security

- **Stored in the OS keychain.** Never written to disk in plain text.
- **Validated before storage.** The setup wizard makes a live API call before saving.
- **Privacy note:** Keys pasted in chat appear briefly in the transcript. For more privacy, set `CLOUDRADIAL_PUBLIC_KEY` and `CLOUDRADIAL_PRIVATE_KEY` as environment variables instead.
- **EU partners:** use `https://api.eu.cloudradial.com` during setup.

## Requirements

- Node.js 18 or newer
- CloudRadial API public and private keys

## Documentation

- **[DEPLOYMENT.md](cloudradial-codex/DEPLOYMENT.md)** — Install steps and troubleshooting
- **[CAPABILITIES.md](cloudradial-codex/CAPABILITIES.md)** — Tool reference with examples
- **[references/api-reference.md](cloudradial-codex/references/api-reference.md)** — CloudRadial API V2 field-level schema

## License

MIT
