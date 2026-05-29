# Content Management — Partner Guide

> Create and manage portal content: KB articles, service catalogs, menus, courses, and assessments.

Use this whenever you need to **add or change content** in a client's CloudRadial portal. Claude drafts the content for you (in plain English, then converted to HTML where the portal needs it), confirms with you, and writes it via the MCP server.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Draft a KB article | `Create a KB article for Acme Corp about resetting MFA` | Claude drafts the article in HTML, asks you to confirm, then saves as a draft (`isPublished: false`) |
| Publish a draft | `Publish article 123` | Updates `isPublished: true` for that article |
| See what's already there | `Show me all unpublished articles for Contoso` | Filtered list with subjects and IDs |
| Bulk-seed articles | `Seed Contoso with 10 starter KB articles (password reset, VPN, M365, security)` | Draft articles created one at a time, with subjects and a short HTML body each |
| Set up a service catalog | `Build a service catalog for Acme Corp with the usual items (password reset, new user, hardware, software)` | Catalog + catalog questions created for each item |
| Re-organize navigation | `Show me Contoso's menu structure` | List of menu entries — pair this with `update_resource` to reorder |
| Audit content | `Audit Contoso's portal content` | Counts + gaps (e.g. "no catalog configured, 0 courses") |

## Tips

- **Articles use `subject`, not `title`.** Courses use `name`, not `title`. Claude knows this — but if you use raw API calls, keep it in mind.
- **Drafts first.** Claude creates with `isPublished: false` by default so you can review before users see it. Say "publish them" to flip the flag.
- **Big articles are fine.** Claude assembles the HTML body across multiple turns if needed, then writes it in one call.
- **HTML in the body, plain prose in chat.** When you tell Claude what to write, just describe it in plain English — Claude handles the HTML conversion.

## Related

- [course-management](../course-management/README.md) — same pattern for training courses and lessons (which are more involved).
- [assessment-compliance](../assessment-compliance/README.md) — for creating assessments specifically.
- [portal-setup](../portal-setup/README.md) — Session 3 of the implementation track is all about content seeding.
