---
name: portal-lookup
description: >
  Look up a CloudRadial partner or client portal to review their setup status.
  Use when the user says "look up a partner", "check portal status", "find a company
  in CloudRadial", "how is [company] doing in their portal", "prepare for a meeting
  with [company]", "partner overview", "company overview", or needs to find information
  about a specific company, its users, endpoints, articles, or portal configuration
  before a call or implementation session.
metadata:
  version: "1.1.0"
---

# Portal Lookup

Retrieve and summarize a client's CloudRadial portal status using the CloudRadial MCP server.

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

For `list_resources` and `count_resources`, pass OData parameters **without** the leading `$`: `filter`, `select`, `orderby`, `top`, `skip`, `expand`, `search`. The server adds the `$` when forwarding. Defaults to `top=100` if unspecified. Max page is 200; walk through larger pages by incrementing `skip`.

### Field-name quirks

- Articles use `subject` (not `title`).
- Courses use `name` (not `title`).
- `archive_item` composite key — pass `archive_id` and `id`.
- `service_install` composite key — pass `endpoint_id` and `service_id` (or `id = serviceId` on update/delete).

### Errors

- **"credentials not configured"** → defer to the `setup` skill.
- **401/403 from CloudRadial** → stored credentials are invalid. Run `setup` to rotate.
- **404** → resource not found, verify the ID.

## API Reference

If you need to check exact field names, required parameters, or available filters for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflow

1. **Identify the company.** Call `search_companies` with `name: "<company name>"`. If they provide a company ID, skip to step 2.

2. **Pull the overview.** Call `company_overview` with `company_id: "<id>"`.

3. **Enrich with counts.** Call `count_resources` for: `article`, `course`, `assessment`, `feedback` — all filtered by companyId.

4. **Pull recent feedback.** Call `list_resources` with `resource_type: "feedback"`, `filter: "companyId eq <id>"`, `orderby: "dateCreated desc"`, `top: "5"`.

5. **Classify LOMG stage:** Land (few users, no articles), Onboard (articles being created), Manage (consistent endpoints, regular feedback), Grow (courses deployed, assessments running).

6. **Identify flags:** Negative feedback unaddressed, zero endpoints, no logo/theme, low user count, no assessments/courses.

7. **Generate a visual presentation** using `show_widget`. See template below.

## Visual Presentation Template

When presenting a company overview or meeting prep, ALWAYS render a visual widget using `show_widget`. The widget must include these sections populated with real data:

1. **Header** — Company name, account manager, LOMG stage badge
2. **Portal snapshot** — Grid of stat cards: Users, Endpoints, Articles, Courses, Assessments
3. **Recent feedback** — Table with Date, Ticket, Rating (color-coded badge), Comment
4. **Flags** — Bullet list with colored dots (danger/warning/success)
5. **Suggested talking points** — Numbered list of specific, actionable items based on the data

### Layout rules

- Max width: 720px, centered
- Use CSS variables for all colors (`var(--color-text-primary)`, `var(--color-background-secondary)`, etc.)
- Cards: `var(--color-background-primary)` bg, `0.5px solid var(--color-border-tertiary)` border, `var(--border-radius-lg)` radius
- Stat cards: `var(--color-background-secondary)` bg inside the card
- Rating badges: Positive = `var(--color-text-success)`, Negative = `var(--color-text-danger)`, Neutral = `var(--color-text-warning)` — white text on colored bg
- LOMG badges: Land = warning colors, Onboard = info, Manage = success, Grow = `background:#EEEDFE;color:#534AB7`
- Widget title: `company_meeting_prep` (snake_case)

### Important

- Call `read_me` on the visualize tool before your first `show_widget`.
- Populate every section with real data — never use placeholders.
- If no data (e.g., no feedback), show "No feedback submitted yet" — don't hide the section.
- Keep talking points specific and actionable based on the actual data.

## Context: CloudRadial LOMG Framework

- **Land**: Company exists but minimal setup — few users, no articles, no endpoints
- **Onboard**: Active implementation — articles being created, users being added, catalogs being configured
- **Manage**: Operational portal — consistent endpoint count, regular feedback, published articles
- **Grow**: Mature usage — courses deployed, assessments running, high user engagement
