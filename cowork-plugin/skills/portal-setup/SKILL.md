---
name: portal-setup
description: >
  Guide a partner through setting up and configuring their CloudRadial portal for a
  client company. Use when the user says "set up a portal", "onboard a new client",
  "configure the portal for [company]", "implementation session", "portal onboarding",
  "seed content for [company]", "prepare portal for [company]", "what does [company]
  need next", "CSA pain points", "implementation checklist", or needs to walk through
  portal configuration, content seeding, or implementation sessions for a specific
  client company. This is about configuring the CloudRadial PORTAL — not the Cowork plugin.
  For plugin/Azure Function setup, use the "setup" skill instead.
metadata:
  version: "1.0.0"
---

# Portal Setup & Implementation Guide

Guide partners through setting up and configuring CloudRadial portals for their client companies. This covers the full implementation lifecycle — from initial portal provisioning to account management handoff.

**Important:** This skill is about configuring the CloudRadial PORTAL for a client company. For setting up the Cowork plugin and Azure Function, use the **setup** skill instead.

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

## API Reference

For exact field names and schema details, read `${CLAUDE_PLUGIN_ROOT}/references/api-reference.md`.

---

## LOMG Framework

CloudRadial follows the **Land, Onboard, Manage, Grow** (LOMG) lifecycle. Every partner and client company is somewhere on this journey. Before doing anything, determine where they are:

| Phase | Indicators | Focus |
|-------|-----------|-------|
| **Land** | Company exists, few/no users, no articles, no endpoints | Get portal provisioned, PSA connected, first users added |
| **Onboard** | Users being added, articles being created, catalogs being configured | 5-session implementation, content seeding, ticketing integration |
| **Manage** | Consistent endpoints, regular feedback, published articles | Ongoing content updates, QBR reporting, user adoption |
| **Grow** | Courses deployed, assessments running, high engagement | Advanced features, training courses, compliance tracking, co-management |

### Assess a Company's LOMG Stage

1. Pull the company overview:
   ```javascript
   (async()=>{
     const base = "{baseUrl from config}";
     const key = "{functionKey from config}";
     const r = await fetch(`${base}/company_overview?company_id=<id>`, {
       headers: {"x-functions-key": key}
     });
     return await r.text();
   })()
   ```

2. Count key resources:
   - Users → `count_resources?resource_type=user&filter=companyId eq <id>`
   - Endpoints → `count_resources?resource_type=endpoint&filter=companyId eq <id>`
   - Articles → `count_resources?resource_type=article&filter=companyId eq <id>`
   - Courses → `count_resources?resource_type=course&filter=companyId eq <id>`
   - Assessments → `count_resources?resource_type=assessment&filter=companyId eq <id>`
   - Feedback → `count_resources?resource_type=feedback&filter=companyId eq <id>`

3. Classify:
   - **0 endpoints + 0 articles** = Land
   - **Endpoints syncing + articles being created** = Onboard
   - **Consistent endpoints + published articles + feedback** = Manage
   - **Courses + assessments + high user count** = Grow

---

## The 5-Session Implementation Process

This is the standard onboarding track for new client companies. Each session has a specific focus and checklist.

### Session 1: Portal Setup & First Impressions

**Goal:** Get the portal provisioned, branded, and connected to the PSA. First users can log in.

**Checklist:**
- [ ] Company created in CloudRadial (or synced from PSA)
- [ ] Portal branding configured (logo, colors, company name)
- [ ] PSA integration connected and syncing (ConnectWise, Autotask, HaloPSA, etc.)
- [ ] Microsoft 365 integration connected (if applicable)
- [ ] First admin user created and can log in
- [ ] Endpoint agent deployed to at least one test machine
- [ ] Portal URL shared with partner's internal team

**API actions to check/verify:**
- Search for the company: `search_companies?name=<name>`
- Check user count: `count_resources?resource_type=user&filter=companyId eq <id>`
- Check endpoint count: `count_resources?resource_type=endpoint&filter=companyId eq <id>`
- Review company details: `company_overview?company_id=<id>`

### Session 2: Ticketing & Service Desk

**Goal:** Configure the service desk experience. End users can submit tickets through the portal instead of email/phone.

**Checklist:**
- [ ] Service catalog configured with common request types
- [ ] Catalog questions set up for each service item (captures the right info)
- [ ] Ticket submission tested end-to-end (portal → PSA)
- [ ] Ticket status visibility confirmed (users can see their tickets)
- [ ] Email-to-portal redirect strategy discussed (eliminate email/phone tickets)
- [ ] Quick links or shortcuts configured for common actions

**API actions:**
- List catalogs: `list_resources?resource_type=catalog&filter=companyId eq <id>`
- List catalog questions: `list_resources?resource_type=catalog_question&filter=companyId eq <id>`
- Check services: `list_resources?resource_type=service&filter=companyId eq <id>`

**Content to seed:**
- Service catalog items for: password reset, new user request, hardware request, software request, general support
- Catalog questions for each item that capture the necessary details

### Session 3: Content & Knowledge Base

**Goal:** Populate the portal with useful content. End users have self-service resources.

**Checklist:**
- [ ] KB articles created for top 10 support topics
- [ ] Articles organized by category
- [ ] Menu structure configured (navigation makes sense)
- [ ] Company-specific content vs. global content strategy decided
- [ ] Article publishing workflow established (draft → review → publish)
- [ ] Quickstart guides configured for new user onboarding

**API actions:**
- List articles: `list_resources?resource_type=article&filter=companyId eq <id>`
- List menus: `list_resources?resource_type=menu&filter=companyId eq <id>`
- Create articles: Use `create_resource` with `resource_type: "article"` (see content-management skill)

**Content to seed (common KB articles):**
- How to reset your password
- How to submit a support ticket
- VPN setup guide
- Email setup on mobile devices
- Microsoft 365 tips and tricks
- Approved software list
- IT policies and acceptable use
- How to request new hardware
- Remote work setup guide
- Security awareness basics

### Session 4: Reporting & QBR Preparation

**Goal:** Set up reporting dashboards and QBR templates. Partner can run business reviews.

**Checklist:**
- [ ] Endpoint reporting configured (warranty tracking, OS distribution)
- [ ] User adoption metrics accessible (login frequency, ticket volume)
- [ ] Feedback collection enabled (CSAT after ticket resolution)
- [ ] Archive reports configured for automated delivery
- [ ] QBR template prepared with key metrics
- [ ] GAP analysis tools configured (security posture, compliance)

**API actions:**
- Review endpoints: `list_resources?resource_type=endpoint&filter=companyId eq <id>`
- Check feedback: `list_resources?resource_type=feedback&filter=companyId eq <id>`
- Review assessments: `list_resources?resource_type=assessment&filter=companyId eq <id>`
- Check archives: `list_resources?resource_type=archive_item&filter=companyId eq <id>`

### Session 5: Account Management Handoff

**Goal:** Transition from implementation to ongoing management. Partner's AM team takes over.

**Checklist:**
- [ ] All Session 1-4 items complete
- [ ] End users onboarded and trained (know how to use the portal)
- [ ] Courses assigned if using training features
- [ ] Ongoing content update schedule established
- [ ] Feedback loop configured (CSAT, portal feedback widget)
- [ ] AM team briefed on portal status and next steps
- [ ] Success metrics defined (ticket deflection, user adoption, CSAT scores)

**API actions:**
- Full content audit: List articles, catalogs, menus, courses, assessments
- User adoption check: Count users, review login activity
- Endpoint coverage: Count endpoints vs. known device count
- Course enrollments: `list_resources?resource_type=course_enrollment&filter=companyId eq <id>`

---

## 8 CSA Pain Points & Playbooks

These are the most common challenges that drive partners to CloudRadial. Each maps to specific portal features and configuration steps.

### 1. Eliminate Email/Phone Tickets

**Problem:** End users email or call for support instead of using the portal.
**Solution:** Service catalog + ticket submission portal
**Configure:**
- Build an intuitive service catalog with clear categories
- Add catalog questions that capture required info upfront
- Set up email redirect (auto-reply pointing to portal)
- Create a "How to Submit a Ticket" KB article
- Add the portal URL to the company's email signature

### 2. Improve GAP Analysis

**Problem:** Hard to identify gaps in a client's IT environment.
**Solution:** Assessments + endpoint reporting + flexible assets
**Configure:**
- Deploy assessments (security, compliance, infrastructure)
- Review endpoint data for warranty gaps, OS distribution
- Set up flexible assets for tracking non-standard items
- Build a GAP analysis report template using assessment results

### 3. Improve Sales Presentations

**Problem:** QBRs and sales presentations lack data-driven insights.
**Solution:** Portal reporting + archive reports + endpoint data
**Configure:**
- Pull endpoint warranty expiration data for upsell opportunities
- Aggregate user adoption metrics for value demonstration
- Generate archive reports showing before/after metrics
- Use assessment scores to identify expansion opportunities

### 4. User Training & Adoption

**Problem:** End users don't know how to use IT resources effectively.
**Solution:** Courses + lessons + enrollment tracking
**Configure:**
- Create training courses (security awareness, software basics, company policies)
- Build course lessons with HTML content
- Assign courses to users (required vs. optional)
- Track enrollment and completion rates
- Create a "Final Exam" lesson for knowledge verification

### 5. Reduce QBR Preparation Time

**Problem:** QBR prep takes hours of manual data gathering.
**Solution:** Company overview + automated reporting
**Configure:**
- Use `company_overview` to get instant snapshots
- Set up automated archive reports
- Configure feedback collection for ongoing CSAT data
- Build a standard QBR checklist that pulls from portal data

### 6. Sync PSA & Microsoft 365

**Problem:** Data silos between PSA, M365, and client-facing portal.
**Solution:** Integration configuration (done in CloudRadial admin, not via API)
**Note:** PSA and M365 integrations are configured in the CloudRadial admin portal, not through this plugin. Guide partners to Settings → Integrations.

### 7. Onboarding/Offboarding Forms

**Problem:** New hire onboarding and employee offboarding are manual, error-prone processes.
**Solution:** Service catalog forms with structured questions
**Configure:**
- Create "New Employee Onboarding" catalog item with comprehensive questions (name, department, start date, software needs, hardware needs, access requirements)
- Create "Employee Offboarding" catalog item (last day, equipment return, access revocation checklist)
- Set up automation rules in PSA to create tasks from form submissions

### 8. Replace Invarosoft / DeskDirector

**Problem:** Partner is migrating from another client portal tool.
**Solution:** Full CloudRadial implementation matching/exceeding previous capabilities
**Configure:**
- Audit the existing portal's content and features
- Recreate service catalog items, KB articles, and branding
- Migrate user accounts
- Set up equivalent integrations
- Communicate the transition to end users with training content

---

## Content Seeding Workflows

### Seed Articles for a New Company

1. Identify the company and confirm companyId
2. Check existing articles to avoid duplicates
3. Create articles as drafts (isPublished: false):
   ```javascript
   (async()=>{
     const base = "{baseUrl from config}";
     const key = "{functionKey from config}";
     const r = await fetch(`${base}/create_resource`, {
       method: "POST",
       headers: {"Content-Type": "application/json", "x-functions-key": key},
       body: JSON.stringify({
         resource_type: "article",
         data: {
           companyId: <id>,
           subject: "Article Subject Here",
           body: "<p>HTML article content</p>",
           category: "Category Name",
           isPublished: false
         }
       })
     });
     return "Status: " + r.status + " | " + await r.text();
   })()
   ```
4. Review drafts with the partner before publishing
5. Publish by updating `isPublished: true`

### Seed a Training Course

1. Create the course container:
   ```javascript
   // create_resource with resource_type: "course"
   // Key fields: name, description (HTML), category, companyId, estimatedTime, isRequired, passScore
   ```
2. Create lessons in order:
   ```javascript
   // create_resource with resource_type: "course_lesson"
   // Key fields: courseId, title, overview, text (HTML body), order, companyId
   ```
3. Final Exam lesson is a stub — quiz mechanics handled by the platform

### Seed a Service Catalog

1. Create catalog items:
   ```javascript
   // create_resource with resource_type: "catalog"
   // Key fields: name, description, companyId
   ```
2. Add catalog questions for each item:
   ```javascript
   // create_resource with resource_type: "catalog_question"
   // Key fields: companyCatalogId, questionText, questionType, isRequired
   ```

---

## Implementation Readiness Check

Before any implementation session, run a quick readiness check:

1. Pull company overview
2. Count: users, endpoints, articles, catalogs, courses, assessments, feedback
3. List recent articles (are they being created?)
4. List recent feedback (are users engaged?)
5. Check service catalog (is ticketing configured?)
6. Assess LOMG stage
7. Identify which implementation session they're on based on what's complete vs. missing
8. Present findings and recommend next steps
