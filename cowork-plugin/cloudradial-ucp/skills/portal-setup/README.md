# Portal Setup & Implementation — Partner Guide

> Walk a client through the full 5-session CloudRadial onboarding, with playbooks for the 8 most common partner challenges.

This is the **partner implementation playbook**, built into Claude. Use it to onboard a new client, drive a structured implementation session, decide what's needed next based on where the client is in the LOMG (Land → Onboard → Manage → Grow) lifecycle, or to solve specific CSA pain points (ticket elimination, GAP analysis, QBR prep, etc.).

> ⚠️ **Don't confuse this with `setup`.** The **setup** skill configures the *plugin* itself (your API keys). **portal-setup** configures a *client's CloudRadial portal*.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Onboard a new client | `Onboard a new client called Acme Corp` | Walk through Session 1 (provisioning), then prompts for the next session |
| Find out where a client is | `What does Contoso need next?` | LOMG classification + the next session's checklist |
| Run a specific session | `Walk me through Session 3 for company 42` (Content & KB) | Session checklist, suggested KB articles to seed, API actions to verify |
| Solve a known pain point | `Help me eliminate email/phone tickets for Contoso` | The CSA pain-point #1 playbook: catalog config, redirect strategy, KB seed |
| Plan a QBR | `Prep a QBR for Acme Corp` | Pulls overview, endpoint warranty data, CSAT, archive reports — formatted for a review |
| Migrate from another tool | `We're migrating Contoso from Invarosoft to CloudRadial` | CSA pain-point #8 playbook: audit existing, recreate, train end users |

## The 5-session implementation track

1. **Portal Setup & First Impressions** — branding, PSA integration, first admin user
2. **Ticketing & Service Desk** — service catalog, catalog questions, ticket flow
3. **Content & Knowledge Base** — KB articles, menus, quickstart guides
4. **Reporting & QBR Preparation** — endpoint reports, CSAT, archive reports
5. **Account Management Handoff** — training, AM briefing, success metrics

You don't have to do them in order — Claude will adapt based on what's already in the portal.

## Tips

- **Always start with a lookup.** Ask "what's the current state of [company]" first — Claude will adjust the playbook to where they actually are.
- **PSA + M365 integrations live in CloudRadial admin**, not this plugin. Claude will point you there when relevant.
- **Content seeding** for a brand-new portal is a frequent ask — Claude can draft 10 starter KB articles in one go.

## Related

- [portal-lookup](../portal-lookup/README.md) — fast company snapshots used at the start of every session.
- [content-management](../content-management/README.md) — for actually creating the articles, catalogs, and menus the sessions call for.
- [course-management](../course-management/README.md) — for Session 5 training assignments.
