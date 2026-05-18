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

**List all assessments:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=assessment`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Count assessments for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/count_resources?resource_type=assessment&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List flexible assets for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=flexible_asset&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List all flexible asset types (to understand what's tracked):**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=flexible_asset_type`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List fields for a flexible asset type:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=flexible_asset_field&filter=flexibleAssetTypeId eq 5`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Compliance Status for a Company

1. List assessments filtered by companyId
2. Note completion status and scores for each assessment
3. List flexible assets filtered by companyId to check configuration tracking
4. Summarize: total assessments, completed vs pending, average score, any red flags

### Cross-Company Compliance Audit

1. List all assessments (paginate if needed)
2. Group by company
3. Identify companies with incomplete or missing assessments
4. Rank by compliance score or completion rate
5. Present as an actionable report

### Flexible Asset Inventory

1. List flexible asset types to understand what categories exist
2. For a specific type, list its fields to understand the schema
3. List flexible assets filtered by type and/or company
4. Summarize the data — useful for understanding what custom tracking is in place
