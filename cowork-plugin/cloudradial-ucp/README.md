# CloudRadial UCP Plugin

Connect Claude to your CloudRadial UCP Portal via the CloudRadial API V2.

## What it does

This plugin gives Claude direct access to your CloudRadial portal data through 10 MCP tools covering all 29 API resource groups (229 endpoints). It includes two skills tailored to CSM workflows.

### MCP Tools

| Tool | Purpose |
|------|---------|
| `list_resources` | List any resource type with OData filtering, sorting, pagination |
| `count_resources` | Get counts of any resource type |
| `get_resource` | Retrieve a single resource by ID |
| `create_resource` | Create a new resource |
| `update_resource` | Full or partial update of a resource |
| `delete_resource` | Delete a resource |
| `company_overview` | Comprehensive company snapshot (details, users, endpoints, articles, feedback) |
| `search_companies` | Quick company name search |
| `user_lookup` | Find users by email, name, or company |
| `manage_tokens` | List, create, get, or revoke API tokens |
| `raw_api_call` | Direct API call for advanced use cases |

### Supported Resource Types

company, user, article, endpoint, catalog, catalog_question, assessment, feedback, service, service_install, domain, course, course_enrollment, course_lesson, menu, product, archive_item, certificate, company_group, quickstart, flexible_asset, flexible_asset_type, flexible_asset_field, endpoint_application, endpoint_custom_property, media, token

### Skills

- **portal-lookup** — Look up a partner's portal status, check implementation readiness, prepare for meetings
- **content-management** — Create and manage articles, catalogs, menus, courses, and assessments

## Installation

### Option 1: Download from GitHub Releases (easiest)

1. Go to the [Releases](../../releases) page
2. Download `cloudradial-ucp.plugin` from the latest release
3. In Claude Desktop, open Cowork mode and drag the `.plugin` file into the chat — or go to Settings > Plugins and install from file

### Option 2: Install from source

1. Clone this repo: `git clone https://github.com/YOUR_ORG/cloudradial-ucp.git`
2. Run the build script: `cd cloudradial-ucp && chmod +x scripts/build-plugin.sh && ./scripts/build-plugin.sh`
3. Install the generated `cloudradial-ucp.plugin` file in Claude Desktop

## Setup

After installing the plugin, you need to configure your CloudRadial API credentials.

### Step 1: Get Your API Keys

1. Log into the CloudRadial UCP admin portal
2. Navigate to Settings > API Keys
3. Generate or copy your public key and private key

### Step 2: Set Environment Variables

The plugin needs three environment variables. Set them in your system environment before launching Claude Desktop.

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDRADIAL_PUBLIC_KEY` | Yes | Your CloudRadial API public key (used as the "username") |
| `CLOUDRADIAL_PRIVATE_KEY` | Yes | Your CloudRadial API private key (used as the "password") |
| `CLOUDRADIAL_BASE_URL` | No | API base URL. Defaults to `https://api.us.cloudradial.com`. Change if you use an EU or other regional instance. |

**Windows (System Environment Variables):**

Open PowerShell as Administrator and run:
```powershell
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PUBLIC_KEY', 'your-public-key-here', 'User')
[System.Environment]::SetEnvironmentVariable('CLOUDRADIAL_PRIVATE_KEY', 'your-private-key-here', 'User')
```

**macOS/Linux:**

Add to your `~/.zshrc` or `~/.bashrc`:
```bash
export CLOUDRADIAL_PUBLIC_KEY="your-public-key-here"
export CLOUDRADIAL_PRIVATE_KEY="your-private-key-here"
```

Then restart Claude Desktop so it picks up the new variables.

### Step 3: Verify

Open a new Cowork session and say: "Search for companies in CloudRadial." If the plugin is configured correctly, Claude will query the API and return results.

## Usage Examples

- "Look up Acme Corp in CloudRadial"
- "How many endpoints does company 42 have?"
- "Create a KB article for Contoso about password resets"
- "Show me all feedback from the last month"
- "List all companies with more than 50 endpoints"
- "What courses are available for company 15?"
- "Give me an overview of company 123 before my meeting"
- "How many users are in each company?"

## For Developers

### Building a release

Tag a version and push to trigger the GitHub Action:
```bash
git tag v0.1.0
git push origin v0.1.0
```

This automatically builds the `.plugin` file and creates a GitHub Release with it attached.

### Building locally

```bash
./scripts/build-plugin.sh
```

### Architecture

The plugin runs a local Node.js MCP server (`servers/cloudradial-mcp.mjs`) via stdio. The server authenticates with the CloudRadial API V2 using HTTP Basic auth and exposes tools that Claude can call. All 29 resource types are supported through generic CRUD tools, plus convenience tools for common lookups.
