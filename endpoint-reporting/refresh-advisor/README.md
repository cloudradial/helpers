# Endpoint Warranty & Refresh Advisor

Evaluate managed endpoints against a hardware-lifecycle policy and create or update **one aggregated
refresh-plan Planner card per company** listing that company's out-of-spec devices.

## Business Problem

Endpoint inventory tells you what you have, but not what to do about it. Warranty and age data sit in
the portal, and turning them into a client-ready refresh plan is manual. Creating a task per device
buries everyone in noise. This script produces a single, self-updating "refresh plan" card per
company that groups flagged devices by recommendation (Replace, Plan replacement, Retain/upgrade,
Needs data, Human review), so you can walk a client through their hardware roadmap in one place.

Re-running the script updates the same card in place instead of piling up duplicates.

## What It Does

- Pulls managed endpoints from the CloudRadial v2 OData API, scoped to the companies you name (or all
  companies with `-AllCompanies`).
- Batch-pulls each device's custom properties (warranty, age, RAM, storage, disk type) in chunks, so
  N devices cost roughly N/40 API calls instead of one call per device.
- Evaluates each device with a deterministic, first-match-wins policy (see below).
- Groups the devices that warrant attention by company.
- Creates or updates exactly **one** Planner card (a CloudRadial "product") per company.

### Decision policy (first match wins)

| Condition | Recommendation |
|-----------|----------------|
| Device is a server | Human review |
| Age >= 5 years, OR OS unsupported, OR RAM < 4 GB | Replace |
| Age 3 to < 5 years | Plan replacement |
| Age < 3 years | Retain, extend or upgrade |
| No age + unknown warranty + unknown OS | Needs data |
| Otherwise | Retain, extend or upgrade |

OS support: Windows 11 = supported; Windows 10 and earlier = unsupported (EOL 2025-10-14); anything
else = unknown.

A device appears on the card if its recommendation is Replace, Plan replacement, Needs data, or Human
review; or if it is Retain but carries an actionable driver (`warranty_expired`, `warranty_expiring`,
`os_unsupported`, `ram<8gb`, `hdd`, `storage<256gb`).

## Prerequisites

- PowerShell 5.1 or later
- CloudRadial API keys (Settings > API in your portal)
- Custom properties on your endpoints for the fields you want considered. Recognized name variants
  (case-insensitive): warranty end (`warranty`, `warrantyexpiration`, `warrantyenddate`,
  `warranty_expiration`); purchase date (`purchasedate`, `manufacturedate`, `shipdate`, `acquired`);
  age (`age`, `agemonths`, `ageyears`); RAM (`ram`, `memory`); storage (`disk`, `storage`); disk type
  (`disktype`). Missing fields degrade gracefully to "unknown".

## Usage

```powershell
# Dry run against the main company (companyId 1) - writes nothing
.\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "YOUR_PUBLIC" -PrivateKey "YOUR_PRIVATE" -WhatIf

# Main company only (default), create/update its card
.\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "YOUR_PUBLIC" -PrivateKey "YOUR_PRIVATE"

# Specific client companies
.\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "YOUR_PUBLIC" -PrivateKey "YOUR_PRIVATE" -CompanyId 1,4,7

# Every company in the portal, with verbose API logging
.\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "YOUR_PUBLIC" -PrivateKey "YOUR_PRIVATE" -AllCompanies -Verbose

# EU region
.\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "YOUR_PUBLIC" -PrivateKey "YOUR_PRIVATE" `
    -BaseUrl "https://api.eu.cloudradial.com"
```

**Always run with `-WhatIf` first.** It performs the read-only evaluation and reconcile, then reports
exactly which companies would get a created or updated card, without writing anything.

## Expected Output

A console summary, plus a result object you can capture for automation:

```
Endpoint Refresh Advisor
Scope: companyId filter [1]
Evaluated 16 endpoints; flagged 9 across 1 companies.
  Replace: 2  Plan replacement: 0  Retain/upgrade: 0  Needs data: 5  Human review: 2
Cards created: 1  updated: 0  errors: 0
```

The card body lists the flagged devices grouped by recommendation. The Human review section carries a
note that those devices (servers) need a technician's judgment and are not auto-scheduled.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-PublicKey` | *(required)* | API public key |
| `-PrivateKey` | *(required)* | API private key |
| `-BaseUrl` | `https://api.us.cloudradial.com` | API base URL (`https://api.eu.cloudradial.com` for EU) |
| `-CompanyId` | `@(1)` | One or more companyIds to process. Ignored when `-AllCompanies` is set |
| `-AllCompanies` | *(off)* | Process every company in the portal |
| `-Subject` | `Endpoint Hardware Refresh Plan` | Card title; also the reconcile key, keep it stable |
| `-Category` | `Efficiency` | Card category |
| `-ProductCategoryId` | `7` | Card product category id |
| `-WhatIf` | | Preview created/updated cards without writing |
| `-Verbose` | | Log each API call |

## Troubleshooting

- **"API returned 401/403"**: Check that your API keys are valid and belong to the portal you intend
  to write to.
- **"Company not found"**: A companyId in `-CompanyId` does not exist in this portal. Remove it, or
  use `-AllCompanies`.
- **A device you expected is missing**: It did not warrant attention (e.g. Retain with no actionable
  driver), or its custom properties use a name this script does not recognize (see Prerequisites).
- **A duplicate card appeared**: The reconcile key is the `-Subject` string plus a body marker. If you
  change `-Subject` between runs, older cards will not be recognized. Keep it stable.

## Customization Tips

- **Schedule it**: Run from your RMM or a scheduled task on whatever cadence fits your review cycle.
- **Tune the thresholds**: The age, RAM, storage, and OS rules live in the `Get-Recommendation` and
  `Get-OsSupport` functions near the top of the script.

## Tested Environments

- PowerShell 5.1 and PowerShell 7
- Windows 11
- CloudRadial v2 API (US region)
