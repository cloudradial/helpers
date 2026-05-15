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
  version: "1.0.0"
---

# Portal Lookup

Retrieve and summarize a client's CloudRadial portal status using the CloudRadial API hosted on Azure Functions.

## How to Call the API

All API calls go through an Azure Function HTTP endpoint.

**Base URL:**
```
https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}
```

### Preferred Method: Chrome JS `fetch()` with `x-functions-key` Header

Use Claude in Chrome's JavaScript tool for all API calls. Authenticate using the `x-functions-key` HTTP header — this is the Azure Functions standard auth header and avoids Chrome blocking credentials in URL query strings.

**Pattern for GET requests:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/{operation}?{params}`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Pattern for POST/PUT/PATCH/DELETE requests:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/{operation}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({/* payload */})
  });
  return await r.text();
})()
```

### Fallback Method: `web_fetch` (GET only)

For simple read operations, `web_fetch` can be used with the `code` query parameter. The user must paste the base URL once per session to seed provenance.

```
web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}?code=YOUR_FUNCTION_KEY&{params}
```

**Limitations:** GET only, URL length limits, provenance requirement, and complex OData filters with spaces can fail. Chrome JS is preferred for all operations.

### Available Operations

| Operation | Method | Params | Description |
|-----------|--------|--------|-------------|
| `search_companies` | GET | `name=Acme` | Search companies by name |
| `company_overview` | GET | `company_id=42` | Full overview: details, counts, recent articles/feedback |
| `list_resources` | GET | `resource_type=article&filter=companyId eq 42&top=10` | List/filter any resource |
| `count_resources` | GET | `resource_type=endpoint&filter=companyId eq 42` | Count resources |
| `get_resource` | GET | `resource_type=company&id=42` | Get single resource by ID |
| `user_lookup` | GET | `email=j@example.com` | Find users by email, name, or company |
| `create_resource` | POST | `{resource_type, data}` | Create a new resource |
| `update_resource` | POST | `{resource_type, id, data, method}` | Update a resource by ID |
| `delete_resource` | POST | `{resource_type, id}` | Delete a resource by ID |
| `manage_tokens` | GET/POST | `action=list` | List, create, get, or revoke API tokens |
| `raw_api_call` | GET/POST | `method=GET&path=/v2/odata/company` | Make a raw API call |

### Example Calls (Chrome JS — Preferred)

Search for a company:
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/search_companies?name=Acme", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

Get a company overview:
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/company_overview?company_id=42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

List articles for a company:
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=article&filter=companyId eq 42&select=articleId,subject,isPublished", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

### Error Handling

If any API call returns `{"error": true, ...}`, check the `status` field:
- **401/403**: Bad API keys configured on the Azure Function. Check your Azure Function App Settings.
- **404**: Resource not found. Verify the ID.
- **500**: Server error. Check the `message` field for details.

## API Reference

If you need to check exact field names, required parameters, or available filters for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflow

1. **Identify the company.** If the user provides a company name, search:
   ```javascript
   (async()=>{
     const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/search_companies?name=<company name>", {
       headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
     });
     return await r.text();
   })()
   ```
   If they provide a company ID, skip to step 2. If multiple matches are returned, present the top matches and ask the user to confirm which one.

2. **Pull the overview.**
   ```javascript
   (async()=>{
     const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/company_overview?company_id=<id>", {
       headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
     });
     return await r.text();
   })()
   ```
   This returns company details, user count, endpoint count, recent articles, and recent feedback in a single batch.

3. **Enrich if needed.** Depending on what the user is looking for:
   - For **implementation readiness**: list articles, catalogs, and menus filtered by companyId.
   - For **user adoption**: list users filtered by companyId, check course enrollments.
   - For **endpoint coverage**: list endpoints filtered by companyId.
   - For **feedback/satisfaction**: list feedback filtered by companyId.

   Example:
   ```javascript
   (async()=>{
     const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=article&filter=companyId eq 42&select=articleId,subject,isPublished", {
       headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
     });
     return await r.text();
   })()
   ```

4. **Present the summary.** Organize the findings clearly:
   - Company name, ID, and PSA identifier
   - Portal health: user count, endpoint count, article count
   - Recent activity: latest articles published, latest feedback received
   - Any flags: e.g., zero endpoints, no articles, no feedback

## Context: CloudRadial LOMG Framework

This lookup supports the Land, Onboard, Manage, Grow (LOMG) lifecycle. When presenting results, frame them in terms of where the client is in their journey:

- **Land**: Company exists but minimal setup — few users, no articles, no endpoints
- **Onboard**: Active implementation — articles being created, users being added, catalogs being configured
- **Manage**: Operational portal — consistent endpoint count, regular feedback, published articles
- **Grow**: Mature usage — courses deployed, assessments running, high user engagement
