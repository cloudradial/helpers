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

Look up, list, and analyze CloudRadial portal users using the CloudRadial API hosted on Azure Functions.

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

## Operations

### user_lookup

Search users by email, name, or company. The fastest way to find a specific user.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `email` | No | Partial email match (case-insensitive) |
| `name` | No | Partial first or last name match |
| `company_id` | No | Filter to a specific company |
| `top` | No | Max results (default 20) |

**Find user by email:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/user_lookup?email=john@acme.com`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Find users named "Smith" in company 42:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/user_lookup?name=smith&company_id=42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

### list_resources (resource_type=user)

List users with full OData filtering support. Better than user_lookup for bulk queries, filtered lists, and counting.

**List all users for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=user&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Count users for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/count_resources?resource_type=user&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List users with specific fields:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=user&filter=companyId eq 42&select=userId,firstName,lastName,email,role`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Find a Specific User

1. Use `user_lookup` with their email or name
2. If multiple matches, present the list and ask the user to confirm
3. Use `get_resource` with the `userId` for full details if needed

### User Adoption Analysis for a Company

1. Count total users for the company
2. List users to check role distribution
3. Cross-reference with course enrollments (`list_resources` for `course_enrollment` filtered by companyId) to check training completion
4. Cross-reference with feedback (`list_resources` for `feedback` filtered by companyId) to check engagement
5. Present a summary: total users, roles breakdown, training completion rate, feedback activity

### Bulk User Report

1. List all users across all companies (paginate with `top=200` and `skip`)
2. Group by company
3. Flag companies with zero users or unusually low counts
4. Present as a summary table
