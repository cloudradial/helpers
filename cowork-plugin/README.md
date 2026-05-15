# CloudRadial UCP Plugin for Cowork

Connect Claude Desktop (Cowork mode) to your CloudRadial UCP Portal via an Azure Function API proxy. Query companies, users, endpoints, articles, feedback, and 20+ other resource types — including full read/write support — directly from your Cowork sessions.

## Why This Matters

Claude Desktop's Cowork mode lets you talk to an AI assistant that can read, write, and interact with your tools — but out of the box it doesn't know anything about CloudRadial. This plugin bridges that gap. Once installed, Claude can directly query your CloudRadial portal: look up companies, check endpoint counts, create KB articles, review feedback, audit portal content, and more — all through natural conversation.

Instead of switching between the CloudRadial admin portal, spreadsheets, and notes, you ask Claude what you need and it pulls the answer from your live portal data.

## Who This Is For

- **Partners managing client portals** — Get instant answers about any company's setup without navigating the admin UI.
- **CSMs preparing for meetings** — Pull a full company overview (users, endpoints, articles, feedback) in seconds before a call.
- **Partners building portal content** — Create and update KB articles, service catalogs, and course content directly through conversation.
- **Anyone who wants to work faster in CloudRadial** — If you can describe what you need in plain English, Claude can do it through the API.

## How It Works

```
Cowork (Claude Desktop)
    |
    |  web_fetch (GET reads)  or  Chrome JS fetch() (all methods)
    v
Azure Function  (your own deployment, holds your API keys)
    |  HTTP Basic Auth
    v
CloudRadial API V2
```

The plugin works through a lightweight Azure Function that acts as an authenticated proxy to the CloudRadial API. Your CloudRadial API keys are stored securely as App Settings on the Azure Function — they never appear in local files or in chat.

Each partner deploys their own Azure Function with their own CloudRadial API keys. Total cost: under $1/month on Azure's Consumption plan (usually free).

## What You'll Need

- **Claude Desktop** with Cowork mode (requires a Claude Pro, Team, or Enterprise subscription)
- **Claude in Chrome** browser extension (for write operations)
- **CloudRadial API credentials** — your Public Key and Private Key from Settings > API in your CloudRadial portal
- **Azure subscription** — free tier works fine
- **Node.js 24+** and **Azure CLI** (for deploying the Azure Function)

## Getting Started

The full setup walks you through everything from scratch — installing tools, creating Azure resources, deploying the function, configuring API keys, and installing the plugin.

See **[cloudradial-ucp/DEPLOYMENT.md](cloudradial-ucp/DEPLOYMENT.md)** for the complete step-by-step guide.

### Quick Overview

1. **Install tools** — Git, Node.js 24+, Azure CLI, Azure Functions Core Tools, Claude in Chrome extension
2. **Download the code** — `git clone https://github.com/cloudradial/helpers.git` (or download ZIP from GitHub)
3. **Deploy the Azure Function** — Create a resource group, storage account, and function app in Azure; set your CloudRadial API keys; build and deploy the function code
4. **Install in Cowork** — Package as a `.plugin` file and drag into Claude Desktop
5. **Configure** — Say "Set up CloudRadial" in Cowork and the setup wizard walks you through entering your Azure Function URL and key interactively
6. **Verify** — The wizard tests the connection automatically, then you're ready to go

## What's Inside

### Operations (11 API operations)

| Operation | What It Does |
|-----------|-------------|
| `search_companies` | Search companies by name |
| `company_overview` | Full snapshot: company details, user/endpoint counts, recent articles and feedback |
| `list_resources` | List any of 27 resource types with OData filtering, sorting, and pagination |
| `count_resources` | Count any resource type with optional filters |
| `get_resource` | Retrieve a single resource by ID |
| `create_resource` | Create a new resource |
| `update_resource` | Update a resource by ID (full PUT or partial PATCH) |
| `delete_resource` | Delete a resource by ID |
| `user_lookup` | Find users by email, name, or company |
| `manage_tokens` | List, create, get, or revoke API tokens |
| `raw_api_call` | Direct API call for advanced/custom use cases |

### Skills (conversational workflows)

| Skill | Trigger Phrases |
|-------|----------------|
| **setup** | "Set up CloudRadial", "connect to my portal" — also auto-triggers on auth errors |
| **portal-lookup** | "Look up [company]", "check portal status", "prepare for my meeting with [company]" |
| **content-management** | "Create an article for [company]", "audit portal content", "set up a service catalog" |

### 27 Supported Resource Types

company, user, article, endpoint, catalog, catalog_question, assessment, feedback, service, service_install, domain, course, course_enrollment, course_lesson, menu, product, archive_item, certificate, company_group, quickstart, flexible_asset, flexible_asset_type, flexible_asset_field, endpoint_application, endpoint_custom_property, media, token

## Example Conversations

Once installed, just talk to Claude naturally:

- "Show me all my companies in CloudRadial"
- "How many endpoints does Acme Corp have?"
- "Create a KB article for Contoso about how to reset MFA"
- "Give me a full overview of company 42 before my call"
- "Which companies have zero published articles?"
- "What courses are available for company 15?"

## Documentation

- **[cloudradial-ucp/DEPLOYMENT.md](cloudradial-ucp/DEPLOYMENT.md)** — Full step-by-step Azure Function deployment guide with troubleshooting
- **[cloudradial-ucp/CAPABILITIES.md](cloudradial-ucp/CAPABILITIES.md)** — Complete reference: all operations, 27 resource types, OData query options, Chrome JS examples
- **[cloudradial-ucp/references/api-reference.md](cloudradial-ucp/references/api-reference.md)** — CloudRadial API V2 field-level schema reference

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" or 401 from Azure | The function key is wrong. Check it with `az functionapp keys list`. |
| 401/403 in the response body | The CloudRadial API keys in your Azure Function App Settings are wrong. Update them via Azure Portal or CLI. |
| Timeout on first call | Normal — Azure Functions cold-start after inactivity. Retry after a few seconds. |
| `web_fetch` won't call the URL | Paste your Azure Function URL once at the start of the session to seed provenance. Or use Chrome JS `fetch()` which has no restrictions. |
| Write operations don't work | Make sure Claude in Chrome extension is installed and connected. Writes use Chrome JS `fetch()`. |

## License

MIT
