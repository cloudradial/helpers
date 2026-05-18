---
name: setup
description: >
  Guide a partner through first-time setup of the CloudRadial UCP plugin.
  Use when the user says "set up CloudRadial", "configure the plugin",
  "connect to my portal", "I just installed the CloudRadial plugin",
  or when any CloudRadial API call fails with an authentication error,
  missing config, or "YOUR-FUNCTION-NAME" / "YOUR_FUNCTION_KEY" placeholder message.
  Also trigger proactively if the user tries to use a CloudRadial tool and
  gets an error about missing credentials, 401, or placeholder values.
metadata:
  version: "1.2.0"
---

# CloudRadial UCP Plugin — Interactive Setup Wizard

## Overview

This plugin has two parts that work together:

1. **This plugin** (already installed) — 10 skill files that teach Claude how to look up companies, manage articles, audit portals, create courses, analyze endpoints, and more. These skills make API calls to an Azure Function that YOU host.

2. **An Azure Function** (NOT included in the plugin) — A small server you deploy to your own Azure subscription. It sits between Cowork and the CloudRadial API, holding your API keys securely. You need to deploy this separately before the plugin can do anything.

```
You in Cowork  →  Your Azure Function  →  CloudRadial API
(this plugin)     (you deploy this)       (your portal data)
```

The plugin can't connect to CloudRadial on its own — it needs the Azure Function as a secure middleman. This setup wizard walks you through deploying the Azure Function and then connecting this plugin to it.

## Trigger: When to Run This Wizard

Run this wizard when ANY of the following are true:
- The user says "set up CloudRadial", "configure the plugin", or "connect to my portal"
- A skill file contains `YOUR-FUNCTION-NAME` or `YOUR_FUNCTION_KEY` placeholders
- An API call fails with 401, "Unauthorized", or returns an error about credentials
- The user just installed the plugin and hasn't configured it yet

---

## Phase 0: Detect Current State and Platform

### 0a. Check Skill Files

Read at least two skill files to check their current state:

```
${CLAUDE_PLUGIN_ROOT}/skills/setup/SKILL.md
${CLAUDE_PLUGIN_ROOT}/skills/portal-lookup/SKILL.md
```

| What to look for | Meaning |
|-----------------|---------|
| `YOUR-FUNCTION-NAME` in URLs | Plugin was never configured → full setup (Phase 1 + 2 + 3) |
| `YOUR_FUNCTION_KEY` in URLs | Plugin was never configured → full setup (Phase 1 + 2 + 3) |
| A real function name + key | Plugin is already configured → skip to Phase 4 (test) |

Also check the Architecture section at the bottom of THIS file — if it has real values, those are the current config.

### 0b. Detect Operating System

Use AskUserQuestion:

**Question:** "What operating system are you on?"

**Options:**
1. **Windows** — Commands will use PowerShell
2. **macOS** — Commands will use Terminal (zsh/bash)
3. **Linux** — Commands will use bash

Store the answer and use it to provide the correct commands throughout the wizard. All Azure CLI (`az`) and Node.js (`npm`, `func`) commands are the same across platforms — the main differences are:
- **Variable syntax**: PowerShell uses `$var`, bash uses `$var` (same) but assignment differs (`$var = "x"` vs `var="x"`)
- **Line continuation**: PowerShell uses `` ` ``, bash uses `\`
- **Test commands**: PowerShell uses `Invoke-RestMethod`, bash uses `curl`

---

## Phase 1: Deploy the Azure Function Server

The Azure Function code lives in the GitHub repo — it is NOT bundled with the plugin file.

### Step 1.0: Ask Where They Are

Use AskUserQuestion:

**Question:** "This plugin needs an Azure Function server to connect to your CloudRadial portal. It's a small proxy you deploy once to your own Azure subscription. Where are you in the process?"

**Options:**
1. **"I already have it deployed"** → Skip to Phase 2
2. **"I need to set it up from scratch"** → Continue with Step 1.1
3. **"Someone on my team is handling the server"** → Provide the GitHub repo link (`https://github.com/cloudradial/helpers`) and point them to `DEPLOYMENT.md` inside `cowork-plugin/cloudradial-ucp/`. Tell them: "Once your team has it deployed, come back and say 'set up CloudRadial' — I'll just need the function name and key." Then stop.
4. **"I'm not sure what any of this means"** → Give a plain-English explanation, then ask if they want to proceed or get help from their IT team.

### Step 1.1: Check Prerequisites

Walk through these one at a time. Ask them to run each check command.

**Required tools (same command on all platforms):**

| Tool | Check command | Install if missing |
|------|--------------|-------------------|
| Git | `git --version` | https://git-scm.com/downloads |
| Node.js 24+ | `node --version` | https://nodejs.org (download LTS) |
| Azure CLI | `az --version` | See install links below |
| Azure Functions Core Tools v4 | `func --version` | `npm install -g azure-functions-core-tools@4 --unsafe-perm true` |

**Azure CLI install by platform:**
- **Windows**: Download installer from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows
- **macOS**: `brew install azure-cli` (or download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos)
- **Linux**: `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash` (Debian/Ubuntu) or see https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux

**Also required (no install):**
- **Azure subscription** — Free tier works. 1M function executions/month at no charge. Sign up: https://azure.microsoft.com/free
- **CloudRadial API keys** — From admin portal: **Settings → API** (Public Key + Private Key)
- **Claude in Chrome** extension — Required for all API calls from Cowork

**Tip:** If they're missing multiple tools, provide all the links and say "install these, restart your terminal, and let me know when you're ready."

### Step 1.2: Download the Server Code

The Azure Function code is in the GitHub repo — it's server-side code that runs on Azure, not in Cowork.

First, navigate to the Downloads folder so the files land somewhere predictable:

**Windows (PowerShell):**
```powershell
cd $HOME\Downloads
git clone https://github.com/cloudradial/helpers.git
cd helpers\cowork-plugin\cloudradial-ucp\azure-mcp-server
```

**macOS / Linux (Terminal):**
```bash
cd ~/Downloads
git clone https://github.com/cloudradial/helpers.git
cd helpers/cowork-plugin/cloudradial-ucp/azure-mcp-server
```

**No Git?** Download the ZIP from https://github.com/cloudradial/helpers → green **Code** button → **Download ZIP**. The file saves to your Downloads folder. Extract it there, then navigate to the `azure-mcp-server` folder:

**Windows:** `cd $HOME\Downloads\helpers-main\cowork-plugin\cloudradial-ucp\azure-mcp-server`
**macOS/Linux:** `cd ~/Downloads/helpers-main/cowork-plugin/cloudradial-ucp/azure-mcp-server`

They should see `package.json`, `tsconfig.json`, `host.json`, and a `src/` directory.

### Step 1.3: Log In to Azure

**All platforms (same command):**
```bash
az login
```

This opens a browser for authentication. After signing in, confirm the subscription:

```bash
az account show --query "{name:name, id:id}" -o table
```

To switch subscriptions: `az account set --subscription "Subscription Name"`

### Step 1.4: Create Azure Resources

They need a Resource Group, Storage Account, and Function App.

**Use AskUserQuestion to collect:**

**Question 1:** "Pick a name for your Azure Function app. This becomes your URL (e.g., `acme-cloudradial-mcp` → `acme-cloudradial-mcp.azurewebsites.net`). It must be globally unique."

**Question 2:** "Which Azure region is closest to you?"
- Options: "East US" / "West US" / "Central US" / "West Europe"

Then provide the commands for their platform:

**Windows (PowerShell):**
```powershell
$rg = "CloudRadialMCP"
$storage = "crmcpstorage"
$funcapp = "THEIR-CHOSEN-NAME"
$location = "THEIR-CHOSEN-REGION"

az group create --name $rg --location $location

az storage account create --name $storage --resource-group $rg --location $location --sku Standard_LRS

az functionapp create `
  --name $funcapp `
  --resource-group $rg `
  --storage-account $storage `
  --consumption-plan-location $location `
  --runtime node `
  --runtime-version 24 `
  --functions-version 4
```

**macOS / Linux (bash):**
```bash
rg="CloudRadialMCP"
storage="crmcpstorage"
funcapp="THEIR-CHOSEN-NAME"
location="THEIR-CHOSEN-REGION"

az group create --name $rg --location $location

az storage account create --name $storage --resource-group $rg --location $location --sku Standard_LRS

az functionapp create \
  --name $funcapp \
  --resource-group $rg \
  --storage-account $storage \
  --consumption-plan-location $location \
  --runtime node \
  --runtime-version 24 \
  --functions-version 4
```

**Common issues (all platforms):**
- "Subscription not registered" → `az provider register --namespace Microsoft.Web` then retry
- Storage account name taken → add initials or abbreviation
- Region capacity error → try a different region
- "Invalid runtime version" → must be `24` (Node.js 20 is end-of-life)

### Step 1.5: Store CloudRadial API Keys in Azure

Their CloudRadial Public Key and Private Key get stored as secure App Settings — NOT in local files, NOT in Cowork.

**Windows (PowerShell):**
```powershell
az functionapp config appsettings set `
  --name $funcapp `
  --resource-group $rg `
  --settings `
    CLOUDRADIAL_PUBLIC_KEY="paste-public-key-here" `
    CLOUDRADIAL_PRIVATE_KEY="paste-private-key-here" `
    CLOUDRADIAL_BASE_URL="https://api.us.cloudradial.com"
```

**macOS / Linux (bash):**
```bash
az functionapp config appsettings set \
  --name $funcapp \
  --resource-group $rg \
  --settings \
    CLOUDRADIAL_PUBLIC_KEY="paste-public-key-here" \
    CLOUDRADIAL_PRIVATE_KEY="paste-private-key-here" \
    CLOUDRADIAL_BASE_URL="https://api.us.cloudradial.com"
```

**Where to find the keys:** CloudRadial admin portal → **Settings → API**

**Regional note:** Default is US API. EU partners use `https://api.eu.cloudradial.com`.

### Step 1.6: Build and Deploy the Function

From inside the `azure-mcp-server` directory:

**All platforms (same commands):**
```bash
npm install
npm run build
func azure functionapp publish $funcapp --javascript
```

**Note:** On Windows PowerShell, `$funcapp` resolves the variable set in Step 1.4. On Mac/Linux bash, same thing. If they opened a new terminal since Step 1.4, they'll need to set the variable again or replace `$funcapp` with the actual name.

**The `--javascript` flag is required** because we compile TypeScript to JavaScript and deploy the `dist/` output.

After deployment, they should see two functions listed: `cloudradial` and `healthcheck`.

**If empty:** Wait 30 seconds and retry.
**If `npm run build` fails:** Confirm Node.js 24+ and restart terminal after installing.

### Step 1.7: Get the Function Key

**All platforms (same command):**
```bash
az functionapp keys list --name $funcapp --resource-group $rg --query "functionKeys.default" -o tsv
```

This prints the function key. **They need to copy this** for Phase 2.

### Step 1.8: Verify the Server Works

Before configuring the plugin, test that the deployment works end-to-end.

**Windows (PowerShell):**
```powershell
$key = "paste-function-key-here"
Invoke-RestMethod "https://$funcapp.azurewebsites.net/api/cloudradial/search_companies?code=$key&name=a"
```

**macOS / Linux (bash):**
```bash
key="paste-function-key-here"
curl "https://$funcapp.azurewebsites.net/api/cloudradial/search_companies?code=$key&name=a"
```

**Healthcheck (no key needed, all platforms):**
```bash
curl "https://$funcapp.azurewebsites.net/api/healthcheck"
```

(On Windows without curl: `Invoke-RestMethod "https://$funcapp.azurewebsites.net/api/healthcheck"`)

**Expected:** JSON array of company objects from their CloudRadial portal.

**Troubleshooting:**
- **Timeout** → Normal cold start. Retry after a few seconds.
- **401** → Function key is wrong. Re-check `az functionapp keys list`.
- **401/403 in JSON body** → CloudRadial API keys are wrong. Re-run Step 1.5.

Once the test returns company data, the server is working. Move to Phase 2.

---

## Phase 2: Save Your Credentials Locally

Credentials are stored in a local config file on the user's machine — NOT in the plugin files (which are read-only after install).

### Step 2.1: Collect Azure Function Details

Use AskUserQuestion:

**Question 1:** "What is your Azure Function app name? (e.g., if your URL is `https://acme-cloudradial-mcp.azurewebsites.net`, the name is `acme-cloudradial-mcp`)"

**Question 2:** "What is your Azure Function key? (the long string from `az functionapp keys list` or Azure Portal → App keys)"

**Normalize the function name:** Strip `https://`, `.azurewebsites.net`, trailing paths/slashes, whitespace. Use the key exactly as provided (just trim whitespace).

### Step 2.2: Determine the Config File Path

The config file lives in the user's home directory. Determine the path based on their OS:

- **Windows:** `C:\Users\{username}\.cloudradial\config.json`
- **macOS/Linux:** `~/.cloudradial/config.json`

**To find the username on Windows:** Look at any file path in the session context — paths like `C:\Users\NicholasWestgate\...` reveal the username. Or check the user's email in the session info.

**To find the home directory in bash:** Use `$HOME/.cloudradial/config.json`

### Step 2.3: Create the Config File

Use the Write tool to create the config file. Create the `.cloudradial` directory if it doesn't exist (the Write tool handles this automatically).

```json
{
  "functionName": "their-function-name",
  "functionKey": "their-function-key",
  "baseUrl": "https://their-function-name.azurewebsites.net/api/cloudradial"
}
```

**Example for a function named `acme-cloudradial-mcp`:**
```json
{
  "functionName": "acme-cloudradial-mcp",
  "functionKey": "abc123...",
  "baseUrl": "https://acme-cloudradial-mcp.azurewebsites.net/api/cloudradial"
}
```

### Step 2.4: Verify the Config

Read the file back to confirm it was written correctly. Check that:
- `functionName` is just the name (no `.azurewebsites.net`)
- `functionKey` is the full key string
- `baseUrl` is the complete URL with the function name

---

## Phase 3: Confirm Claude in Chrome is Connected

The plugin uses Chrome JS `fetch()` to call the Azure Function. This requires the **Claude in Chrome** extension.

Ask the user: "Is the Claude in Chrome extension installed and connected?"

- **Yes** → Proceed to Phase 4
- **No / Not sure** → Walk them through:
  1. Open Chrome (or Edge) and go to the Chrome Web Store
  2. Search for "Claude in Chrome" (by Anthropic)
  3. Click "Add to Chrome"
  4. After installing, click the extension icon and connect it to Claude Desktop

This is needed for all API calls — reads and writes both go through Chrome JS.

---

## Phase 4: Test the Connection from Cowork

Read the config file to get the credentials, then make a test API call using Chrome JS:

```javascript
// Chrome JS tool — substitute values from config:
(async()=>{
  const r = await fetch("https://{functionName}.azurewebsites.net/api/cloudradial/search_companies?name=a", {
    headers: {"x-functions-key": "{functionKey}"}
  });
  return await r.text();
})()
```

**Why `x-functions-key` header:** Chrome blocks responses when credentials appear in URL query strings. The `x-functions-key` header is Azure Functions' standard auth mechanism and works reliably.

**If it returns company data:** Move to Phase 5.

**If it fails:**
- **Empty response or blocked** → Verify `x-functions-key` value and that Claude in Chrome is connected
- **401 from Azure Function** → Function key is wrong. Re-check `az functionapp keys list`
- **401/403 in response body** → CloudRadial API keys are wrong. Re-run `az functionapp config appsettings set`
- **404** → Azure Function not deployed or wrong URL
- **Timeout** → Normal cold start. Retry after a few seconds

---

## Phase 5: Success — You're Connected!

Once the test returns company data, tell the user:

"You're all set! Your Azure Function is running and this plugin is connected to your CloudRadial portal. You have 11 skills available:

- **'Look up [company name]'** — Company overview, LOMG lifecycle assessment
- **'Set up a portal for [company]'** — Guided implementation sessions
- **'How many endpoints does [company] have?'** — Endpoint counts, warranty reports
- **'Audit the portal for [company]'** — Content coverage across articles, catalogs, menus, courses
- **'Create a KB article for [company] about [topic]'** — Create portal content from Cowork
- **'Build a training course about [topic]'** — Create courses and lessons
- **'Check assessment compliance for [company]'** — Security and compliance status
- **'What feedback has [company] submitted?'** — CSAT and satisfaction analysis
- **'List services for [company]'** — Service coverage, domain expiration
- **'Show me all my companies'** — Browse your full company list

What would you like to do first?"

---

## Config File Reference

All skills read credentials from a local config file. The plugin files themselves are read-only after install and contain no credentials.

**Config file location:**
- **Windows:** `C:\Users\{username}\.cloudradial\config.json`
- **macOS/Linux:** `~/.cloudradial/config.json`

**Config file format:**
```json
{
  "functionName": "your-function-name",
  "functionKey": "your-function-key",
  "baseUrl": "https://your-function-name.azurewebsites.net/api/cloudradial"
}
```

**How skills use it:** Every skill's "How to Call the API" section instructs Claude to read this config file first, then substitute the values into Chrome JS `fetch()` calls.

---

## Reconfiguring

If the user needs to change their Azure Function (different deployment, rotated key, etc.):

1. Ask for the new function name and/or key
2. Read the existing config file
3. Update the values and write it back
4. Test the connection (Phase 4)

No plugin reinstall needed — just update the config file.

## Rotating CloudRadial API Keys

CloudRadial API keys are stored in Azure App Settings, not locally. To rotate:

1. Get new keys from CloudRadial admin portal: **Settings > API**
2. Update Azure Function App Settings:

   **Windows (PowerShell):**
   ```powershell
   az functionapp config appsettings set --name FUNCNAME --resource-group RGNAME --settings CLOUDRADIAL_PUBLIC_KEY="new-key" CLOUDRADIAL_PRIVATE_KEY="new-key"
   ```

   **macOS / Linux (bash):**
   ```bash
   az functionapp config appsettings set --name FUNCNAME --resource-group RGNAME --settings CLOUDRADIAL_PUBLIC_KEY="new-key" CLOUDRADIAL_PRIVATE_KEY="new-key"
   ```

3. Changes take effect immediately — no config file changes or plugin reinstall needed

## Rotating the Azure Function Key

If the function key is rotated (via Azure Portal or CLI):

1. Get the new key:
   ```bash
   az functionapp keys list --name FUNCNAME --resource-group RGNAME
   ```
2. Update the local config file with the new key (Phase 2, Step 2.3)
3. Test the connection (Phase 4)
