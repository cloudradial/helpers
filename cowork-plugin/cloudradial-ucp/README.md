# CloudRadial UCP Plugin for Cowork

Connect Claude Desktop (Cowork mode) to your CloudRadial UCP Portal via an Azure Function API proxy. Query companies, users, endpoints, articles, feedback, and 20+ other resource types — including full read/write support — directly from your Cowork sessions.

## Important: Azure Function Server Required

This plugin does NOT work on its own. It requires an **Azure Function proxy server** that you deploy to your own Azure subscription. The Azure Function holds your CloudRadial API keys securely and forwards requests from Cowork to the CloudRadial API.

```
Cowork (this plugin)
    |
    |  Chrome JS fetch() with x-functions-key header
    v
Azure Function  (you deploy this — code is in the GitHub repo)
    |
    |  HTTP Basic Auth (your CloudRadial API keys, stored in Azure)
    v
CloudRadial API V2
```

The Azure Function code is in the `azure-mcp-server/` directory of the [GitHub repo](https://github.com/cloudradial/helpers/tree/main/cowork-plugin/cloudradial-ucp/azure-mcp-server) — it is NOT bundled with the plugin file. After installing the plugin, say **"Set up CloudRadial"** and the setup wizard will walk you through deploying the server and connecting everything.

## How It Works

All API calls use **Chrome JS `fetch()`** with the `x-functions-key` HTTP header for authentication. This is the Azure Functions standard auth mechanism and avoids Chrome blocking credentials in URL query strings.

Each partner deploys their own Azure Function with their own CloudRadial API keys. The function key protects the endpoint so only authorized callers can use it.

**Requires:** [Claude in Chrome](https://chromewebstore.google.com/) extension installed and connected to Claude Desktop.

## Skills (11)

The plugin includes 11 skills covering the full CloudRadial API and implementation workflow:

| Skill | What It Does |
|-------|-------------|
| **setup** | Interactive wizard — deploys the Azure Function, configures the plugin, tests the connection (Mac, PC, Linux) |
| **portal-setup** | Guide partners through portal implementation: 5-session process, LOMG assessment, 8 CSA pain point playbooks, content seeding |
| **portal-lookup** | Look up companies, check portal status, assess LOMG lifecycle stage, prepare for meetings |
| **content-management** | Create and manage articles, catalogs, menus, courses, lessons, and assessments |
| **user-management** | Look up users by email/name, list users by company, analyze user adoption |
| **endpoint-reporting** | List endpoints, warranty reports, device inventory, application audits |
| **course-management** | Create courses and lessons, check enrollments, manage training content |
| **assessment-compliance** | Review security assessments, compliance tracking, flexible asset management |
| **feedback-analysis** | Analyze user feedback, CSAT trends, satisfaction reporting |
| **service-management** | Services, service installs, domains, products, coverage analysis |
| **reporting-admin** | Archives, certificates, company groups, media, tokens, raw API access |

## Operations (11)

The Azure Function exposes 11 API operations:

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

## 27 Supported Resource Types

company, user, article, endpoint, catalog, catalog_question, assessment, feedback, service, service_install, domain, course, course_enrollment, course_lesson, menu, product, archive_item, certificate, company_group, quickstart, flexible_asset, flexible_asset_type, flexible_asset_field, endpoint_application, endpoint_custom_property, media, token

## Getting Started

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete setup guide, or just install the plugin and say **"Set up CloudRadial"** — the setup wizard handles everything interactively.

### Quick Overview

1. **Install the plugin** — Drag the `.plugin` file into a Cowork session
2. **Say "Set up CloudRadial"** — The wizard detects you need the Azure Function and walks you through:
   - Installing prerequisites (Git, Node.js 24+, Azure CLI, Azure Functions Core Tools)
   - Cloning the server code from GitHub
   - Creating Azure resources (resource group, storage, function app)
   - Storing your CloudRadial API keys in Azure App Settings
   - Building and deploying the function
   - Configuring the plugin with your function URL and key
   - Testing the connection
3. **Start using it** — "Look up Acme Corp", "How many endpoints does company 42 have?", etc.

Total Azure cost: under $1/month on the Consumption plan (usually free — 1M executions/month included).

## Usage Examples

- "Look up Acme Corp in CloudRadial"
- "How many endpoints does company 42 have?"
- "Show me all articles for Contoso"
- "Give me an overview of company 123 before my meeting"
- "Create a KB article for company 42 about password resets"
- "Build a training course about phishing awareness"
- "Which endpoints are out of warranty?"
- "Check assessment compliance for company 15"
- "What feedback has company 42 submitted?"
- "List all services installed for Contoso"

## Things to Know

- **First call may be slow.** Azure Functions on Consumption plans cold-start after inactivity. The first call in a session may take 5-10 seconds; subsequent calls are fast.
- **Chrome JS uses `x-functions-key` header.** This is the preferred auth method. The `?code=KEY` query parameter gets blocked by Chrome's security. Skills handle this automatically.
- **OData pagination caps at 200.** The CloudRadial API returns a maximum of 200 results per page. Skills paginate automatically using `$top` and `$skip`.
- **Article uses `subject`, not `title`.** Course uses `name`, not `title`. Skills handle this, but keep it in mind for raw API calls.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Full step-by-step Azure Function deployment guide with troubleshooting
- **[CAPABILITIES.md](CAPABILITIES.md)** — Complete reference: all operations, 27 resource types, OData query options, Chrome JS examples
- **[references/api-reference.md](references/api-reference.md)** — CloudRadial API V2 field-level schema reference

## Architecture

The Azure Function (`azure-mcp-server/` in the GitHub repo) is a Node.js Azure Functions v4 app with a single HTTP trigger that dispatches to operation handlers. It authenticates to CloudRadial using HTTP Basic auth (API keys stored as Azure App Settings, never in local files).

```
azure-mcp-server/
  src/
    index.ts              # Entry point
    functions/
      cloudradial-api.ts  # Main dispatcher — 11 operations, 27 resource types
      healthcheck.ts      # GET /api/healthcheck — anonymous diagnostic endpoint
  host.json               # Azure Functions host config
  package.json
  tsconfig.json
```

## License

MIT
