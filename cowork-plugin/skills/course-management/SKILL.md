---
name: course-management
description: >
  Manage CloudRadial training courses, lessons, and enrollments. Use when the user says
  "create a course", "build a training", "list courses", "check enrollments",
  "course completion", "add a lesson", "training status for [company]",
  "who completed the course", "build out a course on [topic]", or needs to create,
  review, or analyze training content and enrollment data in CloudRadial portals.
metadata:
  version: "1.0.0"
---

# Course Management

Create, list, and analyze training courses, lessons, and enrollments across CloudRadial portals.

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

### course
Training course containers. Key fields: `courseId`, `companyId`, `name` (NOT `title`), `description` (HTML), `shortDescription`, `category`, `estimatedTime`, `isRequired`, `passScore`, `validMonths`, `enrollmentCount`, `completionCount`.

### course_lesson
Individual lessons within a course. Key fields: `courseLessonId`, `courseId`, `companyId`, `title`, `overview`, `text` (HTML body content), `category`, `order`.

### course_enrollment
Enrollment records tracking user progress. Key fields: `courseEnrollmentId`, `courseId`, `companyId`, `userId`, `status`, `score`, `dateCompleted`.

## Example Calls

**List courses for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=course&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**List lessons for a course (use list_resources, not get_resource):**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=course_lesson&filter=courseId eq 372&orderby=order asc`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

**Note:** Use `list_resources` with `filter=courseId eq X` to get course details and lessons. The `get_resource` operation for courses may return incomplete data (known API quirk).

**Check enrollments for a company:**
```javascript
(async()=>{
  const base = "{baseUrl from config}";
  const key = "{functionKey from config}";
  const r = await fetch(`${base}/list_resources?resource_type=course_enrollment&filter=companyId eq 42`, {
    headers: {"x-functions-key": key}
  });
  return await r.text();
})()
```

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

## Workflows

### Review Training Status for a Company

1. List courses filtered by companyId
2. For each course, note enrollmentCount and completionCount
3. List enrollments filtered by companyId to get per-user status
4. Summarize: total courses available, total enrollments, completion rate, overdue items

### Build a Course from Scratch

Building a course is a two-step process: create the course container, then create each lesson inside it.

1. **Create the course:**
   ```javascript
   (async()=>{
     const base = "{baseUrl from config}";
     const key = "{functionKey from config}";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "course",
         data: {
           companyId: 42,
           name: "Course Name Here",
           description: "<p>HTML course overview shown to learners</p>",
           category: "Security",
           estimatedTime: "30 minutes",
           isRequired: false,
           passScore: 80
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```
   The response includes the new `courseId`.

2. **Create each lesson** in order:
   ```javascript
   (async()=>{
     const base = "{baseUrl from config}";
     const key = "{functionKey from config}";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "course_lesson",
         data: {
           courseId: 999,
           companyId: 42,
           title: "Lesson 1: Introduction",
           overview: "Brief summary of this lesson",
           text: "<p>Full HTML lesson content goes here.</p>",
           order: 1
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```

3. **Repeat** for each lesson, incrementing the `order` field (2, 3, 4...).

4. **Final Exam lesson** — Create as a regular lesson with minimal text (e.g., "Complete the exam below to finish this course."). Quiz questions and answer tracking are handled by the CloudRadial platform separately, not in the lesson text.

5. **For large lesson content**, use the chunking pattern:
   ```javascript
   // Call 1: Store first part
   window._lessonBody = "<h2>Section 1</h2><p>Content...</p>";
   // Call 2: Append more
   window._lessonBody += "<h2>Section 2</h2><p>More content...</p>";
   // Call 3: POST with the combined body
   ```

### Build a Course from a Document

1. If the user provides a markdown or text document, convert it to HTML sections
2. Split into logical lessons (one per major heading or topic)
3. Create the course container
4. Create each lesson with the HTML content, maintaining logical ordering
5. Add a Final Exam lesson at the end if the course requires assessment

### Enrollment Analysis

1. List enrollments for a company or specific course
2. Group by status (not started, in progress, completed, failed)
3. Calculate completion rates
4. Identify users who haven't started required courses
5. Present as an actionable summary
