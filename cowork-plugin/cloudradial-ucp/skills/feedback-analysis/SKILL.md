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

## Resource Type: feedback

User feedback and CSAT entries. Key fields: `feedbackId`, `companyId`, `userId`, `rating`, `comment`, `category`, `dateCreated`.

## Example Calls

**List feedback for a company:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=feedback&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Recent feedback (sorted newest first):**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=feedback&filter=companyId eq 42&orderby=dateCreated desc&top=10", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Count feedback entries:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/count_resources?resource_type=feedback&filter=companyId eq 42", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
  });
  return await r.text();
})()
```

**Get a specific feedback entry:**
```javascript
(async()=>{
  const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/get_resource?resource_type=feedback&id=567", {
    headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
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
