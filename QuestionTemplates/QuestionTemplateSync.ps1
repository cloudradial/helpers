#Requires -Version 5.1
param(
    [Parameter(Mandatory)]
    [ValidateSet('List','Export','Import','Test')]
    [string]$Action,
    
    [Parameter(Mandatory)]
    [string]$PublicKey,
    
    [Parameter(Mandatory)]
    [string]$PrivateKey,
    
    [string]$ApiUrl = "https://api.us.cloudradial.com",
    
    [int]$TemplateId,
    [string]$TemplateName,
    [string]$FilePath
)

$ErrorActionPreference = 'Stop'

$authString = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$PublicKey`:$PrivateKey"))
$headers = @{
    'Authorization' = "Basic $authString"
    'Content-Type'  = 'application/json'
    'Accept'        = 'application/json'
}
$postHeaders = @{
    'Authorization' = "Basic $authString"
    'Content-Type'  = 'application/json;odata.metadata=minimal;odata.streaming=true'
    'Accept'        = 'application/json;odata.metadata=minimal;odata.streaming=true'
}

function Get-AllCatalogItems {
    $allItems = @()
    $skip = 0
    do {
        $uri = "$ApiUrl/v2/odata/Catalog?`$top=100&`$skip=$skip"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        $items = if ($response.value) { $response.value } else { $response }
        if ($items.Count -eq 0) { break }
        $allItems += $items
        $skip += $items.Count
    } while ($items.Count -eq 100)
    return $allItems
}

function Get-AllQuestions {
    $allItems = @()
    $skip = 0
    do {
        $uri = "$ApiUrl/v2/odata/CatalogQuestion?`$top=100&`$skip=$skip"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        $items = if ($response.value) { $response.value } else { $response }
        if ($items.Count -eq 0) { break }
        $allItems += $items
        $skip += $items.Count
    } while ($items.Count -eq 100)
    return $allItems
}

switch ($Action) {
    'Test' {
        if (-not $FilePath -or -not (Test-Path $FilePath)) { throw "Specify valid -FilePath" }
        
        $import = Get-Content $FilePath -Raw | ConvertFrom-Json
        Write-Host "`n=== Testing adding questions incrementally ===" -ForegroundColor Cyan
        
        $questionsArray = @()
        
        foreach ($q in $import.Questions) {
            $newQ = @{
                label = $q.label
                type = $q.type
                order = $q.order
            }
            if ($q.options) { $newQ['options'] = $q.options }
            if ($q.info) { $newQ['info'] = $q.info }
            if ($q.defaultValue) { $newQ['defaultValue'] = $q.defaultValue }
            
            $questionsArray += $newQ
            
            $testTemplate = @{
                companyId = 1
                catalogUsage = "Template"
                subject = "COMBO TEST $($questionsArray.Count)Q - " + (Get-Date).ToString("HHmmss")
                category = "General"
                questions = $questionsArray
            }
            
            $body = $testTemplate | ConvertTo-Json -Depth 10
            
            Write-Host "`nTesting with $($questionsArray.Count) question(s) (adding Q$($q.order))..." -ForegroundColor Yellow
            
            try {
                $r = Invoke-RestMethod -Uri "$ApiUrl/v2/catalog" -Headers $postHeaders -Method Post -Body $body -ErrorAction Stop
                Write-Host "  OK - ID: $($r.data.companyCatalogId)" -ForegroundColor Green
            } catch {
                Write-Host "  FAILED at $($questionsArray.Count) questions!" -ForegroundColor Red
                Write-Host "  Last added: Q$($q.order) $($q.label)" -ForegroundColor Red
                break
            }
        }
    }
    
    'List' {
        Write-Host "`n=== All Catalog Items ===" -ForegroundColor Cyan
        $allItems = Get-AllCatalogItems
        
        # Look for our imported template
        Write-Host "`nSearching for ID 923 or 'COPY'..." -ForegroundColor Yellow
        $found = $allItems | Where-Object { $_.companyCatalogId -eq 923 -or $_.subject -like "*COPY*" }
        
        if ($found) {
            foreach ($f in $found) {
                Write-Host "`n  ID: $($f.companyCatalogId)" -ForegroundColor Green
                Write-Host "  Subject: $($f.subject)"
                Write-Host "  catalogUsage: $($f.catalogUsage)"
                Write-Host "  companyId: $($f.companyId)"
                Write-Host "  isDeleted: $($f.isDeleted)"
            }
        } else {
            Write-Host "  Not found in API results" -ForegroundColor Red
        }
        
        Write-Host "`n=== Question Templates (catalogUsage='Template') ===" -ForegroundColor Cyan
        $templates = $allItems | Where-Object { $_.catalogUsage -eq 'Template' }
        Write-Host "Found $($templates.Count) template(s)`n" -ForegroundColor Green
        foreach ($t in $templates) {
            Write-Host "  [$($t.companyCatalogId)] $($t.subject)" -ForegroundColor Yellow
        }
    }
    
    'Export' {
        if (-not $TemplateId -and -not $TemplateName) { throw "Specify -TemplateId or -TemplateName" }
        
        $allItems = Get-AllCatalogItems
        $templates = $allItems | Where-Object { $_.catalogUsage -eq 'Template' }
        $template = if ($TemplateId) { $templates | Where-Object { $_.companyCatalogId -eq $TemplateId } }
                    else { $templates | Where-Object { $_.subject -eq $TemplateName } }
        
        if (-not $template) { throw "Template not found" }
        
        Write-Host "`n=== Exporting: $($template.subject) ===" -ForegroundColor Cyan
        
        $allQuestions = Get-AllQuestions
        $templateQuestions = $allQuestions | Where-Object { $_.companyCatalogId -eq $template.companyCatalogId }
        
        Write-Host "Questions: $($templateQuestions.Count)" -ForegroundColor Green
        
        $export = @{
            ExportDate = (Get-Date).ToString('o')
            Template = $template
            Questions = @($templateQuestions | Sort-Object order)
        }
        
        $outFile = if ($FilePath) { $FilePath } else { ".\$($template.subject -replace '[^\w\-]','_').json" }
        $export | ConvertTo-Json -Depth 10 | Out-File -FilePath $outFile -Encoding UTF8
        Write-Host "Exported to: $outFile" -ForegroundColor Green
    }
    
    'Import' {
        if (-not $FilePath -or -not (Test-Path $FilePath)) { throw "Specify valid -FilePath" }
        
        $import = Get-Content $FilePath -Raw | ConvertFrom-Json
        $newName = $import.Template.subject + " - COPY " + (Get-Date).ToString("MMdd-HHmmss")
        Write-Host "`n=== Importing: $newName ===" -ForegroundColor Cyan
        
        # Step 1: Create blank template with all important fields
        Write-Host "`nStep 1: Creating template..." -ForegroundColor Yellow
        $newTemplate = @{
            companyId = $import.Template.companyId
            catalogUsage = "Template"
            subject = $newName
            category = if ($import.Template.category) { $import.Template.category } else { "General" }
            groups = @(@{ groupName = "Everyone" })  # Required for visibility
            isAllowedCompanyChanges = $import.Template.isAllowedCompanyChanges
        }
        
        # Add PSA defaults if present
        if ($import.Template.psaBoard) { $newTemplate['psaBoard'] = $import.Template.psaBoard }
        if ($import.Template.psaStatus) { $newTemplate['psaStatus'] = $import.Template.psaStatus }
        if ($import.Template.psaPriority) { $newTemplate['psaPriority'] = $import.Template.psaPriority }
        if ($import.Template.teamsWebhook) { $newTemplate['teamsWebhook'] = $import.Template.teamsWebhook }
        if ($import.Template.teamsPartnerWebhook) { $newTemplate['teamsPartnerWebhook'] = $import.Template.teamsPartnerWebhook }
        
        $body = $newTemplate | ConvertTo-Json -Depth 10
        
        try {
            $templateResult = Invoke-RestMethod -Uri "$ApiUrl/v2/catalog" -Headers $postHeaders -Method Post -Body $body -ErrorAction Stop
            $newCatalogId = $templateResult.data.companyCatalogId
            Write-Host "  Created template ID: $newCatalogId" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to create template" -ForegroundColor Red
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            return
        }
        
        # Step 2: Create questions and track ID mapping
        Write-Host "`nStep 2: Creating questions..." -ForegroundColor Yellow
        $idMap = @{}  # oldId -> newId
        
        foreach ($q in ($import.Questions | Sort-Object order)) {
            $newQ = @{
                companyId = $import.Template.companyId
                companyCatalogId = $newCatalogId
                label = $q.label
                type = $q.type
                order = $q.order
            }
            if ($q.options) { $newQ['options'] = $q.options }
            if ($q.info) { $newQ['info'] = $q.info }
            if ($q.defaultValue) { $newQ['defaultValue'] = $q.defaultValue }
            if ($q.placeholder) { $newQ['placeholder'] = $q.placeholder }
            if ($q.isRequired) { $newQ['isRequired'] = $true }
            if ($q.isSubject) { $newQ['isSubject'] = $true }
            if ($q.isDescription) { $newQ['isDescription'] = $true }
            if ($q.isIncludeInTicket -eq $false) { $newQ['isIncludeInTicket'] = $false }
            if ($q.customFieldName) { $newQ['customFieldName'] = $q.customFieldName }
            
            $qBody = $newQ | ConvertTo-Json -Depth 10
            
            try {
                $qResult = Invoke-RestMethod -Uri "$ApiUrl/v2/catalogquestion" -Headers $postHeaders -Method Post -Body $qBody -ErrorAction Stop
                $newQId = $qResult.data.companyCatalogQuestionId
                $idMap[$q.companyCatalogQuestionId] = $newQId
                Write-Host "  [$($q.order)] $($q.label) -> ID: $newQId" -ForegroundColor Green
            } catch {
                Write-Host "  [$($q.order)] $($q.label) - FAILED" -ForegroundColor Red
                Write-Host "    $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        
        # Step 3: Update questions with remapped childQuestionIds
        Write-Host "`nStep 3: Setting up conditional logic..." -ForegroundColor Yellow
        $hasConditionals = $false
        
        foreach ($q in $import.Questions) {
            if ($q.childQuestionIds) {
                $hasConditionals = $true
                $oldIds = $q.childQuestionIds -split ',' | ForEach-Object { $_.Trim() }
                $newIds = @()
                
                foreach ($oldId in $oldIds) {
                    if ($idMap.ContainsKey([int]$oldId)) {
                        $newIds += $idMap[[int]$oldId]
                    }
                }
                
                if ($newIds.Count -gt 0) {
                    $newChildIds = $newIds -join ','
                    $parentNewId = $idMap[$q.companyCatalogQuestionId]
                    
                    # PATCH the question with childQuestionIds
                    $patchBody = @{
                        childQuestionIds = $newChildIds
                    } | ConvertTo-Json
                    
                    try {
                        $null = Invoke-RestMethod -Uri "$ApiUrl/v2/catalogquestion/$parentNewId" -Headers $postHeaders -Method Patch -Body $patchBody -ErrorAction Stop
                        Write-Host "  Q$($q.order) -> children: $newChildIds" -ForegroundColor Green
                    } catch {
                        Write-Host "  Q$($q.order) - Failed to set children: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
                    }
                }
            }
        }
        
        if (-not $hasConditionals) {
            Write-Host "  No conditional logic to configure" -ForegroundColor DarkGray
        }
        
        Write-Host "`n=== Import Complete ===" -ForegroundColor Cyan
        Write-Host "New template ID: $newCatalogId" -ForegroundColor Green
        Write-Host "Questions created: $($idMap.Count)" -ForegroundColor Green
    }
}
