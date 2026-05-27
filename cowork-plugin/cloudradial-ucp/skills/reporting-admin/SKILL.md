---
name: reporting-admin
description: >
  Access CloudRadial archives, certificates, company groups, media files, API tokens,
  and raw API calls. Use when the user says "archived reports", "certificates",
  "company groups", "media files", "API tokens", "manage tokens", "raw API call",
  "quickstart guides", "bulk export", "cross-company report", or needs to access
  archive items, certificates, company groupings, media management, token administration,
  or make advanced raw API calls not covered by other skills.
metadata:
  version: "1.0.0"
---

# Reporting & Administration

Access archives, certificates, company groups, media, tokens, and advanced API operations across CloudRadial portals.

## How to Call the API

All CloudRadial work goes through MCP tools served by the `cloudradial-ucp` server. The plugin auto-registers the server via `.mcp.json` — no Azure Function, no Chrome extension, no local config file.

### Before any tool call

Call `setup_status` first to confirm credentials are stored. If it returns `configured: false`, defer to the `setup` skill before doing CloudRadial work.

### Available MCP tools

| Tool | Purpose | Required args |
|------|---------|---------------|
| `setup_status` | Check credential state (never returns the keys) | — |
| `search_companies` | Search companies by partial name | `name` |
| `company_overview` | Snapshot: details, user/endpoint counts, recent articles + feedback | `company_id` |
| `list_resources` | List any of 30 resource types with OData filtering | `resource_type` |
| `count_resources` | Count a resource type with optional `filter` | `resource_type` |
| `get_resource` | Retrieve one resource by ID | `resource_type`, `id` |
| `create_resource` | Create a new resource | `resource_type`, `data` |
| `update_resource` | PUT (full) or PATCH (partial) update | `resource_type`, `id`, `data` |
| `delete_resource` | Delete by ID | `resource_type`, `id` |
| `user_lookup` | Find users by email, name, or company | one of `email`/`name`/`company_id` |
| `manage_tokens` | List, get, create, or revoke API tokens | `action` |
| `endpoint_update_warranty` | Trigger async warranty refresh by endpoint serial number | `serial_number` |
| `courseenrollment_complete` | Mark a course enrollment completed (optional score/comment) | `enrollment_id` |
| `courseenrollment_for_user` | Get a user's enrollment record for a specific course | `course_id`, `user_id` |
| `raw_api_call` | Direct API call for advanced cases | `path` |

### OData parameter conventions

For `list_resources` and `count_resources`, pass OData parameters **without** the leading `$`: `filter`, `select`, `orderby`, `top`, `skip`, `expand`, `search`. The server adds the `$` when forwarding. Page size caps at 200 — paginate with `top` + `skip`.

### Field-name quirks

- Articles use `subject` (not `title`).
- Courses use `name` (not `title`).
- `archive_item` composite key — pass `archive_id` and `id`.
- `service_install` composite key — pass `endpoint_id` and `service_id` (or `id = serviceId` on update/delete).

### Errors

- **"credentials not configured"** → defer to the `setup` skill.
- **401/403 from CloudRadial** → stored credentials are invalid. Run `setup` to rotate.
- **404** → resource not found, verify the ID.

## Resource Types

### archive_item
Archived reports and documents. Key fields: `companyReportItemId`, `companyReportFolderId`, `companyId`, `subject`, `text`, `dateUploaded`.

**Note:** archive_item is a composite-key resource. Getting a specific item requires both `archive_id` (the folder) and `id` (the item).

### certificate
Certificates tracked in the portal. Key fields: `certificateId`, `companyId`, `name`, `expirationDate`.

### company_group
Logical groupings of companies. Key fields: `companyGroupId`, `name`, `description`.

### quickstart
Quickstart guides available in the portal. Key fields: `quickstartId`, `name`, `description`.

### media
Media files (images, documents) stored in the portal. Key fields: `mediaId`, `name`, `contentType`, `url`.

### token
API tokens for CloudRadial access. Managed through the `manage_tokens` operation.

## Example Calls

**List archived reports for a company:** Call `list_resources` with `resource_type: "archive_item"`, `filter: "companyId eq 42"`.

**Get a specific archive item (requires both IDs):** Call `get_resource` with `resource_type: "archive_item"`, `archive_id: "10"`, `id: "55"`.

**List certificates for a company:** Call `list_resources` with `resource_type: "certificate"`, `filter: "companyId eq 42"`.

**List company groups:** Call `list_resources` with `resource_type: "company_group"`.

**List quickstart guides:** Call `list_resources` with `resource_type: "quickstart"`.

**List media files:** Call `list_resources` with `resource_type: "media"`.

### Token Management

The `manage_tokens` tool handles API token lifecycle.

**List all tokens:** Call `manage_tokens` with `action: "list"`.

**Create a new token:** Call `manage_tokens` with `action: "create"`, `data: { name: "My Token" }`.

**Revoke a token:** Call `manage_tokens` with `action: "revoke"`, `token_id: "123"`.

### Raw API Calls

For advanced operations not covered by the standard tools, use `raw_api_call` to hit any CloudRadial API endpoint directly.

**GET example:** Call `raw_api_call` with `method: "GET"`, `path: "/v2/odata/company/$count"`.

**POST example with query params:** Call `raw_api_call` with `method: "GET"`, `path: "/v2/odata/company"`, `query: { "$top": 5, "$select": "companyId,name" }`.

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api