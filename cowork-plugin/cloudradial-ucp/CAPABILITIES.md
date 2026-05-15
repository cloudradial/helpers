# CloudRadial UCP Plugin - Capabilities Reference

Complete reference for all operations, resource types, query options, and practical examples.

## API Endpoint Pattern

All calls go through your Azure Function:

```
https://<your-function>.azurewebsites.net/api/cloudradial/{operation}?code=<your-function-key>&{params}
```

Cowork uses two methods to call the API:

- **`web_fetch`** (GET only) — For simple read operations. Built into Cowork. Requires URL provenance (paste the URL once per session to seed it).
- **Chrome JS `fetch()`** (all HTTP methods) — For write operations and complex reads. Uses Claude in Chrome's JavaScript tool. No URL provenance restrictions, no URL length limits. This is the preferred method for create, update, and delete operations.

---

## Operations

### search_companies

Search companies by name (case-insensitive partial match).

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Partial company name to search for |

**Example:**
```
/api/cloudradial/search_companies?code=KEY&name=acme
```

**Returns:** Array of matching companies with `companyId`, `name`, `psaIdentifier`, `endpointCount`.

---

### company_overview

Get a comprehensive snapshot of a single company. Returns company details, user count, endpoint count, 5 most recent articles, and 5 most recent feedback entries — all in one call.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `company_id` | Yes | The company's numeric ID |

**Example:**
```
/api/cloudradial/company_overview?code=KEY&company_id=42
```

**Returns:**
```json
{
  "company": { ... full company object ... },
  "counts": { "userCount": 15, "endpointCount": 87 },
  "recentArticles": [ ... ],
  "recentFeedback": [ ... ]
}
```

---

### list_resources

List any resource type with full OData query support. This is the most versatile operation.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | One of the 27 supported resource types (see below) |
| `filter` | No | OData $filter expression |
| `select` | No | Comma-separated field names to return |
| `orderby` | No | OData $orderby expression |
| `top` | No | Maximum number of results (default varies by resource) |
| `skip` | No | Number of results to skip (for pagination) |
| `expand` | No | Related entities to include |
| `search` | No | Full-text search term |

**Examples:**
```
# All articles for company 42
/api/cloudradial/list_resources?code=KEY&resource_type=article&filter=companyId eq 42

# Top 10 users ordered by last name
/api/cloudradial/list_resources?code=KEY&resource_type=user&top=10&orderby=lastName asc

# Published articles only, just IDs and subjects
/api/cloudradial/list_resources?code=KEY&resource_type=article&filter=isPublished eq true&select=articleId,subject

# Endpoints for company 42 with more than 0 applications
/api/cloudradial/list_resources?code=KEY&resource_type=endpoint&filter=companyId eq 42
```

---

### count_resources

Get a count of any resource type, optionally filtered.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | Resource type to count |
| `filter` | No | OData $filter expression |

**Examples:**
```
# Total articles across all companies
/api/cloudradial/count_resources?code=KEY&resource_type=article

# Endpoints for company 42
/api/cloudradial/count_resources?code=KEY&resource_type=endpoint&filter=companyId eq 42

# Users with a specific email domain
/api/cloudradial/count_resources?code=KEY&resource_type=user&filter=contains(email, '@acme.com')
```

---

### get_resource

Retrieve a single resource by its ID.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | Resource type |
| `id` | Yes | Resource ID |
| `archive_id` | Only for `archive_item` | Parent archive folder ID |

**Examples:**
```
# Get company 42
/api/cloudradial/get_resource?code=KEY&resource_type=company&id=42

# Get article 789
/api/cloudradial/get_resource?code=KEY&resource_type=article&id=789

# Get an archive item (needs both IDs)
/api/cloudradial/get_resource?code=KEY&resource_type=archive_item&archive_id=10&id=55
```

**Note:** `assessment` and `flexible_asset_field` do not support get-by-ID.

---

### create_resource

Create a new resource. Uses Chrome JS `fetch()` with POST.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | Resource type to create |
| `data` | Yes | JSON object with the resource fields |

**Chrome JS example:**
```javascript
(async()=>{
  const r = await fetch("https://your-function.azurewebsites.net/api/cloudradial/create_resource?code=YOUR_KEY", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      resource_type: "article",
      data: {
        companyId: 42,
        subject: "Password Reset Guide",
        body: "<p>Steps to reset your password...</p>",
        isPublished: false
      }
    })
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

**Tip:** For large HTML bodies (articles with rich content), store parts across multiple Chrome JS calls using `window._part1`, `window._part2`, etc., then combine and POST in a final call. Single payloads over ~5KB can cause connection issues.

---

### update_resource

Update an existing resource by ID. Uses Chrome JS `fetch()` with POST.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | Resource type |
| `id` | Yes | Resource ID to update |
| `data` | Yes | JSON object with the fields to update |
| `method` | No | HTTP method: `PUT` (full replace, default) or `PATCH` (partial update) |

**Chrome JS example:**
```javascript
(async()=>{
  const r = await fetch("https://your-function.azurewebsites.net/api/cloudradial/update_resource?code=YOUR_KEY", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      resource_type: "article",
      id: 789,
      method: "PATCH",
      data: { isPublished: true }
    })
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

---

### delete_resource

Delete a resource by ID. Uses Chrome JS `fetch()` with POST.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `resource_type` | Yes | Resource type |
| `id` | Yes | Resource ID to delete |

---

### user_lookup

Search for users by email, name, or company. Supports combining multiple criteria.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `email` | No | Partial email match (case-insensitive) |
| `name` | No | Partial first or last name match |
| `company_id` | No | Filter to a specific company |
| `top` | No | Max results (default 20) |

**Examples:**
```
# Find user by email
/api/cloudradial/user_lookup?code=KEY&email=john@acme.com

# Find all users named "Smith" in company 42
/api/cloudradial/user_lookup?code=KEY&name=smith&company_id=42
```

---

### manage_tokens

Manage CloudRadial API tokens.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `action` | Yes | `list`, `create`, `get`, or `revoke` |
| `token_id` | For `get`/`revoke` | Token ID |
| `data` | For `create` | JSON token creation data |

**Example:**
```
# List all tokens
/api/cloudradial/manage_tokens?code=KEY&action=list
```

---

### raw_api_call

Direct passthrough to any CloudRadial API endpoint. For advanced scenarios not covered by other operations.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `method` | No | HTTP method (default: GET) |
| `path` | Yes | API path (e.g., `/v2/odata/company`) |
| `query` | No | JSON string of query parameters |
| `body` | No | JSON string of request body (for POST/PUT) |

**Example:**
```
/api/cloudradial/raw_api_call?code=KEY&method=GET&path=/v2/odata/company/$count
```

---

## Supported Resource Types

| Resource Type | OData List | Get by ID | Description |
|--------------|:----------:|:---------:|-------------|
| `company` | Yes | Yes | Client/partner companies |
| `user` | Yes | Yes | Portal users |
| `article` | Yes | Yes | KB articles (field: `subject`, not `title`) |
| `endpoint` | Yes | Yes | Managed devices/endpoints |
| `catalog` | Yes | Yes | Service catalog items |
| `catalog_question` | Yes | Yes | Questions within catalog items |
| `assessment` | Yes | No | Security/compliance assessments |
| `feedback` | Yes | Yes | User feedback/CSAT entries |
| `service` | Yes | Yes | Services |
| `service_install` | Yes | Yes | Service installations |
| `domain` | Yes | Yes | Managed domains |
| `course` | Yes | Yes | Training courses |
| `course_enrollment` | Yes | Yes | Course enrollment records |
| `course_lesson` | Yes | Yes | Individual course lessons |
| `menu` | Yes | Yes | Portal navigation menus |
| `product` | Yes | Yes | Products |
| `archive_item` | Yes | Yes* | Archived reports/items (*requires `archive_id` + `id`) |
| `certificate` | Yes | Yes | Certificates |
| `company_group` | Yes | Yes | Company groupings |
| `quickstart` | Yes | Yes | Quickstart guides |
| `flexible_asset` | Yes | Yes | Custom flexible assets |
| `flexible_asset_type` | Yes | Yes | Flexible asset type definitions |
| `flexible_asset_field` | Yes | No | Flexible asset field definitions |
| `endpoint_application` | Yes | Yes | Applications on endpoints |
| `endpoint_custom_property` | Yes | Yes | Custom endpoint properties |
| `media` | Yes | Yes | Media files |
| `token` | Yes | Yes | API tokens |

---

## OData Query Reference

The CloudRadial API supports OData v4 query parameters on all list endpoints.

### $filter

Filter results using OData expressions.

| Operator | Example |
|----------|---------|
| `eq` | `companyId eq 42` |
| `ne` | `isPublished ne false` |
| `gt`, `ge`, `lt`, `le` | `endpointCount gt 50` |
| `and`, `or` | `companyId eq 42 and isPublished eq true` |
| `contains()` | `contains(tolower(name), 'acme')` |
| `startswith()` | `startswith(email, 'john')` |

### $select

Return only specific fields: `$select=companyId,name,endpointCount`

### $orderby

Sort results: `$orderby=name asc` or `$orderby=dateCreated desc`

### $top / $skip

Pagination: `$top=10&$skip=20` returns items 21-30.

### $expand

Include related entities: `$expand=company`

### $search

Full-text search: `$search=password reset`

---

## Known Limitations and Tips

### web_fetch: URL provenance and GET-only

Cowork's `web_fetch` tool only supports GET requests and has a URL provenance requirement — it can only fetch URLs that the user pasted into chat or that appeared in a previous `web_fetch` response. At the start of each session, paste your Azure Function URL once to "seed" it. `web_fetch` also has URL length limits that can cause failures with complex OData filters.

**Workaround:** Chrome JS `fetch()` has none of these restrictions. It supports all HTTP methods, has no provenance requirement, and handles long URLs fine. The skills use Chrome JS automatically for writes and for complex read queries.

### OData pagination cap: 200 per page

The CloudRadial API returns a maximum of 200 results per request (`$top` cannot exceed 200). For datasets larger than 200 records, use `$top=200` with `$skip` to paginate. The skills handle this automatically.

### OData filter spaces in web_fetch

OData filter expressions with spaces (e.g., `warrantyExpirationDate lt 2026-05-14`) can fail in `web_fetch` even when URL-encoded, due to provenance matching. Use Chrome JS `fetch()` for filters with spaces or complex expressions.

### Large payloads in Chrome JS

Chrome JS calls with payloads over ~5KB can drop the browser connection. For large article bodies or bulk data, chunk the content across multiple Chrome JS calls using `window._varName` to store parts, then combine and POST in a final call.

### Article field names

The article model uses `subject` (not `title`) for the article name, and catalog items use `companyCatalogId` (not `catalogId`). The skills handle these correctly, but keep it in mind for `raw_api_call`.

### Cold starts

If your Azure Function is on a Consumption plan, the first call after inactivity may take 5-10 seconds. Subsequent calls are fast. If the first call times out, just retry.

### Cowork bash sandbox is network-isolated

Cowork's bash/shell environment cannot reach external URLs. All API calls must go through `web_fetch` or Chrome JS `fetch()` — never through bash scripts, curl, or Node.js in the shell.

---

## Practical Workflows

### Pre-Meeting Company Review

1. Search for the company by name
2. Pull the company overview (details, counts, recent activity)
3. Assess their LOMG stage (Land/Onboard/Manage/Grow)
4. Note any red flags (zero endpoints, no articles, stale feedback)

### Portal Content Audit

1. Identify the company
2. List articles, catalogs, menus, and courses filtered by companyId
3. Count each type
4. Identify gaps (no catalog, unpublished articles, missing courses)

### User Adoption Check

1. Count users for a company
2. List users to check role distribution
3. Check course enrollments
4. Review recent feedback for satisfaction signals

### Bulk Reporting

1. List all companies
2. For each, count endpoints, users, articles
3. Flag companies below thresholds (e.g., 0 endpoints = not onboarded)
