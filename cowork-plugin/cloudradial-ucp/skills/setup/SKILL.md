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

**All platforms:**
```bash
git clone https://github.com/cloudradial/helpers.git
cd helpers/cowork-plugin/cloudradial-ucp/azure-mcp-server
```

**No Git?** Download the ZIP from https://github.com/cloudradial/helpers → green **Code** button → **Download ZIP**. Extract and navigate to `cowork-plugin/cloudradial-ucp/azure-mcp-server`.

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

## Phase 2: Connect the Plugin to Your Server

Now configure this plugin's skill files with the Azure Function URL and key.

### Step 2.1: Collect Azure Function Details

Use AskUserQuestion:

**Question 1:** "What is your Azure Function app name? (e.g., if your URL is `https://acme-cloudradial-mcp.azurewebsites.net`, the name is `acme-cloudradial-mcp`)"

**Question 2:** "What is your Azure Function key? (the long string from `az functionapp keys list` or Azure Portal → App keys)"

**Normalize the function name:** Strip `https://`, `.azurewebsites.net`, trailing paths/slashes, whitespace. Use the key exactly as provided (just trim whitespace).

### Step 2.2: Update ALL Skill Files

Using the Read and Edit tools, update **every** skill file that contains placeholders. There are 10 skills — all of them have `YOUR-FUNCTION-NAME` and `YOUR_FUNCTION_KEY` placeholders.

1. Read each file listed below
2. Replace ALL occurrences of `YOUR-FUNCTION-NAME.azurewebsites.net` with `{their-function-name}.azurewebsites.net`
3. Replace ALL occurrences of `YOUR_FUNCTION_KEY` with their actual function key
4. Use `replace_all: true` to catch every instance

**Files to update:**
- `${CLAUDE_PLUGIN_ROOT}/skills/setup/SKILL.md` (this file — including the Architecture section)
- `${CLAUDE_PLUGIN_ROOT}/skills/portal-lookup/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/content-management/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/user-management/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/endpoint-reporting/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/course-management/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/assessment-compliance/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/feedback-analysis/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/service-management/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/reporting-admin/SKILL.md`

### Step 2.3: Verify the Replacements

After editing, search all 10 files for any remaining `YOUR-FUNCTION-NAME` or `YOUR_FUNCTION_KEY` placeholders. If any remain, fix them.

---

## Phase 3: Confirm Claude in Chrome is Connected

The plugin uses Chrome JS `fetch()` to call the Azure Function. This requires the **Claude in Chrome** extension.

Ask the user: "Is the Claude in Chrome extension installed and connected?"

- **Yes** → Proceed to Phase 4
- **No / Not sure** → Walk them through:
  1. Open Chrome and go to the Chrome Web Store
  2. Search for "Claude in Chrome" (by Anthropic)
  3. Click "Add to Chrome"
  4. After installing, click the extension icon and connect it to Claude Desktop

This is needed for all API calls — reads and writes both go through Chrome JS.

---

## Phase 4: Test the Connection from Cowork

Make a test API call using Chrome JS with the `x-functions-key` header:

```javascript
// Chrome JS tool:
(async()=>{
  const r = await fetch("https://{function-name}.azurewebsites.net/api/cloudradial/search_companies?name=a", {
    headers: {"x-functions-key": "{function-key}"}
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

"You're all set! Your Azure Function is running and this plugin is connected to your CloudRadial portal. You have 10 skills available:

- **'Look up [company name]'** — Company overview, LOMG lifecycle assessment
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

## Architecture (Reference)

These values are updated by the setup wizard during Phase 2. If they still show placeholders, run setup again.

- **Azure Function**: `https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}`
- **Auth method**: `x-functions-key` HTTP header (preferred) or `code` query parameter
- **Function Key**: `YOUR_FUNCTION_KEY`
- **CloudRadial API keys**: Stored as App Settings on the Azure Function (not in local files or this plugin)
- **All API calls**: Chrome JS `fetch()` with `x-functions-key` header
- **Fallback for reads**: `web_fetch` with `?code=KEY` query parameter (requires URL provenance seeding)

---

## Reconfiguring

If the user needs to change their Azure Function (different deployment, rotated key, etc.):

1. Ask for the new function name and/or key
2. Read each of the 10 skill files
3. Replace the OLD function name/key with the NEW values (use the Architecture section above to find the current values)
4. Update the Architecture section in this file
5. Test the connection (Phase 4)

## Rotating CloudRadial API Keys

CloudRadial API keys are stored in Azure App Settings, not in these files. To rotate:

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

3. Changes take effect immediately — no redeployment or plugin changes needed

## Rotating the Azure Function Key

If the function key is rotated (via Azure Portal or CLI):

1. Get the new key:
   ```bash
   az functionapp keys list --name FUNCNAME --resource-group RGNAME
   ```
2. Run the setup wizard again — it will detect the old key in the skill files and replace it with the new one across all 10 skills
