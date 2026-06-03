---
name: company-management
description: >
  Manage CloudRadial companies — create, update, delete, and organize them into groups.
  Use when the user says "list all companies", "create a new company", "add a company",
  "update company settings", "change account manager", "set portal branding",
  "company groups", "add company to group", "remove company from group",
  "audit company settings", "which companies have no logo", "compare companies",
  "cross-company report", "how many companies do I have", or needs to create, modify,
  organize, or audit companies across their CloudRadial portal. Also use when the user
  wants to manage company-level settings like messaging, branding, territory, or
  delegated admin status.
metadata:
  version: "1.0.0"
---

# Company Management

Create, update, organize, and audit companies across a CloudRadial portal.

## How to Call the API

All CloudRadial work goes through MCP tools served by the `cloudradial-ucp` server. The plugin auto-registers the server via `.mcp.json`.

### Before any tool call

Call `setup_status` first to confirm credentials are stored. If it returns `configured: false`, defer to the `setup` skill.

### Key MCP tools for this skill

| Tool | Purpose | Required args |
|------|---------|---------------|
| `search_companies` | Find companies by partial name | `name` |
| `company_overview` | Full snapshot: details, user/endpoint counts, recent articles + feedback | `company_id` |
| `list_resources` | List companies, company groups, or group memberships with OData filtering | `resource_type` |
| `count_resources` | Count any resource type | `resource_type` |
| `get_resource` | Get a single company by ID (returns full detail including branding, messaging, etc.) | `resource_type: "company"`, `id` |
| `create_resource` | Create a company, group, or group membership | `resource_type`, `data` |
| `update_resource` | Update company settings (PUT full / PATCH partial) | `resource_type`, `id`, `data` |
| `delete_resource` | Delete a company, group, or group membership | `resource_type`, `id` |

### OData conventions

Pass OData parameters **without** the leading `$`: `filter`, `select`, `orderby`, `top`, `skip`. Defaults to `top=100`. Max page is 200.

### Errors

- **"credentials not configured"** → defer to `setup` skill.
- **401/403** → stored credentials are invalid. Run `setup` to rotate.
- **404** → resource not found, verify the ID.

## Resource Types

### company

The core resource. Fields available via `get_resource` (by ID):

| Field | Type | Description |
|-------|------|-------------|
| `companyId` | int | Unique identifier |
| `name` | string | Company display name |
| `partnerId` | int | Parent partner ID |
| `territory` | string | Sales territory or region |
| `accountManager` | string | Assigned account manager name |
| `psaIdentifier` | string | PSA system identifier |
| `featureSetId` | int | Feature set assigned to this company |
| `portalLogoUrl` | string | URL to the company's portal logo |
| `portalThemeColor` | string | Hex color code for portal branding |
| `isMessageDigestEnabled` | bool | Whether message digest emails are enabled |
| `isMessageDirectEnabled` | bool | Whether direct messages are enabled |
| `isDelegatedAdmin` | bool | Whether delegated admin is enabled |

Fields available via `list_resources` (OData, more limited):

| Field | Type | Description |
|-------|------|-------------|
| `companyId` | int | Unique identifier |
| `name` | string | Company display name |
| `agentFileName` | string | Data agent executable filename |
| `psaIdentifier` | string | PSA system identifier |
| `psaKey` | int | PSA numeric key |
| `endpointCount` | int | Number of managed endpoints |

To get the full detail (branding, messaging, account manager, etc.), use `get_resource` with the company ID — the OData listing only returns the limited field set.

### company_group

Groups for organizing companies. Fields: `companyGroupId`, `group` (the group name), `partnerId`.

### company_group_company

Membership records linking companies to groups. This is a **composite-key resource** — use `company_group_id` + `company_id` for get/delete operations.

Fields: `companyGroupId`, `companyId`, `partnerId`.

## Workflows

### List all companies

1. Call `list_resources` with `resource_type: "company"` to get names, IDs, and endpoint counts.
2. For full detail on any specific company, follow up with `get_resource` for that company ID.

### Create a new company

1. Call `create_resource` with `resource_type: "company"` and `data` containing at minimum `name`.
2. Optional fields: `territory`, `accountManager`, `portalThemeColor`, `isMessageDigestEnabled`, `isMessageDirectEnabled`.
3. After creation, the company will need users added and content seeded — suggest the user follow up with the portal-setup skill.

### Update company settings

1. Look up the company (by name via `search_companies` or by ID).
2. Call `update_resource` with `resource_type: "company"`, `id`, and `data` containing only the fields to change.
3. Common updates: changing `accountManager`, setting `portalLogoUrl` or `portalThemeColor`, toggling messaging settings.

### Manage company groups

**List groups:** `list_resources` with `resource_type: "company_group"`.

**Create a group:** `create_resource` with `resource_type: "company_group"` and `data: {"group": "Group Name"}`.

**Add a company to a group:** `create_resource` with `resource_type: "company_group_company"` and `data: {"companyGroupId": <id>, "companyId": <id>}`.

**Remove a company from a group:** `delete_resource` with `resource_type: "company_group_company"`, `company_group_id`, and `company_id`.

**List companies in a group:** `list_resources` with `resource_type: "company_group_company"` and `filter: "companyGroupId eq <id>"`.

### Cross-company audit

To audit settings across all companies:

1. List all companies via `list_resources`.
2. For each company, call `get_resource` to get the full detail.
3. Compare settings and flag inconsistencies:
   - Companies without a portal logo (`portalLogoUrl` is empty)
   - Companies without a theme color (`portalThemeColor` is null)
   - Companies with messaging disabled
   - Companies with no account manager assigned
   - Companies with zero endpoints (no device sync)

### Visual presentation

When presenting company lists, cross-company audits, or group memberships, use `show_widget` to render a visual card. Follow the same layout patterns as the portal-lookup skill:

- Header with title and count
- Stats row for summary numbers
- Table for company details
- Flags for issues found
- Use CSS variables for all colors

Widget title: `company_management_report` (snake_case).
