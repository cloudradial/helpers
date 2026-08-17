<#
.SYNOPSIS
Evaluate CloudRadial-managed endpoints against a hardware-lifecycle policy and create or update
one aggregated "refresh plan" Planner card per company listing that company's out-of-spec devices.

.DESCRIPTION
This script solves a recurring MSP problem: turning raw endpoint inventory into an actionable,
per-client hardware refresh plan without generating a card per device.

On each run it:
  1. Pulls managed endpoints from the CloudRadial v2 OData API (scoped to the companies you name,
     or all companies with -AllCompanies).
  2. Batch-pulls each device's custom properties (warranty, age, RAM, storage, disk type) in
     chunks, so N devices cost ~N/chunk API calls instead of one call per device.
  3. Evaluates each device with a deterministic, first-match-wins policy (see NOTES).
  4. Groups the devices that warrant attention by company.
  5. Creates or updates exactly ONE Planner card (a CloudRadial "product") per company, listing
     that company's flagged devices grouped by recommendation.

The card is reconciled by a deterministic subject and an embedded body marker, so re-running the
script updates the same card in place rather than creating duplicates.

Because this script writes to your portal, it supports -WhatIf. Run with -WhatIf first to see what
it would create or update without making any changes.

.PARAMETER PublicKey
CloudRadial API public key (Settings > API in your portal). Used as the HTTP Basic username.

.PARAMETER PrivateKey
CloudRadial API private key. Used as the HTTP Basic password.

.PARAMETER BaseUrl
API base URL. Defaults to https://api.us.cloudradial.com. Use https://api.eu.cloudradial.com for EU.

.PARAMETER CompanyId
One or more companyIds to process. Defaults to @(1). In each CloudRadial portal the main company is
companyId 1, so the default targets the portal you authenticated against. Ignored when -AllCompanies
is set.

.PARAMETER AllCompanies
Process every company found in the portal instead of the -CompanyId list. Heavier: pulls the whole
portal's endpoints.

.PARAMETER Subject
Card subject/title. Deterministic and used as the reconcile key, so keep it stable across runs.
Defaults to "Endpoint Hardware Refresh Plan".

.PARAMETER Category
Card category. Defaults to "Efficiency".

.PARAMETER ProductCategoryId
Card product category id. Defaults to 7.

.EXAMPLE
PS> .\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "abc123" -PrivateKey "xyz789" -WhatIf
Dry run against the main company (companyId 1): shows what would be created/updated, writes nothing.

.EXAMPLE
PS> .\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "abc123" -PrivateKey "xyz789" -CompanyId 1,4,7
Evaluate companies 1, 4 and 7 and upsert one refresh-plan card for each that has flagged devices.

.EXAMPLE
PS> .\Invoke-EndpointRefreshAdvisor.ps1 -PublicKey "abc123" -PrivateKey "xyz789" -AllCompanies -Verbose
Evaluate every company in the portal with verbose API logging.

.NOTES
Author: CloudRadial community
Version: 1.0
Date: 2026-08-14

Decision policy (first match wins):
  - isServer                                  -> Human review
  - age >= 5y OR OS unsupported OR RAM < 4GB  -> Replace
  - age 3 to < 5y                             -> Plan replacement
  - age < 3y                                  -> Retain, extend or upgrade
  - no age + unknown warranty + unknown OS    -> Needs data
  - otherwise                                 -> Retain, extend or upgrade

OS support: Windows 11 = supported; Windows 10 and earlier = unsupported (EOL 2025-10-14); else unknown.

A device "warrants attention" (and appears on the card) if its recommendation is Replace,
Plan replacement, Needs data, or Human review; or if it is Retain but carries an actionable driver
(warranty_expired, warranty_expiring, os_unsupported, ram<8gb, hdd, storage<256gb).

The companion refresh-planner-cards.workflow.ps1 in this folder is the same logic packaged as a
CloudRadial AutomationAI workflow node (Key Vault secrets + Set-NodeOutput, always writes).
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$PublicKey,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$PrivateKey,

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$BaseUrl = 'https://api.us.cloudradial.com',

    [Parameter(Mandatory = $false)]
    [int[]]$CompanyId = @(1),

    [Parameter(Mandatory = $false)]
    [switch]$AllCompanies,

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$Subject = 'Endpoint Hardware Refresh Plan',

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$Category = 'Efficiency',

    [Parameter(Mandatory = $false)]
    [int]$ProductCategoryId = 7
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProductCreatePath = '/v2/product'      # POST /v2/product
$ProductPatchPath  = '/v2/product/{id}' # PATCH /v2/product/{id} (JSON Patch)

$BaseUrl = $BaseUrl.TrimEnd('/')
$authBytes = [Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $PublicKey, $PrivateKey))
$authHeader = 'Basic ' + [Convert]::ToBase64String($authBytes)
$headers = @{ Authorization = $authHeader; Accept = 'application/json' }
$runDate = (Get-Date).ToUniversalTime()
$publishDate = $runDate.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

function Invoke-CrApi {
    param(
        [Parameter(Mandatory)][string]$Path,
        [string]$Method = 'GET',
        [object]$Body,
        [string]$ContentType = 'application/json'
    )

    $url = if ($Path -match '^https?://') { $Path } else { "$BaseUrl$Path" }
    Write-Verbose "$Method $url"
    for ($attempt = 1; $attempt -le 6; $attempt++) {
        try {
            $callArgs = @{ Uri = $url; Method = $Method; Headers = $headers; ContentType = $ContentType }
            if ($null -ne $Body) { $callArgs.Body = ($Body | ConvertTo-Json -Depth 12) }
            return Invoke-RestMethod @callArgs
        }
        catch {
            $code = try { [int]$_.Exception.Response.StatusCode } catch { 0 }
            if (($code -eq 429 -or $code -ge 500) -and $attempt -lt 6) {
                Start-Sleep -Seconds ([Math]::Min(30, [Math]::Pow(2, $attempt)))
                continue
            }
            $detail = $null
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
            if (-not $detail) {
                try {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = [System.IO.StreamReader]::new($stream)
                    $detail = $reader.ReadToEnd()
                } catch { }
            }
            throw ("CloudRadial API $Method $url failed (HTTP $code): $detail")
        }
    }
}

# CloudRadial does not reliably return @odata.nextLink, so page with $skip/$top and stop when a
# page returns fewer than $top rows.
function Get-CrCollection {
    param([Parameter(Mandatory)][string]$Path)
    $allRows = [System.Collections.Generic.List[object]]::new()
    $pageSize = 100
    $skip = 0
    $maxPages = 1000
    for ($page = 0; $page -lt $maxPages; $page++) {
        $sep = if ($Path -match '\?') { '&' } else { '?' }
        $next = "${Path}${sep}`$top=$pageSize&`$skip=$skip"
        $resp = Invoke-CrApi -Path $next
        if ($null -eq $resp) { break }

        $rows = @()
        $valProp = $resp.PSObject.Properties['value']
        if ($valProp -and $null -ne $valProp.Value) { $rows = @($valProp.Value) }
        elseif ($resp -is [System.Array]) { $rows = @($resp) }

        foreach ($row in $rows) { [void]$allRows.Add($row) }

        if (@($rows).Count -lt $pageSize) { break }
        $skip += $pageSize
    }
    return $allRows.ToArray()
}

function Get-Field {
    param($Obj, [string]$Name)
    if ($null -eq $Obj) { return $null }
    $p = $Obj.PSObject.Properties[$Name]
    if ($p) { return $p.Value }
    return $null
}

function ConvertTo-HtmlText {
    param($Text)
    $s = [string]$Text
    if ([string]::IsNullOrEmpty($s)) { return '' }
    return ($s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;')
}

function Get-Prop {
    param($Props, [string[]]$Names)
    $lookup = @($Names | ForEach-Object { $_.ToLowerInvariant() })
    foreach ($p in @($Props)) {
        $n = ([string](Get-Field $p 'name')).Trim().ToLowerInvariant()
        if ($lookup -contains $n) { return (Get-Field $p 'value') }
    }
    return $null
}

function Try-ParseDoubleInvariant {
    param($Value, [ref]$Parsed)
    $Parsed.Value = 0.0
    if ($null -eq $Value) { return $false }
    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) { return $false }
    return [double]::TryParse($text, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$Parsed.Value)
}

function Get-AgeYears {
    param($Props, $WarrantyEnd, [ref]$Estimated)
    $Estimated.Value = $false

    $ageVal = Get-Prop $Props @('age')
    $ageMonths = Get-Prop $Props @('agemonths')
    $ageYears = Get-Prop $Props @('ageyears')

    $parsed = 0.0
    if (Try-ParseDoubleInvariant -Value $ageYears -Parsed ([ref]$parsed)) { return $parsed }
    if (Try-ParseDoubleInvariant -Value $ageMonths -Parsed ([ref]$parsed)) { return ($parsed / 12) }
    if (Try-ParseDoubleInvariant -Value $ageVal -Parsed ([ref]$parsed)) { return $parsed }

    $purchase = Get-Prop $Props @('purchasedate','manufacturedate','shipdate','acquired')
    $pd = [datetime]::MinValue
    if ($null -ne $purchase -and -not [string]::IsNullOrWhiteSpace([string]$purchase) -and [datetime]::TryParse([string]$purchase, [ref]$pd)) {
        return [math]::Round(($runDate - $pd).TotalDays / 365.25, 2)
    }

    if ($null -ne $WarrantyEnd) {
        $start = $WarrantyEnd.AddMonths(-36)
        $Estimated.Value = $true
        return [math]::Round(($runDate - $start).TotalDays / 365.25, 2)
    }

    return $null
}

function Get-WarrantyStatus {
    param($WarrantyEnd)
    if ($null -eq $WarrantyEnd) { return 'unknown' }
    if ($WarrantyEnd -lt $runDate) { return 'expired' }
    if ($WarrantyEnd -le $runDate.AddDays(90)) { return 'expiring' }
    return 'active'
}

function Get-OsSupport {
    param([string]$Os, [string]$Edition)
    $t = "$Os $Edition".ToLowerInvariant()
    if ($t -match 'windows\s*11') { return 'supported' }
    if ($t -match 'windows\s*(10|8|7|xp|vista)') { return 'unsupported' }
    return 'unknown'
}

function Get-NumericGb {
    param($Raw)
    if ($null -eq $Raw) { return $null }
    $s = ([string]$Raw).Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($s)) { return $null }
    if ($s -match '([\d\.]+)\s*tb') { return ([double]$Matches[1] * 1024) }
    if ($s -match '([\d\.]+)\s*gb') { return [double]$Matches[1] }

    $parsed = 0.0
    if ([double]::TryParse($s, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
        return $parsed
    }
    return $null
}

function Get-Recommendation {
    param($IsServer, $AgeYears, $WarrantyStatus, $OsSupport, $RamGb, $StorageType, $StorageGb, [ref]$Drivers)

    $d = foreach ($nullItem in @($null)) {
        if ($IsServer) { 'is_server'; break }
        if ($null -ne $AgeYears -and $AgeYears -ge 5) { 'age>=5y' }
        if ($OsSupport -eq 'unsupported') { 'os_unsupported' }
        if ($null -ne $RamGb -and $RamGb -lt 4) { 'ram<4gb' }
        if ($null -ne $RamGb -and $RamGb -ge 4 -and $RamGb -lt 8) { 'ram<8gb' }
        if ($null -ne $StorageType -and $StorageType.ToString().ToLowerInvariant() -match 'hdd|spinning') { 'hdd' }
        if ($null -ne $StorageGb -and $StorageGb -lt 256) { 'storage<256gb' }
        if ($WarrantyStatus -in @('expired','expiring')) { "warranty_$WarrantyStatus" }
    }
    $Drivers.Value = @($d)

    $osUnsupported = ($OsSupport -eq 'unsupported')
    $ramHardFail = ($null -ne $RamGb -and $RamGb -lt 4)

    if ($IsServer) { return 'Human review' }
    if (($null -ne $AgeYears -and $AgeYears -ge 5) -or $osUnsupported -or $ramHardFail) { return 'Replace' }
    if ($null -ne $AgeYears -and $AgeYears -ge 3 -and $AgeYears -lt 5) { return 'Plan replacement' }
    if ($null -ne $AgeYears -and $AgeYears -lt 3) { return 'Retain, extend or upgrade' }
    if ($null -eq $AgeYears -and $WarrantyStatus -eq 'unknown' -and $OsSupport -eq 'unknown') { return 'Needs data' }
    return 'Retain, extend or upgrade'
}

function Test-WarrantsAttention {
    param($Recommendation, $Drivers)
    switch ($Recommendation) {
        'Replace' { return $true }
        'Plan replacement' { return $true }
        'Human review' { return $true }
        'Needs data' { return $true }
        'Retain, extend or upgrade' {
            $actionable = @('warranty_expired','warranty_expiring','os_unsupported','ram<8gb','hdd','storage<256gb')
            foreach ($x in @($Drivers)) {
                if ($actionable -contains $x) { return $true }
            }
            return $false
        }
    }
    return $false
}

function Get-NextAction {
    param([string]$Recommendation)
    switch ($Recommendation) {
        'Replace' { return 'Replace device' }
        'Plan replacement' { return 'Budget replacement this cycle; extend warranty or targeted upgrades as a bridge' }
        'Retain, extend or upgrade' { return 'Extend warranty and/or targeted upgrade (RAM/SSD/OS)' }
        'Needs data' { return 'Collect age, warranty, and OS data' }
        'Human review' { return 'Technician review (server)' }
    }
    return 'Review'
}

# ----- Phase 1: pull scoped endpoints and evaluate each -----

if ($AllCompanies) {
    Write-Verbose 'Scope: all companies'
    $endpoints = @(Get-CrCollection '/v2/odata/Endpoint')
}
else {
    $clauses = @($CompanyId | ForEach-Object { "companyId eq $([int]$_)" }) -join ' or '
    Write-Verbose "Scope: companyId filter [$($CompanyId -join ', ')]"
    $endpoints = @(Get-CrCollection ("/v2/odata/Endpoint?`$filter=$clauses"))
}

# Batch-pull custom properties for all scoped endpoints, keyed by companyEndpointId.
# EndpointCustomProperty exposes no top-level companyId (only companyEndpointId), so we filter by
# companyEndpointId in chunks of grouped OR clauses instead of one call per device. This turns the
# per-endpoint fetch (N devices = N calls) into ~N/chunk requests.
$propsByEndpoint = @{}
$endpointIds = @($endpoints |
    ForEach-Object { [string](Get-Field $_ 'companyEndpointId') } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique)

$customPropChunkSize = 40
for ($i = 0; $i -lt $endpointIds.Count; $i += $customPropChunkSize) {
    $chunk = @($endpointIds[$i..([Math]::Min($i + $customPropChunkSize - 1, $endpointIds.Count - 1))])
    $clause = @($chunk | ForEach-Object { "companyEndpointId eq $([int]$_)" }) -join ' or '
    $rows = @(Get-CrCollection ("/v2/odata/EndpointCustomProperty?`$filter=$clause"))
    foreach ($row in $rows) {
        $rid = [string](Get-Field $row 'companyEndpointId')
        if ([string]::IsNullOrWhiteSpace($rid)) { continue }
        if (-not $propsByEndpoint.ContainsKey($rid)) { $propsByEndpoint[$rid] = [System.Collections.Generic.List[object]]::new() }
        [void]$propsByEndpoint[$rid].Add($row)
    }
}

$productsByCompany = @{}
$recOrder = @('Replace','Plan replacement','Retain, extend or upgrade','Needs data','Human review')

$counts = [ordered]@{
    evaluated            = 0
    flaggedEndpoints     = 0
    companiesWithFlagged = 0
    cardsCreated         = 0
    cardsUpdated         = 0
    cardsSkipped         = 0
    errors               = 0
    replace              = 0
    planReplacement      = 0
    retainUpgrade        = 0
    needsData            = 0
    humanReview          = 0
}

# companyId -> list of flagged endpoint records
$flaggedByCompany = @{}

foreach ($ep in @($endpoints)) {
    $counts.evaluated++

    $name      = [string](Get-Field $ep 'name')
    $companyIdValue = [string](Get-Field $ep 'companyId')
    $ceid      = [string](Get-Field $ep 'companyEndpointId')
    $os        = [string](Get-Field $ep 'os')
    $edition   = [string](Get-Field $ep 'edition')

    $isServerVal = Get-Field $ep 'isServer'
    $isServer = $false
    if ($isServerVal -is [bool]) { $isServer = $isServerVal }
    elseif ($null -ne $isServerVal) { $isServer = ([string]$isServerVal -match '^(?i:true|1)$') }

    $props = @()
    if (-not [string]::IsNullOrWhiteSpace($ceid) -and $propsByEndpoint.ContainsKey($ceid)) {
        $props = @($propsByEndpoint[$ceid].ToArray())
    }

    $warrantyRaw = Get-Prop $props @('warranty','warrantyexpiration','warrantyenddate','warranty_expiration')
    $warrantyEnd = $null
    $parsedWarranty = [datetime]::MinValue
    if ($null -ne $warrantyRaw -and -not [string]::IsNullOrWhiteSpace([string]$warrantyRaw) -and [datetime]::TryParse([string]$warrantyRaw, [ref]$parsedWarranty)) {
        $warrantyEnd = $parsedWarranty
    }

    $estimated = $false
    $ageYears = Get-AgeYears $props $warrantyEnd ([ref]$estimated)
    $warranty = Get-WarrantyStatus $warrantyEnd
    $osSupport = Get-OsSupport $os $edition
    $ramGb = Get-NumericGb (Get-Prop $props @('ram','memory'))
    $storGb = Get-NumericGb (Get-Prop $props @('disk','storage'))
    $storType = Get-Prop $props @('disktype')

    $drivers = $null
    $rec = Get-Recommendation $isServer $ageYears $warranty $osSupport $ramGb $storType $storGb ([ref]$drivers)

    if (-not (Test-WarrantsAttention $rec $drivers)) { continue }

    $counts.flaggedEndpoints++
    switch ($rec) {
        'Replace' { $counts.replace++ }
        'Plan replacement' { $counts.planReplacement++ }
        'Retain, extend or upgrade' { $counts.retainUpgrade++ }
        'Needs data' { $counts.needsData++ }
        'Human review' { $counts.humanReview++ }
    }

    $ageText = if ($null -eq $ageYears) { 'age unknown' } elseif ($estimated) { "$ageYears yrs (estimated)" } else { "$ageYears yrs" }
    $osText = ("{0} {1}" -f $os, $edition).Trim()
    if ([string]::IsNullOrWhiteSpace($osText)) { $osText = 'unknown' }
    $driversText = if (@($drivers).Count -gt 0) { ($drivers -join ', ') } else { 'none' }

    $line = "{0} (ID {1}) - {2}, warranty {3}, OS '{4}' ({5}); drivers: {6}; next: {7}." -f `
        (ConvertTo-HtmlText $name), (ConvertTo-HtmlText $ceid), $ageText, $warranty, (ConvertTo-HtmlText $osText), $osSupport, (ConvertTo-HtmlText $driversText), (Get-NextAction $rec)

    if (-not $flaggedByCompany.ContainsKey($companyIdValue)) { $flaggedByCompany[$companyIdValue] = [System.Collections.Generic.List[object]]::new() }
    [void]$flaggedByCompany[$companyIdValue].Add([pscustomobject]@{
        recommendation = $rec
        line           = $line
    })
}

# ----- Phase 2: write exactly one card per company that has flagged endpoints -----

$counts.companiesWithFlagged = @($flaggedByCompany.Keys).Count
$firstError = $null
$results = [System.Collections.Generic.List[object]]::new()

foreach ($companyKey in @($flaggedByCompany.Keys)) {
    $flagged = @($flaggedByCompany[$companyKey].ToArray())
    try {
        $marker = "Refresh Plan Card: company $companyKey"

        $recCounts = [ordered]@{}
        foreach ($r in $recOrder) { $recCounts[$r] = @($flagged | Where-Object { $_.recommendation -eq $r }).Count }
        $summaryLine = "{0} endpoints out of spec: {1} Replace, {2} Plan replacement, {3} Retain/upgrade, {4} Needs data, {5} Human review." -f `
            $flagged.Count, $recCounts['Replace'], $recCounts['Plan replacement'], $recCounts['Retain, extend or upgrade'], $recCounts['Needs data'], $recCounts['Human review']

        $sb = [System.Text.StringBuilder]::new()
        [void]$sb.Append("<p>$marker</p>")
        [void]$sb.Append("<p>Generated $($runDate.ToString('yyyy-MM-dd HH:mm')) UTC. $summaryLine</p>")
        foreach ($r in $recOrder) {
            $items = @($flagged | Where-Object { $_.recommendation -eq $r })
            if (@($items).Count -eq 0) { continue }
            [void]$sb.Append("<p><strong>$r ($($items.Count))</strong></p>")
            if ($r -eq 'Human review') {
                [void]$sb.Append("<p><em>Requires manual human review: a technician must assess these devices (servers) and decide next steps. They are not auto-scheduled for replacement.</em></p>")
            }
            [void]$sb.Append("<ul>")
            foreach ($it in $items) { [void]$sb.Append("<li>$($it.line)</li>") }
            [void]$sb.Append("</ul>")
        }
        $body = $sb.ToString()

        # Reconcile: find this company's existing plan card (deterministic subject or body marker).
        if (-not $productsByCompany.ContainsKey($companyKey)) {
            $productsByCompany[$companyKey] = @(Get-CrCollection ("/v2/odata/Product?`$filter=companyId eq $([int]$companyKey)"))
        }
        $existing = @($productsByCompany[$companyKey])
        $planCard = @($existing | Where-Object {
            $subj = [string](Get-Field $_ 'subject')
            $bdy  = [string](Get-Field $_ 'body')
            ($subj.Trim() -eq $Subject) -or ($bdy -and $bdy.Contains($marker))
        } | Select-Object -First 1)

        if (@($planCard).Count -gt 0) {
            $cardId = Get-Field $planCard[0] 'productId'
            if ($PSCmdlet.ShouldProcess("company $companyKey", "update refresh-plan card (productId $cardId)")) {
                $patch = @(
                    @{ op = 'replace'; path = '/subject'; value = $Subject },
                    @{ op = 'replace'; path = '/body'; value = $body },
                    @{ op = 'replace'; path = '/summary'; value = $summaryLine },
                    @{ op = 'replace'; path = '/category'; value = $Category },
                    @{ op = 'replace'; path = '/productCategoryId'; value = $ProductCategoryId }
                )
                $null = Invoke-CrApi -Path ($ProductPatchPath -replace '\{id\}', [string]$cardId) -Method 'PATCH' -Body $patch -ContentType 'application/json-patch+json'
                $counts.cardsUpdated++
                [void]$results.Add([pscustomobject]@{ companyId = $companyKey; action = 'updated'; productId = $cardId; flaggedCount = $flagged.Count; note = $summaryLine })
            }
            else {
                $counts.cardsSkipped++
                [void]$results.Add([pscustomobject]@{ companyId = $companyKey; action = 'would-update'; productId = $cardId; flaggedCount = $flagged.Count; note = $summaryLine })
            }
        }
        else {
            if ($PSCmdlet.ShouldProcess("company $companyKey", 'create refresh-plan card')) {
                $createBody = [ordered]@{
                    companyId         = [int]$companyKey
                    productCategoryId = $ProductCategoryId
                    subject           = $Subject
                    category          = $Category
                    datePublished     = $publishDate
                    body              = $body
                    summary           = $summaryLine
                    isRequired        = $false
                    isShowPrice       = $false
                }
                $new = Invoke-CrApi -Path $ProductCreatePath -Method 'POST' -Body $createBody
                $newId = $null
                if ($new) {
                    $newId = Get-Field $new 'productId'
                    if ($null -eq $newId) { $dataProp = Get-Field $new 'data'; if ($dataProp) { $newId = Get-Field $dataProp 'productId' } }
                }
                $counts.cardsCreated++
                [void]$results.Add([pscustomobject]@{ companyId = $companyKey; action = 'created'; productId = $newId; flaggedCount = $flagged.Count; note = $summaryLine })
            }
            else {
                $counts.cardsSkipped++
                [void]$results.Add([pscustomobject]@{ companyId = $companyKey; action = 'would-create'; productId = $null; flaggedCount = $flagged.Count; note = $summaryLine })
            }
        }
    }
    catch {
        $counts.errors++
        if ($null -eq $firstError) { $firstError = $_.Exception.Message }
        [void]$results.Add([pscustomobject]@{ companyId = $companyKey; action = 'error'; productId = $null; flaggedCount = @($flagged).Count; note = $_.Exception.Message })
    }
}

# ----- Console summary -----

$scopeText = if ($AllCompanies) { 'all companies' } else { "companyId filter [$($CompanyId -join ', ')]" }
Write-Host ''
Write-Host 'Endpoint Refresh Advisor' -ForegroundColor Cyan
Write-Host "Scope: $scopeText"
Write-Host ("Evaluated {0} endpoints; flagged {1} across {2} companies." -f $counts.evaluated, $counts.flaggedEndpoints, $counts.companiesWithFlagged)
Write-Host ("  Replace: {0}  Plan replacement: {1}  Retain/upgrade: {2}  Needs data: {3}  Human review: {4}" -f `
    $counts.replace, $counts.planReplacement, $counts.retainUpgrade, $counts.needsData, $counts.humanReview)
if ($WhatIfPreference) {
    Write-Host ("Cards (dry run) that would be created/updated: {0}" -f $counts.cardsSkipped) -ForegroundColor Yellow
}
else {
    Write-Host ("Cards created: {0}  updated: {1}  errors: {2}" -f $counts.cardsCreated, $counts.cardsUpdated, $counts.errors) `
        -ForegroundColor $(if ($counts.errors -gt 0) { 'Red' } else { 'Green' })
}
if ($firstError) { Write-Host "First error: $firstError" -ForegroundColor Red }

# Emit a result object for pipeline/automation use.
[pscustomobject]@{
    scope     = $scopeText
    counts    = [pscustomobject]$counts
    firstError = $firstError
    results   = @($results.ToArray())
}
