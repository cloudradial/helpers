# Portal Lookup — Partner Guide

> Find companies, pull overviews, and prep for meetings — fast.

Use this skill any time you need to **look up a client** or get a snapshot of their portal before a call or QBR. It pulls company details, user/endpoint/article counts, and recent activity in one go, and frames the result against the Land → Onboard → Manage → Grow lifecycle so you know where the client is.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Find a company by name | `Look up Acme Corp in CloudRadial` | Top matches with their company IDs and PSA identifiers |
| Get a full snapshot of one company | `Give me an overview of company 42` | Counts (users, endpoints, articles), recent feedback, recent articles, LOMG stage |
| Quick check before a call | `Prepare me for my meeting with Contoso` | Overview + flags (e.g. "0 endpoints — likely still Landing", "3 unpublished drafts") |
| Spot adoption gaps | `How is Acme Corp doing in their portal?` | LOMG classification + suggestions for what to focus on next |
| Compare multiple companies | `Show me overviews for Acme Corp, Contoso, and Globex` | Side-by-side counts so you can see relative health |

## Tips

- **Search is fuzzy.** Partial names are fine ("Acme" matches "Acme Corp", "Acme Holdings", etc.). If you get multiple matches, Claude will ask which one.
- **Company IDs are stable** — once you know one (it'll be a number like `42`), you can use it directly to skip the search step.
- **Pre-meeting prep tip.** Ask "what should I look into before my call with [client]" — Claude will pull the overview *and* highlight anything unusual (zero endpoints, no published articles, stale feedback, etc.).

## Related

- [content-management](../content-management/README.md) — for creating articles/catalogs you find missing.
- [portal-setup](../portal-setup/README.md) — for walking a client through their 5-session implementation.
- [endpoint-reporting](../endpoint-reporting/README.md) — for digging deeper into device coverage.
