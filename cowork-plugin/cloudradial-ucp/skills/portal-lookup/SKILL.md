---
name: portal-lookup
description: >
  Look up a CloudRadial partner or client portal to review their setup status.
  Use when the user says "look up a partner", "check portal status", "find a company
  in CloudRadial", "how is [company] doing in their portal", "prepare for a meeting
  with [company]", "partner overview", "company overview", or needs to find information
  about a specific company, its users, endpoints, articles, or portal configuration
  before a call or implementation session.
metadata:
  version: "0.1.0"
---

# Portal Lookup

Retrieve and summarize a partner's CloudRadial portal status using the CloudRadial MCP tools.

## API Reference

If you need to check exact field names, required parameters, or available filters for any resource type, read the API reference at `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`. The full OpenAPI spec is at `${CLAUDE_PLUGIN_ROOT}/references/swagger.json`.

## Workflow

1. **Identify the company.** If the user provides a company name, call `search_companies` with the name. If they provide a company ID, skip to step 2. If multiple matches are returned, present the top matches and ask the user to confirm which one.

2. **Pull the overview.** Call `company_overview` with the confirmed company ID. This returns company details, user count, endpoint count, recent articles, and recent feedback in a single batch.

3. **Enrich if needed.** Depending on what the user is looking for:
   - For **implementation readiness**: call `list_resources` for `article` (filtered by companyId) to check content setup, `list_resources` for `catalog` to check service catalog, and `list_resources` for `menu` to check portal navigation.
   - For **user adoption**: call `list_resources` for `user` (filtered by companyId) to get user details, check `course_enrollment` for training completion.
   - For **endpoint coverage**: call `list_resources` for `endpoint` (filtered by companyId) to review deployed agents.
   - For **feedback/satisfaction**: call `list_resources` for `feedback` (filtered by companyId).

4. **Present the summary.** Organize the findings clearly:
   - Company name, ID, and PSA identifier
   - Portal health: user count, endpoint count, article count
   - Recent activity: latest articles published, latest feedback received
   - Any flags: e.g., zero endpoints, no articles, no feedback

## Context: CloudRadial LOMG Framework

This lookup supports the Land, Onboard, Manage, Grow (LOMG) lifecycle. When presenting results, frame them in terms of where the partner is in their journey:

- **Land**: Company exists but minimal setup — few users, no articles, no endpoints
- **Onboard**: Active implementation — articles being created, users being added, catalogs being configured
- **Manage**: Operational portal — consistent endpoint count, regular feedback, published articles
- **Grow**: Mature usage — courses deployed, assessments running, high user engagement
