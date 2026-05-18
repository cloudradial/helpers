---
name: service-management
description: >
  Manage CloudRadial services, service installations, domains, and products. Use when the
  user says "list services", "check service installs", "what services does [company] have",
  "domain list", "managed domains", "products", "service catalog details",
  "what's installed for [company]", or needs to review, create, or manage services,
  service installations, domains, or products in CloudRadial portals.
metadata:
  version: "1.0.0"
---

# Service Management

Review and manage services, service installations, domains, and products across CloudRadial portals.

## How to Call the API

### Step 1: Load Credentials

Before making any API call, read the local config file to get the Azure Function credentials:

- **Windows:** Look at file paths in the session context to find the username (e.g., `C:\Users\USERNAME\...`), then read `C:\Users\{username}\.cloudradial\config.json`
- **macOS/Linux:** Read `~/.cloudradial/config.json`

The config file contains:
```json
{
  "functionName": "their-function-name",
  "functionKey": "their-function-key",
  "baseUrl": "https://their-function-name.azurewebsites.net/api/cloudradial"
}
```

**If the config file doesn't exist or can't be read:** Tell the user "Your CloudRadial plugin isn't configured yet. Say 'Set up CloudRadial' to get started." Then stop.

### Step 2: Make API Calls

Use Chrome JS `fetch()` with the `x-functions-key` header. Substitute values from the config:

**GET pattern:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/{operation}?{params}`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**POST pattern:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/{operation}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify({/* payload */})
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

## Resource Types

### service
Service definitions available in the portal. Key fields: `serviceId`, `name`, `description`, `category`.

### service_install
Records of services installed/assigned to companies. Key fields: `serviceInstallId`, `serviceId`, `companyId`. This is a composite-key resource.

### domain
Managed domains tracked in the portal. Key fields: `domainId`, `companyId`, `name`, `registrar`, `expirationDate`.

### product
Products available in the portal. Key fields: `productId`, `name`, `description`, `price`.

## Example Calls

**List services:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=service`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List service installs for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=service_install&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List domains for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=domain&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List products:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=product`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Service Coverage for a Company

1. List all available services
2. List service installs filtered by companyId
3. Cross-reference to identify which services are installed vs missing
4. Summarize: installed services, missing services, coverage percentage

### Domain Expiration Report

1. List domains filtered by companyId (or all domains)
2. Check expirationDate against current date
3. Flag domains expiring within 30/60/90 days
4. Present as a prioritized list

### Cross-Company Service Audit

1. List all service installs (paginate if needed)
2. Group by company
3. Compare against the full service list
4. Identify companies with low service adoption
5. Present as a gap analysis
