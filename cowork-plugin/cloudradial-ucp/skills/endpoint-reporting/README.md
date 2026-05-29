# Endpoint Reporting — Partner Guide

> Inventory, warranty status, and software audit for a client's managed devices.

Use this skill any time you need answers about **devices** — how many a client has, who's out of warranty, what software is installed, where the gaps are.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Device count | `How many endpoints does Acme Corp have?` | Just the number |
| Full inventory | `List all of Contoso's endpoints with OS, manufacturer, and warranty` | Table of devices with the fields you asked for |
| Warranty gaps | `Which of Contoso's devices are out of warranty?` | Filtered list, sorted by expiration date |
| Refresh one device's warranty | `Refresh the warranty info for serial ABC12345` | Triggers `endpoint_update_warranty` (CloudRadial fetches it asynchronously) |
| Refresh all of a company's | `Refresh warranty for all of Acme Corp's devices` | One refresh call per endpoint |
| Software audit | `Show all software installed on endpoint 789` | List of `endpoint_application` records |
| Custom properties | `Show me Contoso's endpoint custom properties` | Custom fields attached to devices |
| QBR-ready report | `Build me a warranty expiration report for Acme Corp for the next 6 months` | Filtered list grouped/sorted for QBR slides |

## Tips

- **Warranty refresh is async.** `endpoint_update_warranty` triggers a background fetch — the new dates appear a few minutes later, not immediately. Re-list the device to confirm.
- **Serial number is what the warranty tool needs**, not endpoint ID. If you only have the ID, Claude will look up the serial first.
- **Filtering by OS** — say "Windows endpoints only" or "Macs only" and Claude filters via OData.
- **`lastSeen` matters.** Devices that haven't checked in recently may not have current data — ask for it explicitly if you need it.

## Related

- [reporting-admin](../reporting-admin/README.md) — for archive reports that include endpoint stats.
- [portal-setup](../portal-setup/README.md) — Session 4 (Reporting & QBR Prep) leans heavily on endpoint data.
