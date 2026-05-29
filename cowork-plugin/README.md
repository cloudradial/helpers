# CloudRadial UCP Plugin for Cowork

Connect Claude Desktop (Cowork mode) to your CloudRadial UCP Portal via an Azure Function API proxy. Query companies, users, endpoints, articles, feedback, and 20+ other resource types — including full read/write support — directly from your Cowork sessions.

## Quick Start

**Partners installing the plugin:** Download the `.plugin` file from [GitHub Releases](https://github.com/cloudradial/helpers/releases), drag it into a Cowork session, and say **"Set up CloudRadial"**. The setup wizard walks you through everything — deploying the Azure Function, configuring credentials, and testing the connection.

**Developers / contributors:** Clone the full repo to get both the plugin source and the Azure Function server code:

```
git clone https://github.com/cloudradial/helpers.git
cd helpers/cowork-plugin/cloudradial-ucp
```

## How It Works

```
Cowork (Claude Desktop)
    |
    |  Chrome JS fetch() with x-functions-key header
    v
Azure Function  (your own deployment, holds your API keys)
    |
    |  HTTP Basic Auth
    v
CloudRadial API V2
```

All API calls use Chrome JS `fetch()` with the `x-functions-key` HTTP header for authentication. The Azure Function acts as a secure proxy — your CloudRadial API keys are stored as Azure App Settings and never appear in local files or chat. Each partner deploys their own Azure Function. Total cost: under $1/month on Azure's Consumption plan (usually free).

**Requires:** [Claude in Chrome](https://chromewebstore.google.com/) extension installed and connected to Claude Desktop.

## What's Inside

### Repository Structure

```
cowork-plugin/
├── README.md                    ← You are here
└── cloudradial-ucp/
    ├── .claude-plugin/
    │   └── plugin.json          ← Plugin manifest
    ├── skills/                  ← 11 Cowork skills (see below)
    ├── references/              ← API schema reference
    ├── azure-mcp-server/        ← Azure Function source code (NOT in the .plugin)
    ├── scripts/
    │   └── build-plugin.sh      ← Builds the .plugin file
    ├── .github/workflows/       ← GitHub Actions release automation
    ├── README.md                ← Plugin-specific docs
    ├── DEPLOYMENT.md            ← Full Azure Function deployment guide
    └── CAPABILITIES.md          ← API operations reference
```

### Skills (11)

| Skill | What It Does |
|-------|-------------|
| **setup** | Interactive wizard — deploys the Azure Function, configures the plugin, tests the connection |
| **portal-setup** | Guide partners through portal implementation: 5-session process, LOMG assessment, CSA pain point playbooks |
| **portal-lookup** | Look up companies, check portal status, prepare for meetings |
| **content-management** | Create and manage articles, catalogs, menus, and assessments |
| **user-management** | Look up users by email/name, list users by company, analyze adoption |
| **endpoint-reporting** | List endpoints, warranty reports, device inventory, application audits |
| **course-management** | Create courses and lessons, check enrollments, manage training content |
| **assessment-compliance** | Review security assessments, compliance tracking, flexible asset management |
| **feedback-analysis** | Analyze user feedback, CSAT trends, satisfaction reporting |
| **service-management** | Services, service installs, domains, products, coverage analysis |
| **reporting-admin** | Archives, certificates, company groups, media, tokens, raw API access |

### Operations (11 API operations)

| Operation | What It Does |
|-----------|-------------|
| `search_companies` | Search companies by name |
| `company_overview` | Full snapshot: company details, user/endpoint counts, recent articles and feedback |
| `list_resources` | List any of 30 resource types with OData filtering, sorting, and pagination |
| `count_resources` | Count any resource type with optional filters |
| `get_resource` | Retrieve a single resource by ID |
| `create_resource` | Create a new resource |
| `update_resource` | Update a resource by ID (full PUT or partial PATCH) |
| `delete_resource` | Delete a resource by ID |
| `user_lookup` | Find users by email, name, or company |
| `manage_tokens` | List, create, get, or revoke API tokens |
| `raw_api_call` | Direct API call for advanced/custom use cases |

### 27 Supported Resource Types

company, user, article, endpoint, catalog, catalog_question, assessment, feedback, service, service_install, domain, course, course_enrollment, course_lesson, menu, product, archive_item, certificate, company_group, quickstart, flexible_asset, flexible_asset_type, flexible_asset_field, endpoint_application, endpoint_custom_property, media, token

## Example Conversations

Once installed, just talk to Claude naturally:

- "Show me all my companies in CloudRadial"
- "How many endpoints does Acme Corp have?"
- "Create a KB article for Contoso about how to reset MFA"
- "Give me a full overview of company 42 before my call"
- "Build a phishing awareness training course for company 15"
- "Which endpoints are out of warranty?"
- "Check assessment compliance for company 15"
- "What feedback has Contoso submitted?"

## Documentation

- **[DEPLOYMENT.md](cloudradial-ucp/DEPLOYMENT.md)** — Full step-by-step Azure Function deployment guide with troubleshooting
- **[CAPABILITIES.md](cloudradial-ucp/CAPABILITIES.md)** — Complete reference: all operations, 27 resource types, OData query options, Chrome JS examples
- **[references/api-reference.md](cloudradial-ucp/references/api-reference.md)** — CloudRadial API V2 field-level schema reference

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" or 401 from Azure | The function key is wrong. Check it with `az functionapp keys list`. |
| 401/403 in the response body | The CloudRadial API keys in your Azure Function App Settings are wrong. |
| Timeout on first call | Normal — Azure Functions cold-start after inactivity. Retry after a few seconds. |
| Plugin fails to upload | Make sure `.mcp.json` is NOT included in the .plugin file. |
| Write operations don't work | Make sure Claude in Chrome extension is installed and connected. |

## License

MIT
