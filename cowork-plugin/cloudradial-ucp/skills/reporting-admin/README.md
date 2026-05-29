# Reporting & Administration — Partner Guide

> Archives, certificates, company groups, media, API tokens, quickstart guides, and raw API access.

This is the **catch-all** skill for portal administration tasks that don't fit into the other categories — archived reports, certificate tracking, company groupings, media files, API token management, and direct API calls for anything custom.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Past reports | `Show me Acme Corp's archived reports` | List of `archive_item` records (reports + uploaded docs) |
| Open one report | `Get archive item 55 in folder 10 for Acme Corp` | Specific archived report (composite key — needs both IDs) |
| Certificate expiry | `Which of Contoso's certificates expire in 30 days?` | Filtered list by expiration date |
| Company groupings | `What company groups do we have?` | List of `company_group` records |
| Who's in a group | `Which companies are in the "MSP Tier 1" group?` | Companies tied to that group |
| Media library | `Show me Contoso's uploaded media files` | List of `media` records (logos, docs, etc.) |
| List API tokens | `List my CloudRadial API tokens` | All tokens with their IDs and names |
| Create a token | `Create a new API token called "production"` | Calls `manage_tokens` with action `create` |
| Revoke a token | `Revoke token 123` | Calls `manage_tokens` with action `revoke` |
| Quickstart guides | `List quickstart guides` | All `quickstart` records |
| Raw / advanced call | `Hit /v2/odata/company/$count via the API directly` | Calls `raw_api_call` with that path |

## Tips

- **`archive_item` is composite-key.** To `get_resource`, you need both `archive_id` (the folder) and `id` (the item). Claude knows; only matters for raw calls.
- **Tokens are sensitive.** Don't paste created tokens into chat — Claude returns them once at creation; record them somewhere safe.
- **`raw_api_call` is the escape hatch.** Anything the other 16 tools don't cover, this can. Useful for exploring the API or for calls Claude doesn't have a dedicated tool for.
- **Cross-company reports** start here — combine `company_group` membership with per-company lookups for partner-wide rollups.

## Related

- All the other skills — when something doesn't fit them, it probably fits here.
- [API reference](../../references/api-reference.md) — for figuring out raw API paths.
