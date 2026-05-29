# Assessment & Compliance — Partner Guide

> Review security assessments and manage flexible-asset tracking for a client.

Use this skill for **GAP analysis**, **compliance reviews**, and any **flexible-asset** work (custom fields, asset types, configuration tracking).

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| See assessment status | `Show me Contoso's assessment scores` | List of assessments with status, score, and completion date |
| Review compliance | `How is Acme Corp doing on compliance?` | Summary across assessments — passing, failing, in progress |
| Spot the worst score | `Which company has the lowest assessment score?` | Cross-company comparison |
| List flexible assets | `List all flexible assets for Contoso` | Custom asset records with their type and key fields |
| Understand the schema | `What flexible asset types are configured?` | The type list (each represents a kind of thing being tracked) |
| Inspect a type's fields | `What fields does the "Switch" asset type have?` | Field definitions for that type |
| Create a flexible asset | `Create a flexible asset for Contoso tracking their VPN config` | Claude asks for the values, calls `create_resource` |
| Audit a specific type | `Show me all of Contoso's switches and their firmware versions` | Filtered list of that asset type |

## Tips

- **Assessments are listable but not gettable by ID.** Use list with filter — `get_resource` doesn't work for `assessment` (API quirk).
- **Flexible asset model: type → field → asset.** First the type is defined (e.g. "Switch"), then its fields ("Model", "Firmware", "IP"), then individual assets are records.
- **Bulk ITGlue import?** That's a separate standalone PowerShell sync script (`Sync-ITGlueFlexibleAssets.ps1`) — not this plugin. This plugin handles **creating, listing, and updating** flexible assets in CloudRadial directly.
- **Pair with [endpoint-reporting](../endpoint-reporting/README.md)** for a full GAP picture (warranty + assessments + flex assets).

## Related

- [portal-setup](../portal-setup/README.md) — CSA pain-point #2 ("Improve GAP Analysis") leans on this skill.
- [reporting-admin](../reporting-admin/README.md) — for assessment-related archive reports.
