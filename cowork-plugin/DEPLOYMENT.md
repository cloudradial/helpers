# CloudRadial UCP Plugin — Full Setup Guide

This guide takes you from zero to a working CloudRadial plugin in Cowork. It covers everything: downloading the code, installing tools, deploying the Azure Function, configuring API keys, installing the plugin, and verifying it all works.

> **Time estimate:** 30-45 minutes from scratch. 15-20 minutes if you already have Azure CLI and Node.js installed.

---

## Before You Begin: What You're Setting Up

This plugin has two parts:

1. **An Azure Function** (server-side) — A tiny proxy that sits between Cowork and the CloudRadial API. It holds your API keys securely in Azure and forwards requests. You deploy this once and it runs on Azure's free tier.

2. **A Cowork Plugin** (client-side) — Skill files that teach Claude how to use your Azure Function. You install this in Claude Desktop's Cowork mode.

```
You in Cowork  →  Azure Function (your deployment)  →  CloudRadial API
                  (holds your API keys)
```

---

## Step 0: Install the Tools

You need five things on your computer before you start. This section walks through each one.

### 0a. PowerShell

**Windows:** PowerShell is already installed. Search for "PowerShell" in the Start menu. Use **Windows PowerShell** or **PowerShell 7** — either works.

**Mac:** Open Terminal. The Azure CLI commands work the same way, but use `\` instead of `` ` `` for line continuation in multi-line commands.

### 0b. Git

Git lets you download the code from GitHub.

**Check if you have it:**
```powershell
git --version
```

**If not installed:** Download from https://git-scm.com/downloads and run the installer. Accept all defaults.

### 0c. Node.js 24+

The Azure Function runs on Node.js. You need version 24 or higher.

**Check if you have it:**
```powershell
node --version
```

**If not installed or version is below 24:** Download the **LTS** installer from https://nodejs.org and run it. Accept all defaults. Close and reopen PowerShell after installing.

> **Important:** Node.js 20 has reached end-of-life. If you have v20 installed, you must upgrade to v24+ or the Azure deployment will fail.

### 0d. Azure CLI

The Azure CLI (`az`) lets you create and manage Azure resources from the command line.

**Check if you have it:**
```powershell
az --version
```

**If not installed:** Download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli and run the installer. Close and reopen PowerShell after installing.

### 0e. Azure Functions Core Tools v4

This tool packages and deploys your function code to Azure.

**Check if you have it:**
```powershell
func --version
```

**If not installed:**

```powershell
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

Or download the installer from https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools

### 0f. Azure Subscription

You need an Azure account with an active subscription. The Consumption plan used here costs under $1/month (usually free — Azure includes 1 million function executions/month at no charge).

**If you don't have one:**

1. Go to https://azure.microsoft.com/free
2. Sign up with your Microsoft account (or create one)
3. New accounts get $200 in credits for 30 days, plus always-free tier services

**If your organization manages Azure:** Ask your IT team to either give you access to an existing subscription or create a Resource Group you can deploy into. You need permission to create Function Apps and Storage Accounts.

### 0g. CloudRadial API Keys

You need your Public Key and Private Key from CloudRadial.

1. Log into the **CloudRadial admin portal**
2. Go to **Settings > API**
3. Copy both the **Public Key** and the **Private Key**

Keep these handy — you'll need them in Step 3.

### 0h. Claude Desktop with Cowork Mode and Claude in Chrome

**Claude Desktop:** Download from https://claude.ai/download if you don't have it. Cowork mode is available in the app.

**Claude in Chrome:** Install the Claude in Chrome extension from the Chrome Web Store. This is required for write operations (creating articles, updating resources, etc.) because it lets Claude run JavaScript `fetch()` calls in the browser to make POST/PUT/DELETE requests through your Azure Function.

1. Open Chrome and go to the Chrome Web Store
2. Search for "Claude in Chrome" (by Anthropic)
3. Click "Add to Chrome"
4. After installing, click the extension icon and connect it to your Claude Desktop

---

## Step 1: Download the Code from GitHub

Open PowerShell and clone the repository:

```powershell
git clone https://github.com/cloudradial/helpers.git
cd helpers/cowork-plugin/cloudradial-ucp
```

**Alternative (no Git required):** Go to https://github.com/cloudradial/helpers, click the green **Code** button, select **Download ZIP**, extract it, and navigate to the `cowork-plugin/cloudradial-ucp` folder.

You should see a folder structure like this:

```
cloudradial-ucp/
  .claude-plugin/
    plugin.json
  azure-mcp-server/       ← The function code you'll deploy
    src/
    package.json
    tsconfig.json
    host.json
  skills/                  ← The Cowork skill files
    setup/SKILL.md
    portal-lookup/SKILL.md
    content-management/SKILL.md
  references/
    api-reference.md
  README.md
  CAPABILITIES.md
  DEPLOYMENT.md            ← This file
```

---

## Step 2: Log In to Azure

```powershell
az login
```

This opens a browser window. Sign in with your Azure account. After signing in, you'll see your subscription info in the terminal.

Confirm which subscription you're using:

```powershell
az account show --query "{name:name, id:id}" -o table
```

If you have multiple subscriptions and need to switch:

```powershell
az account set --subscription "Your Subscription Name"
```

---

## Step 3: Create Azure Resources

You need three things in Azure: a Resource Group (a folder for your resources), a Storage Account (required by Azure Functions), and the Function App itself.

**Pick unique names.** The function app name becomes your URL (`your-name.azurewebsites.net`), so it must be globally unique across all of Azure. The storage account name must also be globally unique, 3-24 characters, lowercase letters and numbers only — no dashes.

```powershell
# Set your naming variables — change these to your own unique names
$rg = "CloudRadialMCP"
$storage = "crmcpstorage"       # Must be globally unique, lowercase, no dashes
$funcapp = "my-cloudradial-mcp"  # Must be globally unique — becomes your URL
$location = "eastus"             # Choose a region near you

# Create resource group
az group create --name $rg --location $location

# Create storage account
az storage account create --name $storage --resource-group $rg --location $location --sku Standard_LRS

# Create the Function App
az functionapp create `
  --name $funcapp `
  --resource-group $rg `
  --storage-account $storage `
  --consumption-plan-location $location `
  --runtime node `
  --runtime-version 24 `
  --functions-version 4
```

**Common issues:**

| Problem | Solution |
|---------|----------|
| "The subscription is not registered to use namespace 'Microsoft.Web'" | Run: `az provider register --namespace Microsoft.Web` then wait a minute and retry |
| Quota error / region capacity | Try a different region: `$location = "westus"` or `"centralus"` or `"westeurope"` |
| Storage account name already taken | Pick a different name — add your initials or company abbreviation |
| "Invalid runtime version" | Make sure you used `--runtime-version 24`, not 20 (Node 20 is EOL) |

---

## Step 4: Configure CloudRadial API Keys

Set your CloudRadial API credentials as App Settings on the Function App. These are stored securely in Azure — they never appear in local files or in Cowork.

```powershell
az functionapp config appsettings set `
  --name $funcapp `
  --resource-group $rg `
  --settings `
    CLOUDRADIAL_PUBLIC_KEY="your-public-key-here" `
    CLOUDRADIAL_PRIVATE_KEY="your-private-key-here" `
    CLOUDRADIAL_BASE_URL="https://api.us.cloudradial.com"
```

**Replace** `your-public-key-here` and `your-private-key-here` with the actual keys from Step 0g.

**Note:** The base URL defaults to the US API (`api.us.cloudradial.com`). If you use an EU or other regional instance, change this to your region's API URL.

---

## Step 5: Build and Deploy the Function

Navigate to the `azure-mcp-server` directory (inside the repository you cloned in Step 1):

```powershell
cd azure-mcp-server

# Install Node.js dependencies
npm install

# Compile TypeScript to JavaScript
npm run build

# Deploy to Azure
func azure functionapp publish $funcapp
```

After deployment, you should see output listing two functions:
- `cloudradial` — The main API proxy
- `healthcheck` — A diagnostic endpoint

**If the functions list is empty:** Wait 30 seconds and run the publish command again. Consumption plan cold starts can delay function registration.

**If `npm run build` fails:** Check that you have Node.js 24+ installed (`node --version`). If you just installed it, close and reopen PowerShell.

---

## Step 6: Get Your Function Key

The function key is like a password that protects your API endpoint. Anyone with this key can call your function.

```powershell
az functionapp keys list --name $funcapp --resource-group $rg --query "functionKeys" -o json
```

This returns something like:

```json
{
  "default": "abc123your-function-key-here..."
}
```

**Copy the key value** (the part after `"default":`, without the quotes). You'll need it for Steps 7, 8, and 9.

Your full API URL is now:

```
https://YOUR-FUNCAPP-NAME.azurewebsites.net/api/cloudradial/{operation}?code=YOUR-FUNCTION-KEY
```

---

## Step 7: Test the Connection

Before configuring the plugin, verify the function works:

```powershell
$key = "your-function-key-from-step-6"
Invoke-RestMethod "https://$funcapp.azurewebsites.net/api/cloudradial/search_companies?code=$key&name=a"
```

**Expected result:** A JSON array of company objects from your CloudRadial portal.

You can also check the healthcheck endpoint (no key needed):

```powershell
Invoke-RestMethod "https://$funcapp.azurewebsites.net/api/healthcheck"
```

**If you get a timeout:** This is normal on the first call — the Consumption plan cold-starts after inactivity. Wait a few seconds and try again.

**If you get a 401:** Double-check your function key matches exactly (no extra spaces or line breaks).

**If you get a 401/403 inside the JSON response body:** Your CloudRadial API keys are wrong. Go back to Step 4 and re-run the settings command with the correct keys.

---

## Step 8: Install the Plugin and Run Setup

Skip manual configuration entirely — the setup wizard handles everything.

### Install the Plugin

Download `cloudradial-ucp.plugin` from [GitHub Releases](https://github.com/cloudradial/helpers/releases), then drag it into a Cowork session. Claude will install it automatically.

### Run the Setup Wizard

In the same Cowork session, say **"Set up CloudRadial"**. The wizard will:

1. Ask for your Azure Function name and key (from Steps 3 and 6)
2. Create a local config file at `~/.cloudradial/config.json` with your credentials
3. Test the connection to your Azure Function
4. Confirm everything works

Your credentials are stored locally on your machine — they never appear in plugin files or chat history. All 11 skills read from this config file at runtime.

**To reconfigure later:** Just say "Set up CloudRadial" again, or manually edit `~/.cloudradial/config.json`.

---

## Step 9: Verify Everything Works

After the setup wizard confirms your connection, try some natural language queries:

- "Show me all my companies in CloudRadial"
- "How many endpoints does Contoso have?"
- "Create a KB article for company 42 about password resets"

All API calls go through Chrome JS `fetch()` — no provenance seeding or URL pasting required. Just make sure the [Claude in Chrome](https://chromewebstore.google.com/) extension is installed and connected.

---

## What You Can Do Now

With the plugin installed, Claude can do anything the CloudRadial API supports:

**Read operations** — search companies, pull overviews, list articles/endpoints/users, count resources, check feedback, review catalogs, audit portal content, export data

**Write operations** — create KB articles (from documents or from scratch), update resource fields, publish/unpublish content, manage catalogs and menus, create courses

**Reporting** — generate endpoint warranty reports, user adoption summaries, content audits, implementation readiness assessments

**Bulk operations** — paginate through large datasets (1000+ endpoints), aggregate across companies, cross-reference resources

The skills guide Claude through common CSM workflows automatically. Just describe what you need in plain English.

---

## Maintenance

### Updating CloudRadial API Keys

If you need to rotate keys or connect to a different portal:

```powershell
az functionapp config appsettings set `
  --name $funcapp `
  --resource-group $rg `
  --settings `
    CLOUDRADIAL_PUBLIC_KEY="new-public-key" `
    CLOUDRADIAL_PRIVATE_KEY="new-private-key"
```

Changes take effect immediately — no redeployment needed.

### Updating the Function Code

When new versions are released:

```powershell
cd azure-mcp-server
git pull
npm install && npm run build
func azure functionapp publish $funcapp
```

### Cost

An Azure Functions Consumption plan includes 1 million free executions per month. For typical usage (dozens to hundreds of API calls per day), the cost is effectively zero. The storage account costs a few cents per month. Total expected cost: **under $1/month**.

---

## Troubleshooting

### Setup & Deployment Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `az` not recognized | Azure CLI not installed | See Step 0d |
| `func` not recognized | Azure Functions Core Tools not installed | See Step 0e |
| `node` not recognized or wrong version | Node.js not installed or outdated | See Step 0c |
| `git` not recognized | Git not installed | See Step 0b |
| "Subscription not registered" | Azure provider not registered | Run: `az provider register --namespace Microsoft.Web` |
| Quota error on function app create | Region at capacity | Try `$location = "westus"` or `"centralus"` |
| Storage account name taken | Names are globally unique | Pick a different name — add your initials |
| Empty functions list after deploy | Cold start or build error | Wait 30 seconds and retry; check `npm run build` output |
| Deploy fails with Node.js error | Node.js 20 is EOL | Upgrade to Node.js 24+ |
| `npm install` fails | Node.js not in PATH | Close and reopen PowerShell after installing Node.js |

### Runtime Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 from Azure Function | Wrong function key | Check `code` parameter matches `az functionapp keys list` output exactly |
| 401/403 in the response JSON body | Wrong CloudRadial API keys | Re-run Step 4 with correct keys from CloudRadial Settings > API |
| 404 on function URL | Function app not running or wrong URL | Check Azure Portal; verify function app name in URL |
| Timeout on first call | Cold start (Consumption plan) | Normal — retry after a few seconds |

### Cowork Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| API calls fail ("Chrome not connected") | Claude in Chrome not installed/connected | Install the extension and connect it |
| Chrome JS returns `SyntaxError: await` | Missing wrapper | Skills handle this automatically; for manual calls, wrap in `(async()=>{ ... })()` |
| Chrome JS drops connection on large payload | Payload over ~5KB | Skills chunk large payloads automatically using `window._varName` |
| Bash/shell can't reach the API | Cowork sandbox is network-isolated | Expected — all calls go through Chrome JS `fetch()`, never bash |
| OData error for `$top` > 200 | API caps pages at 200 | Skills paginate automatically; for manual calls use `$top=200` with `$skip` |
