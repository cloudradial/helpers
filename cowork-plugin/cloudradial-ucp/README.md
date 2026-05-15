# CloudRadial UCP Plugin for Cowork

Connect Claude Desktop (Cowork mode) to your CloudRadial UCP Portal via an Azure Function API proxy. Query companies, users, endpoints, articles, feedback, and 20+ other resource types — including full read/write support — directly from your Cowork sessions.

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

Cowork has two ways to call the API, and **both work without any extra software**:

1. **`web_fetch`** (GET only) — Simple read operations. Cowork's built-in HTTP tool.
2. **Chrome JS `fetch()`** (GET, POST, PUT, PATCH, DELETE) — Full read/write. Uses Claude in Chrome's JavaScript tool to call `fetch()` in the browser. No extensions or installs needed.

Each partner deploys their own Azure Function with their own CloudRadial API keys. The function key protects the endpoint so only authorized callers can use it.

## What You Can Do

### Skills

The plugin includes two workflow-oriented skills that guide Claude through common tasks:

- **portal-lookup** — Look up a partner or client portal, check implementation status, review user/endpoint/article counts, assess LOMG lifecycle stage, and prepare for meetings
- **content-management** — Create and manage articles, catalogs, menus, courses, and assessments across portals

### Operations

11 API operations covering all read and write scenarios:

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

### 27 Supported Resource Types

company, user, article, endpoint, catalog, catalog_question, assessment, feedback, service, service_install, domain, course, course_enrollment, course_lesson, menu, product, archive_item, certificate, company_group, quickstart, flexible_asset, flexible_asset_type, flexible_asset_field, endpoint_application, endpoint_custom_property, media, token

## Getting Started

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete setup guide. It walks you through everything from scratch — installing tools, creating Azure resources, deploying the function, configuring API keys, and installing the plugin — with troubleshooting for every step.

### Quick Overview

1. **Install tools** — Git, Node.js 24+, Azure CLI, Azure Functions Core Tools, Claude in Chrome extension
2. **Download the code** — `git clone https://github.com/cloudradial/helpers.git` (or download ZIP from GitHub)
3. **Deploy the Azure Function** — Create a resource group, storage account, and function app in Azure; set your CloudRadial API keys; build and deploy the function code
4. **Install in Cowork** — Package as a `.plugin` file and drag into Claude Desktop
5. **Configure** — Say "Set up CloudRadial" in Cowork and the setup wizard walks you through entering your Azure Function URL and key interactively (or run `.\setup.ps1` before installing)
6. **Verify** — The wizard tests the connection automatically, then you're ready to go

Total cost: under $1/month on Azure's Consumption plan (usually free).

## Usage Examples

- "Look up Acme Corp in CloudRadial"
- "How many endpoints does company 42 have?"
- "Show me all articles for Contoso"
- "Give me an overview of company 123 before my meeting"
- "Create a KB article for company 42 about password resets"
- "Export the catalog questions for the laptop order form"
- "What courses are available for company 15?"

## How Read and Write Operations Work

**Read operations** (search, list, get, count, overview) use `web_fetch` GET requests by default. These cover the most common day-to-day CSM workflows.

**Write operations** (create, update, delete) use Chrome JS `fetch()` — Claude runs a JavaScript `fetch()` call in the browser to POST/PUT/PATCH/DELETE through your Azure Function. This happens automatically when a skill needs to write; no extra tools or setup required beyond having Claude in Chrome connected.

**Tip:** Chrome JS `fetch()` also works for reads and is better for complex queries — it avoids `web_fetch` URL length limits and provenance restrictions. The skills will pick the right approach automatically.

## Things to Know

- **First call may be slow.** Azure Functions on Consumption plans cold-start after inactivity. The first call in a session may take 5-10 seconds; subsequent calls are fast.
- **Seed your URL once per session.** Cowork's `web_fetch` tool requires URL provenance — paste your Azure Function URL once at the start of a session to enable it. Chrome JS `fetch()` has no such restriction.
- **OData pagination caps at 200.** The CloudRadial API returns a maximum of 200 results per page. For larger datasets, the skills paginate automatically using `$top` and `$skip`.
- **Article field names.** The article model uses `subject` (not `title`) for the article name. The skills handle this, but keep it in mind for raw API calls.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Full step-by-step Azure Function deployment guide with troubleshooting
- **[CAPABILITIES.md](CAPABILITIES.md)** — Complete reference: all operations, 27 resource types, OData query options, Chrome JS examples
- **[references/api-reference.md](references/api-reference.md)** — CloudRadial API V2 field-level schema reference

## Architecture

The Azure Function (`azure-mcp-server/`) is a Node.js Azure Functions v4 app with a single HTTP trigger that dispatches to operation handlers. It authenticates to CloudRadial using HTTP Basic auth (API keys stored as Azure App Settings, never in local files).

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
