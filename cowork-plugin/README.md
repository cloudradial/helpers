# Cowork Plugin — Claude Desktop Integration for CloudRadial

## Why This Matters

Claude Desktop's Cowork mode lets you talk to an AI assistant that can read, write, and interact with your tools — but out of the box it doesn't know anything about CloudRadial. This plugin bridges that gap. Once installed, Claude can directly query your CloudRadial portal: look up companies, check endpoint counts, create KB articles, review feedback, audit portal content, and more — all through natural conversation.

Instead of switching between the CloudRadial admin portal, spreadsheets, and notes, you ask Claude what you need and it pulls the answer from your live portal data. It covers all 29 resource types in the CloudRadial API V2 (companies, users, articles, endpoints, catalogs, assessments, feedback, services, courses, and more).

## Who This Is For

- **Partners managing client portals** — Get instant answers about any company's setup without navigating the admin UI. "How many endpoints does Contoso have?" "Which companies have zero articles?"
- **CSMs preparing for meetings** — Pull a full company overview (users, endpoints, articles, feedback) in seconds before a call.
- **Partners building portal content** — Create and update KB articles, service catalogs, and course content directly through conversation.
- **Anyone who wants to work faster in CloudRadial** — If you can describe what you need in plain English, Claude can do it through the API.

## What You'll Need

- **Claude Desktop** with Cowork mode (requires a Claude Pro, Team, or Enterprise subscription)
- **CloudRadial API credentials** — your Public Key and Private Key from Settings > API in your CloudRadial portal
- **Node.js 18+** installed on your computer (the plugin runs a local MCP server)

## Quick Start

### Option 1: Install the Pre-Built Plugin

1. Download `cloudradial-ucp.plugin` from the [latest GitHub Release](../../releases)
2. Open Claude Desktop and start a Cowork session
3. Drag the `.plugin` file into the chat window and click **Accept**
4. Claude will detect the missing API keys and walk you through setup automatically

### Option 2: Build from Source

1. Clone this repo and navigate to the plugin folder:
   ```bash
   cd cowork-plugin/cloudradial-ucp
   ```
2. Install dependencies:
   ```bash
   cd servers && npm install --production && cd ..
   ```
3. Build the plugin:
   ```bash
   chmod +x scripts/build-plugin.sh && ./scripts/build-plugin.sh
   ```
4. Install the generated `cloudradial-ucp.plugin` file in Claude Desktop

## Setting Your API Credentials

The plugin reads your credentials from environment variables. Set them once and they persist across sessions.

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PUBLIC_KEY', 'YOUR_PUBLIC_KEY', 'User')
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PRIVATE_KEY', 'YOUR_PRIVATE_KEY', 'User')
```

**macOS / Linux:**
```bash
echo 'export CLOUDRADIAL_PUBLIC_KEY="YOUR_PUBLIC_KEY"' >> ~/.zshrc
echo 'export CLOUDRADIAL_PRIVATE_KEY="YOUR_PRIVATE_KEY"' >> ~/.zshrc
source ~/.zshrc
```

Then **restart Claude Desktop** so it picks up the new variables.

> **Regional portals:** If your portal is not on the US instance, also set `CLOUDRADIAL_BASE_URL` to your region's API URL (e.g., `https://api.eu.cloudradial.com`).

## What's Inside

### MCP Tools (what Claude can call)

| Tool | What it does |
|------|-------------|
| `list_resources` | List any resource type with OData filtering, sorting, and pagination |
| `count_resources` | Get counts of any resource type |
| `get_resource` | Retrieve a single resource by ID |
| `create_resource` | Create a new resource |
| `update_resource` | Full or partial update |
| `delete_resource` | Delete a resource |
| `company_overview` | Full snapshot — company details, user count, endpoint count, recent articles, recent feedback |
| `search_companies` | Quick company name search |
| `user_lookup` | Find users by email, name, or company |
| `manage_tokens` | List, create, get, or revoke API tokens |
| `raw_api_call` | Direct API call for anything not covered above |

### Skills (conversational workflows)

| Skill | Trigger phrases |
|-------|----------------|
| **setup** | "Set up CloudRadial", "connect to my portal" — also auto-triggers on auth errors |
| **portal-lookup** | "Look up [company]", "check portal status", "prepare for my meeting with [company]" |
| **content-management** | "Create an article for [company]", "audit portal content", "set up a service catalog" |

### API Reference

The plugin bundles the full CloudRadial API V2 OpenAPI spec (`references/swagger.json`) and a compact reference (`references/api-reference.md`) so Claude knows every field name, type, and constraint when constructing API calls.

## Example Conversations

Once installed, just talk to Claude naturally:

- "Show me all my companies in CloudRadial"
- "How many endpoints does Acme Corp have?"
- "Create a KB article for Contoso about how to reset MFA"
- "Which companies have zero published articles?"
- "Give me a full overview of company 42 before my call"
- "List all feedback from the last month"
- "What courses are available for company 15?"

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" or 401 error | API keys are wrong or not set. Re-run the PowerShell commands and restart Claude Desktop. |
| "Connection refused" or timeout | Check `CLOUDRADIAL_BASE_URL` — you may need a different regional endpoint. |
| "Cannot find module" | Run `cd servers && npm install --production` in the plugin directory. |
| Keys work in Swagger but not here | Restart Claude Desktop — env vars only load at app startup. |
