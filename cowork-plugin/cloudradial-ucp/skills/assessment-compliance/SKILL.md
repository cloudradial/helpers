---
name: assessment-compliance
description: >
  Review and analyze CloudRadial security assessments, compliance status, and flexible assets.
  Use when the user says "check assessments", "compliance status", "security assessment",
  "flexible assets", "asset types", "how is [company] doing on compliance",
  "assessment results", "audit compliance", or needs to list, review, or analyze
  assessments and flexible asset data across CloudRadial portals.
metadata:
  version: "1.0.0"
---

# Assessment & Compliance

Review security assessments, compliance status, and flexible asset data across CloudRadial portals.

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

For `list_resources` and `count_resources`, pass OData parameters **without** the leading `$`: `filter`, `select`, `orderby`, `top`, `skip`, `expand`, `search`. The server adds the `$` when forwarding. Defaults to `top=100` if unspecified (pagination by default to avoid hammering the API). Max page is 200; walk through larger pages by incrementing `skip`.

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

### assessment
Security and compliance assessments. Key fields: `assessmentId`, `companyId`, `name`, `status`, `score`, `dateCompleted`.

**Note:** Assessments support listing but NOT get-by-ID.

### flexible_asset
Custom flexible assets used for tracking compliance data, configurations, or any structured data. Key fields: `flexibleAssetId`, `companyId`, `flexibleAssetTypeId`, `name`.

### flexible_asset_type
Definitions for flexible asset types. Key fields: `flexibleAssetTypeId`, `name`, `description`.

### flexible_asset_field
Field definitions within flexible asset types. Key fields: `flexibleAssetFieldId`, `flexibleAssetTypeId`, `name`, `fieldType`.

**Note:** flexible_asset_field supports listing but NOT get-by-ID.

## Example Calls

**List all assessments:** Call `list_resources` with `resource_type: "assessment"`.

**Count assessments for a company:** Call `count_resources` with `resource_type: "assessment"`, `filter: "companyId eq 42"`.

**List flexible assets for a company:** Call `list_resources` with `resource_type: "flexible_asset"`, `filter: "companyId eq 42"`.

**List all flexible asset types (to understand what's tracked):** Call `list_resources` with `resource_type: "flexible_asset_type"`.

**List fields for a flexible asset type:** Call `list_resources` with `resource_type: "flexible_asset_field"`, `filter: "flexibleAssetTypeId eq <typeId>"`.
