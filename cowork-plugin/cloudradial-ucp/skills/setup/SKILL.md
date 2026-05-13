---
name: setup
description: >
  Guide a partner through first-time setup of the CloudRadial UCP plugin.
  Use when the user says "set up CloudRadial", "configure the plugin",
  "connect to my portal", "I just installed the CloudRadial plugin",
  or when any CloudRadial MCP tool call fails with an authentication error
  or missing credentials message. Also trigger proactively if the user
  tries to use a CloudRadial tool and gets an error about missing
  CLOUDRADIAL_PUBLIC_KEY or CLOUDRADIAL_PRIVATE_KEY.
metadata:
  version: "0.1.0"
---

# CloudRadial UCP Plugin Setup

Walk the partner through connecting the plugin to their CloudRadial portal. Keep the tone friendly and supportive — most partners are technical but may not be familiar with environment variables.

## Detection

If a CloudRadial MCP tool returns an error containing "PUBLIC_KEY", "PRIVATE_KEY", "401", "Unauthorized", or "authentication", the plugin is not configured yet. Trigger this setup flow automatically.

## Setup Flow

### 1. Welcome

Greet the partner and explain what's about to happen in plain terms:

"This plugin connects Claude to your CloudRadial portal so I can look up companies, manage articles, check endpoint counts, and more. To get started, I need your API keys from CloudRadial — this is a one-time setup that takes about 2 minutes."

### 2. Get API Keys

Walk them through finding their keys:

"Log into your CloudRadial admin portal and go to **Settings > API**. You'll see two values:
- **Public Key** — this is like your username
- **Private Key** — this is like your password

Copy both of them. Don't share them in this chat — you'll paste them into a command in the next step."

If the partner is unsure where to find the API settings, offer to help them navigate the admin portal using the browser.

### 3. Set Environment Variables

Detect their operating system from context (or ask). Then provide the right instructions:

**For Windows (most partners):**

"Open PowerShell (you can search for it in the Start menu) and run these two commands, replacing the placeholder text with your actual keys:"

```powershell
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PUBLIC_KEY', 'paste-your-public-key-here', 'User')
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PRIVATE_KEY', 'paste-your-private-key-here', 'User')
```

"After running those commands, **close and reopen Claude Desktop** so it picks up the new settings."

**For macOS:**

"Open Terminal and run:"

```bash
echo 'export CLOUDRADIAL_PUBLIC_KEY="paste-your-public-key-here"' >> ~/.zshrc
echo 'export CLOUDRADIAL_PRIVATE_KEY="paste-your-private-key-here"' >> ~/.zshrc
source ~/.zshrc
```

"Then **restart Claude Desktop**."

**Optional — regional URL:**

If the partner's portal is not on the US instance (api.us.cloudradial.com), they also need:

```powershell
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_BASE_URL', 'https://api.eu.cloudradial.com', 'User')
```

### 4. Verify

After they've restarted Claude Desktop, run a quick test:

"Let's make sure everything works. I'll try to pull your company list."

Call `search_companies` with a broad term (like "a") or `count_resources` for `company`. If it returns data, setup is complete. If it returns an auth error, help them troubleshoot (common issues: typo in keys, didn't restart Claude, copied extra whitespace).

### 5. Success

Confirm the connection and suggest a first action:

"You're all set! I can see your portal data. Here are a few things you can try:
- 'Show me all my companies'
- 'Look up [company name]'
- 'How many endpoints does [company] have?'
- 'Create a KB article for [company] about [topic]'

What would you like to do first?"

## Troubleshooting

Common issues and resolutions:

- **"Unauthorized" or 401 error**: Keys are wrong or weren't saved properly. Have them re-run the PowerShell commands and verify the key values.
- **"Connection refused" or timeout**: Check CLOUDRADIAL_BASE_URL — they might need a different regional endpoint.
- **"Cannot find module"**: The plugin's node_modules may be missing. Suggest reinstalling the plugin.
- **Keys work in Swagger but not here**: Make sure they restarted Claude Desktop after setting the env vars. Environment variables only load at application startup.
