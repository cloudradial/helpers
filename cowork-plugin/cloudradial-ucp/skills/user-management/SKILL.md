---
name: user-management
description: >
  Manage and analyze CloudRadial portal users. Use when the user says "look up a user",
  "find user by email", "list users for [company]", "check user adoption",
  "how many users does [company] have", "user roles", "who has access to [company] portal",
  or needs to find, list, count, or analyze users across CloudRadial portals.
metadata:
  version: "1.0.0"
---

# User Management

Look up, list, and analyze CloudRadial portal users using the CloudRadial MCP server.

## How to Call the API

All CloudRadial work goes through MCP tools served by the `cloudradial-ucp` server. The plugin auto-registers the server via `.claude-plugin/plugin.json` — no Azure Function, no Chrome extension, no local config file.

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

## Operations

### user_lookup

Search users by email, name, or company. The fastest way to find a specific user.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `email` | No | Partial email match (case-insensitive) |
| `name` | No | Partial first or last name match |
| `company_id` | No | Filter to a specific company |
| `top` | No | Max results (default 20) |

**Find user by email:** Call `user_lookup` with `email: "john@acme.com"`.

**Find users named "Smith" in company 42:** Call `user_lookup` with `name: "smith"`, `company_id: "42"`.

### list_resources (resource_type=user)

List users with full OData filtering support. Better than user_lookup for bulk queries, filtered lists, and counting.

**List all users for a company:** Call `list_resources` with `resource_type: "user"`, `filter: "companyId eq 42"`.

**Count users for a company:** Call `count_resources` with `resource_type: "user"`, `filter: "companyId eq 42"`.

**List users with specific fields:** Call `list_resources` with `resource_type: "user"`, `filter: "companyId eq 42"`, `select: "userId,firstName,lastName,email,role"`.

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Find a Specific User

1. Use `user_lookup` with their email or name
2. If multiple matches, present the list and ask the user to confirm
3. Use `get_resource` with `resource_type: "user"` and the `userId` for full details if needed

### User Adoption Analysis for a Company

1. Count total users for the company with `count_resources`
2. List users to check role distribution with `list_resources`
3. Cross-reference with course enrollments — `list_resources` with `resource_type: "course_enrollment"`, `filter: "companyId eq 42"` — to check training completion
4. Cross-reference with feedback — `list_resources` with `resource_type: "feedback"`, `filter: "companyId eq 42"` — to check engagement
5. Present a summary: total users, roles breakdown, training completion rate, feedback activity

### Bulk User Report

1. List all users across all companies (paginate with `top: "200"` and `skip`)
2. Group by company
3. Flag companies with zero users or unusually low counts
4. Present as a summary table

### Portal Admin Users

Portal admins are tracked separately as `application_user`. There is no OData listing for them — use `get_resource` with `resource_type: "application_user"` and the user id. To find existing admins, filter the regular `user` resource by `isPartnerAdminUser eq true`.

