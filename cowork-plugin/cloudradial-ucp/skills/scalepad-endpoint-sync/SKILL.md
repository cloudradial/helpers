---
name: scalepad-endpoint-sync
description: >
  Sync ScalePad Lifecycle Manager hardware data onto CloudRadial endpoints — warranty/EOL
  dates, purchase/age, manufacturer, model, OS — matched by serial number. Use when the user
  says "sync ScalePad to CloudRadial", "pull ScalePad endpoint data into CloudRadial", "import
  ScalePad warranties/EOL onto endpoints", "connect ScalePad to CloudRadial", "get ScalePad
  hardware into the portal", "update endpoints from ScalePad", or wants ScalePad's lifecycle
  insights reflected on CloudRadial devices. For turning a ScalePad PDF/deliverable into a
  Planner roadmap by hand, use `client-deliverable` instead.
metadata:
  version: "1.0.0"
---

# ScalePad → CloudRadial Endpoint Sync

Write ScalePad's per-device lifecycle data onto the matching CloudRadial endpoints so the
portal's own lifecycle features — Age/Warranty policies, the Endpoint LifeCycle Manager
refresh cards — run on real data. ScalePad computes the dashboard roll-ups (expired
warranties, slow workstations, unsupported OS); once the underlying fields are on the
endpoints, CloudRadial computes its own.

This is a **write** to managed device records. Default to a plan, show it, then apply.

## Field mapping (gap-fill only)

The sync writes a field **only when the endpoint is missing it** — it never overwrites
RMM-supplied values.

| ScalePad hardware field | CloudRadial `Endpoint` field |
|---|---|
| serial number | `serialNumber` (match key) |
| warranty / EOL date | `expirationDate` |
| purchase date | `manufacturedDate` (the age basis) |
| manufacturer / model | `manufacturer` / `model` |
| operating system | `os` / `osVersion` |
| RAM / anti-virus (with `include_specs`) | `memory` / `antiVirus` |

## Sequence

### 1. Check setup

Call `setup_status`. It now reports a `scalepad` sub-object. Both must be configured:

- CloudRadial not configured → defer to the `setup` skill.
- `scalepad.configured` false → ask the user for their ScalePad **API key** and **API base
  URL** and call `configure_scalepad_credentials`. It validates with a live call before
  saving; bad keys never get stored. The keys go in the OS keychain, never in chat.

### 2. Resolve both sides

- CloudRadial: `search_companies` → confirm the `companyId`.
- ScalePad: pass `client_name` (the tool resolves the client id), or a `scalepad_client_id`
  directly. Confirm you matched the right client before writing.

### 3. Inspect the ScalePad data (optional but recommended)

`scalepad_list_hardware` with the client. Report how many records carry a **serial** — only
those can be matched. If most lack a serial, say so; the sync can't place them.

### 4. Plan, show, then apply

Run `sync_scalepad_endpoints` with `apply` omitted (or false) first — it writes nothing and
returns the diff: how many endpoints **to update**, **to create**, and the skip reasons
(no serial, no change, no match). Show the user that summary. Only on their confirmation,
re-run with `apply: true`.

- `create_missing: true` (plus `new_endpoint_defaults: { platformType, enclosure }`) creates a
  tagged placeholder endpoint for a serial-bearing asset that isn't in the portal. Confirm the
  enum codes against a real endpoint first (Enumerations section of the API reference) — do not
  guess them. Default is off; leave it off unless the user wants ScalePad-only devices seeded.
- `include_specs: true` also gap-fills `memory` and `antiVirus`.

### 5. Report, then hand off

State what was updated / created / skipped. Then point the user at the payoff: with
`expirationDate` and `manufacturedDate` now populated, the **Endpoint LifeCycle Manager** /
`client-deliverable` flow produces accurate refresh cards — the CloudRadial-native equivalent
of ScalePad's dashboard.

## Confirm before production

The ScalePad response field names are read defensively across several likely spellings
(`scalepad-client.ts` `normalizeScalePadAsset`). Verify them against a live ScalePad response
(<https://developer.scalepad.com/reference>) and pin them before relying on the sync at scale —
a wrong field means a blank or wrong value written to a device.

## Report honestly

Close with counts, not adjectives: assets read, with serials, endpoints updated, created,
skipped (and why), and any per-device errors. This writes to device records a partner sees —
a silently wrong `expirationDate` surfaces in their next QBR.
