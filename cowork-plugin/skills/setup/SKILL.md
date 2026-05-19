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
  version: "1.3.0"
---

# CloudRadial UCP Plugin â Interactive Setup Wizard

## Overview

This plugin has two parts that work together:

1. **This plugin** (already installed) â 10 skill files that teach Claude how to look up companies, manage articles, audit portals, create courses, analyze endpoints, and more. These skills make API calls to an Azure Function that YOU host.

2. **An Azure Function** (NOT included in the plugin) â A small server you deploy to your own Azure subscription. It sits between Cowork and the CloudRadial API, holding your API keys securely. You need to deploy this separately before the plugin can do anything.

```
You in Cowork  â  Your Azure Function  â  CloudRadial API
(this plugin)     (you deploy this)       (your portal data)
```

The plugin can't connect to CloudRadial on its own â it needs the Azure Function as a secure middleman. This setup wizard walks you through deploying the Azure Function and then connecting this plugin to it.

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
| `YOUR-FUNCTION-NAME` in URLs | Plugin was never configured â full setup (Phase 1 + 2 + 3) |
| `YOUR_FUNCTION_KEY` in URLs | Plugin was never configured â full setup (Phase 1 + 2 + 3) |
| A real function name + key | Plugin is already configured â skip to Phase 4 (test) |

Also check the Architecture section at the bottom of THIS file â if it has real values, those are the current config.

### 0b. Detect Operating System

Use AskUserQuestion:

**Question:** "What operating system are you on?"

**Options:**
1. **Windows** â Commands will use PowerShell
2. **macOS** â Commands will use Terminal (zsh/bash)
3. **Linux** â Commands will use bash

Store the answer and use it to provide the correct commands throughout the wizard. All Azure CLI (`az`) and Node.js (`npm`, `func`) commands are the same across platforms â the main differences are:
- **Variable syntax**: PowerShell uses `$var`, bash uses `$var` (same) but assignment differs (`$var = "x"` vs `var="x"`)
- **Line continuation**: PowerShell uses `` ` ``, bash uses `\`
- **Test commands**: PowerShell uses `Invoke-RestMethod`, bash uses `curl`

### 0c. Offer Chrome-Based Management (Recommended)

**IMPORTANT:** Many users will NOT have Azure CLI, PowerShell Az modules, or other CLI tools installed â even if they already have an Azure Function deployed. Someone else on their team may have set it up, or they used the Azure Portal UI directly.

Before assuming CLI tools are available, offer the Chrome-based path:

Use AskUserQuestion:

**Question:** "I can manage your Azure setup through the browser using Claude in Chrome, or guide you through command-line tools. Which do you prefer?"

**Options:**
1. **"Use the browser (recommended)"** â Claude will navigate Azure Portal via Chrome to find your Function App, retrieve keys, and verify settings. No CLI tools needed.
2. **"Use command-line tools"** â Claude will provide PowerShell/Terminal commands. Requires Azure CLI and related tools to be installed.
3. **"I'm not sure"** â Start with the browser approach â it works for everyone and doesn't require any local tool installation.

**If they choose the browser path:**
- All subsequent steps that reference CLI commands should be replaced with Chrome-based navigation to Azure Portal
- Use `mcp__Claude_in_Chrome__navigate`, `mcp__Claude_in_Chrome__find`, `mcp__Claude_in_Chrome__javascript_tool`, and `mcp__Claude_in_Chrome__get_page_text` to interact with Azure Portal
- This is especially important for: retrieving function keys (Step 1.7 / Step 2.1), verifying API key configuration (Step 1.5), and testing the deployment (Step 1.8)

**If they choose the CLI path:** Proceed to Step 1.1 to verify CLI prerequisites are installed before giving any commands.

### 0d. Verify Account Login (Critical)

Before proceeding with ANY Azure or GitHub operations, verify the user is logged into the correct accounts. Getting this wrong wastes significant time.

**For the browser path:**

Navigate to `https://portal.azure.com` via Chrome. If a login or account picker appears:
1. **Show the user the available accounts** and ask which one contains their Azure Function deployment
2. **Get explicit confirmation** before clicking an account â use AskUserQuestion with the account options shown on screen
3. After login, verify the correct subscription is active by checking the portal home page

If GitHub access is needed (cloning the repo), also verify:
1. Navigate to `https://github.com` and check if they're logged in
2. Confirm the account has access to `https://github.com/cloudradial/helpers`

**For the CLI path:**

Ask the user to run and paste the output of:
```bash
az account show --query "{name:name, id:id, user:user.name}" -o table
```
Verify the account and subscription match what's expected before proceeding.

**Do NOT assume the default-logged-in account is correct.** Users often have multiple Azure accounts (personal, work, client) and the wrong one being active is a common source of 401 errors and missing resources.

---

## Phase 1: Deploy the Azure Function Server

The Azure Function code lives in the GitHub repo â it is NOT bundled with the plugin file.

### Step 1.0: Ask Where They Are

Use AskUserQuestion:

**Question:** "This plugin needs an Azure Function server to connect to your CloudRadial portal. It's a small proxy you deploy once to your own Azure subscription. Where are you in the process?"

**Options:**
1. **"I already have it deployed"** â Skip to Phase 2
2. **"I need to set it up from scratch"** â Continue with Step 1.1
3. **"Someone on my team is handling the server"** â Provide the GitHub repo link (`https://github.com/cloudradial/helpers`) and point them to `DEPLOYMENT.md` inside `cowork-plugin/cloudradial-ucp/`. Tell them: "Once your team has it deployed, come back and say 'set up CloudRadial' â I'll just need the function name and key." Then stop.
4. **"I'm not sure what any of this means"** â Give a plain-English explanation, then ask if they want to proceed or get help from their IT team.

### Step 1.1: Check Prerequisites (CLI Path Only)

**Skip this step if the user chose the browser path in 0c.** The browser path does not require any local CLI tools.

Walk through these one at a time. **Do not just list commands and move on â ask the user to run each check and paste the output.** Verify the output confirms the tool is installed and meets the version requirement before proceeding to the next check.

**Required tools (same command on all platforms):**

| Tool | Check command | Min version | Install if missing |
|------|--------------|-------------|-------------------|
| Git | `git --version` | Any | https://git-scm.com/downloads |
| Node.js | `node --version` | 24+ | https://nodejs.org (download LTS) |
| Azure CLI | `az --version` | 2.60+ | See install links below |
| Azure Functions Core Tools | `func --version` | 4.x | `npm install -g azure-functions-core-tools@4 --unsafe-perm true` |

**Windows-specific: Check for PowerShell Az Module**

If the user is on Windows and will be using PowerShell for Azure commands, also check:
```powershell
Get-Module -ListAvailable Az.Websites | Select-Object Name, Version
```
If this returns nothing, the Az module is not installed. Install it:
```powershell
Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force
```
**This is a common miss** â having Azure CLI installed does NOT mean PowerShell Az modules are installed. They are separate tools. If the module is missing and the user doesn't want to install it, offer to switch to the browser path (Phase 0c).

**Azure CLI install by platform:**
- **Windows**: Download installer from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows
- **macOS**: `brew install azure-cli` (or download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos)
- **Linux**: `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash` (Debian/Ubuntu) or see https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux

**Also required (no install):**
- **Azure subscription** â Free tier works. 1M function executions/month at no charge. Sign up: https://azure.microsoft.com/free
- **CloudRadial API keys** â From admin portal: **Settings â API** (Public Key + Private Key)
- **Claude in Chrome** extension â Required for all API calls from Cowork

**If any prerequisite is missing:** Offer to switch to the browser path rather than blocking on installs. Say: "You're missing [tool]. I can either help you install it, or we can skip the command line entirely and I'll handle everything through the browser. Which do you prefer?"

### Step 1.2: Download the Server Code

The Azure Function code is in the GitHub repo â it's server-side code that runs on Azure, not in Cowork.

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

**No Git?** Download the ZIP from https://github.com/cloudradial/helpers â green **Code** button â **Download ZIP**. The file saves to your Downloads folder. Extract it there, then navigate to the `azure-mcp-server` folder:

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

**Question 1:** "Pick a name for your Azure Function app. This becomes your URL (e.g., `acme-cloudradial-mcp` â `acme-cloudradial-mcp.azurewebsites.net`). It must be globally unique."

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
- "Subscription not registered" â `az provider register --namespace Microsoft.Web` then retry
- Storage account name taken â add initials or abbreviation
- Region capacity error â try a different region
- "Invalid runtime version" â must be `24` (Node.js 20 is end-of-life)

### Step 1.5: Store CloudRadial API Keys in Azure

Their CloudRadial Public Key and Private Key get stored as secure App Settings â NOT in local files, NOT in Cowork.

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

**Where to find the keys:** CloudRadial admin portal â **Settings â API**

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

#### Browser Path (Recommended)

Use Claude in Chrome to navigate Azure Portal and retrieve the key directly:

1. Navigate to `https://portal.azure.com` (verify correct account per Phase 0d)
2. Search for the Function App name in the portal search bar, or find it under **Function Apps** on the home page
3. Click into the Function App â expand **Functions** in the left sidebar â click **App keys**
4. Under "Host keys (all functions)", find the **default** key
5. Click **Show value** to reveal it, then click the **copy icon** (clipboard) next to the field
6. The key is now on the user's clipboard â ask them to paste it

**Azure Portal navigation tips:**
- App keys is under the **Functions** section in the left sidebar, NOT under Settings
- The copy button is a small clipboard icon to the right of the masked value field
- If "Show value" reveals a truncated string, the copy button still copies the full key
- **Do NOT try to read the key value via JavaScript** â Azure Portal uses shadow DOM components that block DOM access. Always use the copy button and ask the user to paste.

#### CLI Path

**All platforms (same command):**
```bash
az functionapp keys list --name $funcapp --resource-group $rg --query "functionKeys.default" -o tsv
```

This prints the function key. **They need to copy this** for Phase 2.

**If the `az` command fails or isn't installed:** Switch to the browser path above rather than troubleshooting CLI issues.

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
- **Timeout** â Normal cold start. Retry after a few seconds.
- **401** â Function key is wrong. Re-check `az functionapp keys list`.
- **401/403 in JSON body*+ â CloudRadial API keys are wrong. Re-run Step 1.5.

Once the test returns company data, the server is working. Move to Phase 2.

---

## Phase 2: Save Your Credentials Locally

Credentials are stored in a local config file on the user's machine â NOT in the plugin files (which are read-only after install).

### Step 2.1: Collect Azure Function Details

#### Browser Path (Recommended â especially if they chose browser in Phase 0c)

If you haven't already retrieved the function name and key via Chrome in Step 1.7, do it now:

1. Navigate to `https://portal.azure.com` via Chrome (verify correct account per Phase 0d)
2. Look at the portal home page â **Recent resources** often shows the Function App directly
3. Click into the Function App to get the **name** (shown in the header, e.g., `cloudradial-mcp`)
4. Navigate to **Functions â App keys** to get the **default host key** (copy button â user pastes)

**The function name** is visible in the portal URL and page header â no need to ask the user to type it if Claude can read it from the page.

**The function key** must come from the user pasting it (see Step 1.7 browser path for why).

#### Manual Collection (Fallback)

If not using Chrome, use AskUserQuestion:

**Question 1:** "What is your Azure Function app name? (e.g., if your URL is `https://acme-cloudradial-mcp.azurewebsites.net`, the name is `acme-cloudradial-mcp`)"

**Question 2:** "What is your Azure Function key? (the long string from `az functionapp keys list` or Azure Portal â App keys)"

**Normalize the function name:** Strip `https://`, `.azurewebsites.net`, trailing paths/slashes, whitespace. Use the key exactly as provided (just trim whitespace).

**If the user doesn't know how to get the key:** Don't just repeat the CLI command. Offer to switch to the browser path and navigate Azure Portal for them â this is the most common sticking point in setup.

### Step 2.2: Determine the Config File Path

The config file lives in the user's home directory. Determine the path based on their OS:

- **Windows:** `C:\Users\{username}\.cloudradial\config.json`
- **macOS/Linux:** `~/.cloudradial/config.json`

**To find the username on Windows:** Look at any file path in the session context â paths like `C:\Users\NicholasWestgate\...` reveal the username. Or check the user's email in the session info.

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

- **Yes** â Proceed to Phase 4
- **No / Not sure** â Walk them through:
  1. Open Chrome (or Edge) and go to the Chrome Web Store
  2. Search for "Claude in Chrome" (by Anthropic)
  3. Click "Add to Chrome"
  4. After installing, click the extension icon and connect it to Claude Desktop

This is needed for all API calls â reads and writes both go through Chrome JS.

---

## Phase 4: Test the Connection from Cowork

Read the config file to get the credentials, then make a test API call using Chrome JS:

```javascript
// Chrome JS tool â substitute values from config:
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
- **Empty response or blocked** â Verify `x-functions-key` value and that Claude in Chrome is connected
- **401 from Azure Function** â Function key is wrong. Re-check `az functionapp keys list`
- **401/403 in response body*+ â CloudRadial API keys are wrong. Re-run `az functionapp config appsettings set`
- **404*+ â Azure Function not deployed or wrong URL
- **Timeout** â Normal cold start. Retry after a few seconds

---

## Phase 5: Success â You're Connected!

Once the test returns company data, tell the user:

"You're all set! Your Azure Function is running and this plugin is connected to your CloudRadial portal. You have 11 skills available:

- **'Look up [company name]'** â Company overview, LOMG lifecycle assessment
- **'Set up a portal for [company]'** â Guided implementation sessions
- **'How many endpoints does [company] have?'** â Endpoint counts, warranty reports
- **'Audit the portal for [company]'** â Content coverage across articles, catalogs, menus, courses
- **'Create a KB article for [company] about [topic]'** â Create portal content from Cowork
- **'Build a training course about [topic]'** â Create courses and lessons
- **'Check assessment compliance for [company]'** â Security and compliance status
- **'What feedback has [company] submitted?'** â CSAT and satisfaction analysis
- **'List services for [company]'** â Service coverage, domain expiration
- **'Show me all my companies'** â Browse your full company list

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

No plugin reinstall needed â just update the config file.

## Rotating CloudRadial API Keys

CloudRadial API keys are stored in Azure App Settings, not locally. To rotate:

1. Get new keys from CloudRadial admin portal: **Settings > API**
2. Update Azure Function App Settings:

   **Windows (PowerShell):**
   ```powershell
   az functionapp config appsettings set --name FUNCNAME --resource-group RGNAME --settings CLOUDRADIAL_PUBLIC_KEY="new-key" CLOUDRADIA
