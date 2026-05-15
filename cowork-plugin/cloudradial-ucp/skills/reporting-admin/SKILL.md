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

Use Chrome JS `fetch()` with the `x-functions-key` header (preferred method).

**Base URL:**
```
https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}
```

**GET pattern:**
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

**POST pattern:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/{operation}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({/* payload */})
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

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

**List archived reports for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=archive_item&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Get a specific archive item (requires both IDs):**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/get_resource?resource_type=archive_item&archive_id=10&id=55", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List certificates for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=certificate&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List company groups:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=company_group", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List quickstart guides:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=quickstart", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List media files:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=media", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

### Token Management

The `manage_tokens` operation handles API token lifecycle.

**List all tokens:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/manage_tokens?action=list", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Create a new token:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/manage_tokens`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({ action: "create", data: { name: "My Token" } })
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

**Revoke a token:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/manage_tokens`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({ action: "revoke", token_id: 123 })
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

### Raw API Calls

For advanced operations not covered by the standard operations, use `raw_api_call` to hit any CloudRadial API endpoint directly.

**GET example:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/raw_api_call?method=GET&path=/v2/odata/company/$count", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**POST example:**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const r = await fetch(`${base}/raw_api_call`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({
      method: "GET",
      path: "/v2/odata/company",
      query: "{\"$top\": 5, \"$select\": \"companyId,name\"}"
    })
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Certificate Expiration Report

1. List certificates for a company (or all companies)
2. Check expirationDate against current date
3. Flag certificates expiring within 30/60/90 days
4. Present as a prioritized action list

### Archive Report History

1. List archive items for a company, sorted by dateUploaded desc
2. Note subjects and dates to understand reporting history
3. Get specific items for detailed content

### Company Group Overview

1. List all company groups
2. For each group, list companies associated with it
3. Present group membership and identify ungrouped companies
