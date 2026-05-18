---
name: feedback-analysis
description: >
  Analyze CloudRadial portal feedback and user satisfaction data. Use when the user says
  "check feedback", "CSAT", "satisfaction", "what feedback has [company] submitted",
  "recent feedback", "feedback report", "are users happy", "NPS", "survey results",
  or needs to list, review, or analyze feedback entries from CloudRadial portals.
metadata:
  version: "1.0.0"
---

# Feedback Analysis

List and analyze user feedback and satisfaction data across CloudRadial portals.

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

## Resource Type: feedback

User feedback and CSAT entries. Key fields: `feedbackId`, `companyId`, `userId`, `rating`, `comment`, `category`, `dateCreated`.

## Example Calls

**List feedback for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=feedback&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Recent feedback (sorted newest first):**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=feedback&filter=companyId eq 42&orderby=dateCreated desc&top=10`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Count feedback entries:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/count_resources?resource_type=feedback&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Get a specific feedback entry:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/get_resource?resource_type=feedback&id=567`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Feedback Review for a Company

1. List feedback filtered by companyId, sorted by dateCreated desc
2. Note ratings, comments, and categories
3. Calculate average rating if numeric ratings are present
4. Highlight negative feedback or common complaints
5. Summarize: total feedback count, average rating, recent trends, actionable items

### Satisfaction Trend Analysis

1. List all feedback for a company over time
2. Group by month or quarter
3. Track rating trends — improving, declining, or stable
4. Identify categories with consistently low ratings
5. Present as a trend summary

### Cross-Company Satisfaction Report

1. List all feedback across companies (paginate if needed)
2. Group by company
3. Calculate average rating per company
4. Flag companies with no feedback (disengaged) or low ratings (at risk)
5. Rank companies by satisfaction level
6. Present as a summary useful for QBR prep or account reviews
