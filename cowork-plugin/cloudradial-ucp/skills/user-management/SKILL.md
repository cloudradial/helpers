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

All API calls go through an Azure Function. Use Chrome JS `fetch()` with the `x-functions-key` header (preferred method).

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
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/user_lookup?email=john@acme.com", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Find users named "Smith" in company 42:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/user_lookup?name=smith&company_id=42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

### list_resources (resource_type=user)

List users with full OData filtering support. Better than user_lookup for bulk queries, filtered lists, and counting.

**List all users for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=user&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Count users for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/count_resources?resource_type=user&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**List users with specific fields:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=user&filter=companyId eq 42&select=userId,firstName,lastName,email,role", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
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
