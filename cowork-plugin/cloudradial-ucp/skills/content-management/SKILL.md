---
name: content-management
description: >
  Manage CloudRadial portal content - articles, catalogs, menus, courses, and assessments.
  Use when the user says "create an article in CloudRadial", "update portal content",
  "add a KB article to the portal", "set up a service catalog", "manage portal menus",
  "create a course", "check article status", "publish content", or needs to create,
  update, or review content within a partner's CloudRadial portal.
metadata:
  version: "1.0.0"
---

# Content Management

Create, update, and review content across CloudRadial portals using the CloudRadial API hosted on Azure Functions.

## How to Call the API

All API calls go through an Azure Function HTTP endpoint.

**Base URL:**
```
https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}
```

### Preferred Method: Chrome JS `fetch()` with `x-functions-key` Header

Use Claude in Chrome's JavaScript tool for **all** API calls (reads and writes). Authenticate using the `x-functions-key` HTTP header — this is the Azure Functions standard auth header and avoids Chrome blocking credentials in URL query strings.

**Pattern for read operations (GET):**
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

**Pattern for write operations (POST/PUT/PATCH/DELETE):**
```javascript
(async()=>{
  const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
  const key = "YOUR_FUNCTION_KEY";
  const payload = {
    resource_type: "article",
    data: { companyId: 42, subject: "My Article", body: "<p>Content</p>", isPublished: false }
  };
  const r = await fetch(`${base}/create_resource`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "x-functions-key": key},
    body: JSON.stringify(payload)
  });
  return "Status: " + r.status + " | " + await r.text();
})()
```

**Tip:** For large HTML bodies, build the string in multiple Chrome JS calls using `window._varName` to store parts, then combine and POST in a final call. Single payloads over ~5KB can cause connection issues.

### Fallback Method: `web_fetch` (GET only)

For simple read operations, `web_fetch` can be used with the `code` query parameter:

```
web_fetch: https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/{operation}?code=YOUR_FUNCTION_KEY&{params}
```

**Limitations:** GET only, URL length limits, provenance requirement. Chrome JS is preferred for all operations.

## API Reference

If you need to check exact field names, required parameters, or schema details for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Supported Content Types

### Articles
Portal knowledge base articles. Key fields: `subject` (NOT `title`), `body` (HTML), `companyId`, `category`, `isPublished`.

- **List articles:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=article&filter=companyId eq 42", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

- **Get article:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/get_resource?resource_type=article&id=123", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

### Service Catalog
Service offerings shown to end users. Key fields: `name`, `description`, `companyId`.

- **List catalogs:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=catalog&filter=companyId eq 42", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

### Menus
Portal navigation structure.

- **List menus:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=menu&filter=companyId eq 42", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

### Courses & Lessons
Training content for end users. Course uses `name` (NOT `title`). CourseLesson uses `title`, `overview`, `text` (HTML body), and `order`.

- **List courses:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=course&filter=companyId eq 42", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

- **List lessons for a course:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=course_lesson&filter=courseId eq 372", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

- **Check enrollments:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=course_enrollment&filter=companyId eq 42", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

### Assessments
Security and compliance assessments.

- **List assessments:**
  ```javascript
  (async()=>{
    const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=assessment", {
      headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
    });
    return await r.text();
  })()
  ```

## Workflow for Creating Articles

1. **Confirm the target company:**
   ```javascript
   (async()=>{
     const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/search_companies?name=<company>", {
       headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
     });
     return await r.text();
   })()
   ```

2. **Check existing articles** to avoid duplicates:
   ```javascript
   (async()=>{
     const r = await fetch("https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial/list_resources?resource_type=article&filter=companyId eq <id>", {
       headers: {"x-functions-key": "YOUR_FUNCTION_KEY"}
     });
     return await r.text();
   })()
   ```

3. **Prepare the article content.** The `body` field accepts HTML. If converting from a document, use pandoc to extract HTML.

4. **Create the article** via Chrome JS POST. Use `subject` (not `title`) for the article name. Set `isPublished: false` to create as draft:
   ```javascript
   (async()=>{
     const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
     const key = "YOUR_FUNCTION_KEY";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "article",
         data: {
           companyId: <id>,
           subject: "Article Title Here",
           body: "<p>Article HTML content here</p>",
           isPublished: false
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```

5. **For large HTML bodies**, store parts in `window._var` across multiple Chrome JS calls, then combine and POST:
   ```javascript
   // Call 1: Store first part
   window._body1 = "<h2>Section 1</h2><p>First part of the content...</p>";
   // Call 2: Store second part
   window._body2 = "<h2>Section 2</h2><p>Second part of the content...</p>";
   // Call 3: Combine and POST
   (async()=>{
     const fullBody = window._body1 + window._body2;
     // ... POST with fullBody as the body field
   })()
   ```

6. **Confirm creation** — the response includes the new `articleId`.

7. **To update an existing article**, use `update_resource` with `method: "PATCH"` and the article ID.

## Workflow for Creating Courses

1. **Confirm the target company** (same as articles).

2. **Create the course** container first:
   ```javascript
   (async()=>{
     const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
     const key = "YOUR_FUNCTION_KEY";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "course",
         data: {
           companyId: <id>,
           name: "Course Name Here",
           description: "<p>HTML course description</p>",
           category: "Category",
           estimatedTime: "30 minutes",
           isRequired: false,
           passScore: 80
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```

3. **Create each lesson** in order, referencing the parent courseId:
   ```javascript
   (async()=>{
     const base = "https://YOUR-FUNCTION-NAME.azurewebsites.net/api/cloudradial";
     const key = "YOUR_FUNCTION_KEY";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "course_lesson",
         data: {
           courseId: <courseId>,
           companyId: <companyId>,
           title: "Lesson Title",
           overview: "Brief lesson summary",
           text: "<p>HTML lesson body content</p>",
           order: 1
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```

4. **Repeat** for each lesson, incrementing the `order` field.

5. **Final Exam lessons** are just stubs — quiz mechanics are handled by the CloudRadial platform separately. Create the exam lesson with minimal text (e.g., "Complete the exam below to finish this course.").

## Workflow for Auditing Portal Content

1. Identify the company.
2. Pull articles filtered by companyId. Note total count and published vs unpublished.
3. Pull catalogs filtered by companyId.
4. Pull menus filtered by companyId.
5. Pull courses filtered by companyId.
6. Summarize content coverage and identify gaps (e.g., "No service catalog configured", "3 unpublished articles", "0 courses assigned").
