---
name: content-management
description: >
  Manage CloudRadial portal content - articles, catalogs, menus, courses, and assessments.
  Use when the user says "create an article in CloudRadial", "update portal content",
  "add a KB article to the portal", "set up a service catalog", "manage portal menus",
  "create a course", "check article status", "publish content", or needs to create,
  update, or review content within a partner's CloudRadial portal.
metadata:
  version: "0.4.0"
---

# Content Management

Create, update, and review content across CloudRadial portals using the CloudRadial API hosted on Azure Functions.

## How to Call the API

All API calls go through an Azure Function HTTP endpoint.

**Base URL:**
```
https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}?code=YOUR_FUNCTION_KEY
```

**Important:** The `code` parameter is the function auth key and must be included in every request.

### Read Operations (GET)

For **read operations** (search, list, get, count), use `web_fetch` with GET query parameters. The user may need to paste the base URL once per session to seed web_fetch provenance.

### Write Operations (POST/PUT/PATCH/DELETE)

For **write operations** (create, update, delete), use **Claude in Chrome's JavaScript tool** to call the API with `fetch()`. This supports all HTTP methods. Pattern:

```javascript
// In Chrome JS tool:
(async()=>{
  const payload = {
    resource_type: "article",
    data: { companyId: 42, subject: "My Article", body: "<p>Content</p>", isPublished: false }
  };
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/create_resource?code=YOUR_FUNCTION_KEY", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

**Tip:** For large HTML bodies, build the string in multiple Chrome JS calls using `window._varName` to store parts, then combine and POST in a final call.

## API Reference

If you need to check exact field names, required parameters, or schema details for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Supported Content Types

### Articles
Portal knowledge base articles. Key fields: `subject` (NOT `title`), `body` (HTML), `companyId`, `category`, `isPublished`.

- **List articles**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=article&filter=companyId eq 42
  ```
- **Get article**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/get_resource?code=YOUR_FUNCTION_KEY&resource_type=article&id=123
  ```

### Service Catalog
Service offerings shown to end users. Key fields: `name`, `description`, `companyId`.

- **List catalogs**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=catalog&filter=companyId eq 42
  ```

### Menus
Portal navigation structure.

- **List menus**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=menu&filter=companyId eq 42
  ```

### Courses & Lessons
Training content for end users.

- **List courses**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=course&filter=companyId eq 42
  ```
- **Check enrollments**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=course_enrollment&filter=companyId eq 42
  ```

### Assessments
Security and compliance assessments.

- **List assessments**:
  ```
  web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=assessment
  ```

## Workflow for Creating Articles

1. Confirm the target company using web_fetch or Chrome JS:
   ```
   web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/search_companies?code=YOUR_FUNCTION_KEY&name=<company>
   ```
2. Optionally check existing articles to avoid duplicates:
   ```
   web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?code=YOUR_FUNCTION_KEY&resource_type=article&filter=companyId eq <id>
   ```
3. Prepare the article content. The `body` field accepts HTML. If converting from a document, use pandoc to extract HTML.
4. Create the article via Chrome JS `fetch()` POST (see Write Operations pattern above). Use `subject` (not `title`) for the article name. Set `isPublished: false` to create as draft.
5. For large HTML bodies, store parts in `window._var` across multiple Chrome JS calls, then combine and POST.
6. Confirm creation — the response includes the new `articleId`.
7. To update an existing article, use `update_resource` with `method: "PUT"` and the article ID.

## Workflow for Auditing Portal Content

1. Identify the company.
2. Pull articles filtered by companyId. Note total count and published vs unpublished.
3. Pull catalogs filtered by companyId.
4. Pull menus filtered by companyId.
5. Pull courses filtered by companyId.
6. Summarize content coverage and identify gaps (e.g., "No service catalog configured", "3 unpublished articles").
