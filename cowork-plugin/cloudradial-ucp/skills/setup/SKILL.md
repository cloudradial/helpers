---
name: setup
description: >
  Guide a partner through first-time setup of the CloudRadial UCP plugin.
  Use when the user says "set up CloudRadial", "configure the plugin",
  "connect to my portal", "I just installed the CloudRadial plugin",
  or when any CloudRadial API call fails with an authentication error,
  missing config, or "PASTE_YOUR" placeholder message.
metadata:
  version: "0.5.0"
---

# CloudRadial UCP Plugin Setup

## Overview

The CloudRadial UCP plugin connects to a hosted Azure Function that proxies requests to the CloudRadial API. The Azure Function is deployed by each partner with their own CloudRadial API keys stored securely in Azure App Settings.

## Interactive Setup Wizard

When this skill is triggered, follow this workflow:

### Step 1: Check if Configuration is Needed

Read the content of all three skill files and check if they contain the placeholder values `YOUR-FUNCTION-NAME` or `YOUR_FUNCTION_KEY`.

The skill files are at these paths (relative to the plugin root):
- `${CLAUDE_PLUGIN_ROOT}/skills/setup/SKILL.md` (this file)
- `${CLAUDE_PLUGIN_ROOT}/skills/portal-lookup/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/content-management/SKILL.md`

If placeholders are found, proceed to Step 2 (first-time setup).
If no placeholders are found, skip to Step 5 (verification).

### Step 2: Ask for Azure Function Details

Use the AskUserQuestion tool to collect the user's Azure Function details:

**Question 1:** "What is your Azure Function app name? This is the name you chose when you created the function app (e.g., `my-cloudradial-mcp`). It's the first part of your URL: `https://YOUR-NAME.azurewebsites.net`"

**Question 2:** "What is your Azure Function key? You can get this by running `az functionapp keys list` in PowerShell, or from the Azure Portal under your function app's 'App keys' section."

Accept the function name in any format — strip `https://`, `.azurewebsites.net`, trailing paths, and whitespace. The key should be used exactly as provided (just trim whitespace).

### Step 3: Update All Skill Files

Using the Read and Edit tools, update all three skill files:

1. Read each file
2. Replace ALL occurrences of `YOUR-FUNCTION-NAME.azurewebsites.net` with `{their-function-name}.azurewebsites.net`
3. Replace ALL occurrences of `YOUR_FUNCTION_KEY` with their actual function key
4. Use `replace_all: true` to catch every instance

Also update the setup skill's Architecture section below with the actual values so future sessions can reference them.

### Step 4: Verify the Replacements

After editing, read each file again and search for any remaining `YOUR-FUNCTION-NAME` or `YOUR_FUNCTION_KEY` placeholders. If any remain, fix them.

### Step 5: Test the Connection

Make a test API call to verify everything works:

```
web_fetch: https://{function-name}.azurewebsites.net/api/cloudradial/search_companies?code={function-key}&name=a
```

If this returns company data, the plugin is working.

If it fails:
- **401 from Azure Function**: The function key is wrong. Ask the user to double-check it.
- **401/403 in the response body**: The CloudRadial API keys stored in the Azure Function App Settings are wrong. The user needs to update them via Azure Portal or CLI.
- **404**: The Azure Function may not be running. Check in Azure Portal.
- **Timeout**: The function is cold-starting. Retry after a few seconds.

### Step 6: Confirm Success

Once the test call works, tell the user:

"You're all set! I can see your portal data. Here are a few things you can try:
- 'Show me all my companies'
- 'Look up [company name]'
- 'How many endpoints does [company] have?'
- 'Audit the portal for [company]'
- 'Create a KB article for [company]'
- 'Export a catalog template'

What would you like to do first?"

## Architecture (Reference)

These values are updated by the setup wizard. If they still show placeholders, run setup again.

- **Azure Function**: `https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}`
- **Auth**: Function key passed as `code` query parameter
- **Function Key**: `YOUR_FUNCTION_KEY`
- **CloudRadial API keys**: Stored as App Settings on the Azure Function (not in local files)
- **Read calls**: Use `web_fetch` (GET) or Chrome JS `fetch()`
- **Write calls**: Use Chrome JS `fetch()` with POST/PUT/PATCH/DELETE (Claude in Chrome JavaScript tool)

## Reconfiguring

If the user needs to change their Azure Function (different deployment, rotated key, etc.):

1. Ask for the new function name and/or key
2. Read each skill file
3. Replace the OLD function name/key with the NEW values (use the values from the Architecture section above to know what to search for)
4. Update the Architecture section
5. Test the connection

## Changing CloudRadial API Keys

If the CloudRadial API keys need to be rotated (these are stored in Azure, not in these files):

1. Get new API keys from CloudRadial admin portal: **Settings > API**
2. Update the Azure Function App Settings via CLI or Azure Portal:
   ```
   az functionapp config appsettings set --name {function-name} --resource-group {resource-group} --settings CLOUDRADIAL_PUBLIC_KEY="<key>" CLOUDRADIAL_PRIVATE_KEY="<key>"
   ```
3. Verify with a test call — no plugin changes needed, just the Azure side
