---
name: endpoint-reporting
description: >
  Report on and analyze CloudRadial endpoints (managed devices). Use when the user says
  "list endpoints", "endpoint report", "warranty report", "how many devices",
  "check endpoints for [company]", "device inventory", "which endpoints are out of warranty",
  "endpoint applications", "endpoint custom properties", or needs to review, count, or
  analyze managed devices and their properties across CloudRadial portals.
metadata:
  version: "1.0.0"
---

# Endpoint Reporting

List, count, and analyze managed endpoints (devices) across CloudRadial portals using the CloudRadial API hosted on Azure Functions.

## How to Call the API

Use Chrome JS `fetch()` with the `x-functions-key` header (preferred method).

**Base URL:**
```
https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}
```

**Chrome JS pattern:**
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

## Resource Types

### endpoint
Managed devices/endpoints. Key fields: `endpointId`, `companyId`, `name`, `operatingSystem`, `warrantyExpirationDate`, `lastSeen`, `manufacturer`, `model`, `serialNumber`.

### endpoint_application
Applications installed on endpoints. Key fields: `endpointApplicationId`, `endpointId`, `name`, `version`, `publisher`.

### endpoint_custom_property
Custom properties attached to endpoints. Key fields: `endpointCustomPropertyId`, `endpointId`, `name`, `value`.

## Example Calls

**List endpoints for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=endpoint&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Count endpoints for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/count_resources?resource_type=endpoint&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Get a specific endpoint:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/get_resource?resource_type=endpoint&id=789", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List applications on an endpoint:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=endpoint_application&filter=endpointId eq 789", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List custom properties for an endpoint:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=endpoint_custom_property&filter=endpointId eq 789", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Endpoint Inventory for a Company

1. Count endpoints filtered by companyId
2. List endpoints with key fields: `select=endpointId,name,operatingSystem,manufacturer,model,lastSeen`
3. Paginate if more than 200 (use `top=200` and `skip`)
4. Summarize: total count, OS distribution, manufacturer breakdown

### Warranty Expiration Report

1. List endpoints for a company with warranty fields: `select=endpointId,name,warrantyExpirationDate,manufacturer,model`
2. Group by warranty status: expired, expiring within 30/60/90 days, current
3. Flag critical items (expired or expiring soon)
4. Present as a prioritized list with counts per category

**Note:** OData date filters like `warrantyExpirationDate lt 2026-06-01` may fail via `web_fetch` due to URL encoding. Always use Chrome JS for date-based filters.

### Application Audit

1. Identify the target endpoint(s)
2. List endpoint_application records filtered by endpointId
3. Group by publisher or application name
4. Flag outdated versions or unauthorized software if criteria are provided

### Cross-Company Endpoint Summary

1. List all companies
2. For each company, count endpoints
3. Flag companies with zero endpoints (not onboarded) or unusually high/low counts
4. Present as a ranked summary
