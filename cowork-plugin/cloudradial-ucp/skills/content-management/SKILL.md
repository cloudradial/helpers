---
name: content-management
description: >
  Manage CloudRadial portal content — articles, catalogs, menus, courses, and assessments.
  Use when the user says "create an article in CloudRadial", "update portal content",
  "add a KB article to the portal", "set up a service catalog", "manage portal menus",
  "create a course", "check article status", "publish content", or needs to create,
  update, or review content within a partner's CloudRadial portal.
metadata:
  version: "0.1.0"
---

# Content Management

Create, update, and review content across CloudRadial portals using the CloudRadial MCP tools.

## API Reference

If you need to check exact field names, required parameters, or schema details for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`. The full OpenAPI spec is at `${CLAUDE_PLUGIN_ROOT}/references/swagger.json`.

## Supported Content Types

### Articles
Portal knowledge base articles. Key fields: `title`, `body` (HTML), `companyId`, `menuItemId`, `isPublished`.

- **List articles**: `list_resources` with resource_type `article`, filter by companyId
- **Get article**: `get_resource` with resource_type `article` and the articleId
- **Create article**: `create_resource` with resource_type `article` and data containing title, body, companyId
- **Update article**: `update_resource` with resource_type `article`, the articleId, and updated fields

### Service Catalog
Service offerings shown to end users. Key fields: `name`, `description`, `companyId`.

- **List catalogs**: `list_resources` with resource_type `catalog`
- **Create catalog item**: `create_resource` with resource_type `catalog`

### Menus
Portal navigation structure.

- **List menus**: `list_resources` with resource_type `menu`
- **Update menu**: `update_resource` with resource_type `menu`

### Courses & Lessons
Training content for end users.

- **List courses**: `list_resources` with resource_type `course`
- **Check enrollments**: `list_resources` with resource_type `course_enrollment`
- **Review lessons**: `list_resources` with resource_type `course_lesson`

### Assessments
Security and compliance assessments.

- **List assessments**: `list_resources` with resource_type `assessment`

## Workflow for Creating Articles

1. Confirm the target company (use `search_companies` if needed).
2. Optionally check existing articles to avoid duplicates: `list_resources` for `article` filtered by companyId.
3. Prepare the article content. The `body` field accepts HTML.
4. Call `create_resource` with resource_type `article` and the article data.
5. Confirm creation and provide the article ID.

## Workflow for Auditing Portal Content

1. Identify the company.
2. Pull articles: `list_resources` for `article` filtered by companyId. Note total count and published vs unpublished.
3. Pull catalogs: `list_resources` for `catalog` filtered by companyId.
4. Pull menus: `list_resources` for `menu` filtered by companyId.
5. Pull courses: `list_resources` for `course` filtered by companyId.
6. Summarize content coverage and identify gaps (e.g., "No service catalog configured", "3 unpublished articles").
