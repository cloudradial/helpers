<#
.SYNOPSIS
    Convert a Microsoft Secure Score export into a CloudRadial Assessment import file.

.DESCRIPTION
    Reads a Secure Score .xlsx export and maps each improvement action into the
    CloudRadial Assessment import template format. Status-based compliance mapping
    (True = Compliant, False = Not Compliant), organized by Secure Score category
    (Identity, Device, Apps, Data).

    Produces a ready-to-import .xlsx file that can be uploaded directly via
    Content > Assessments > Import in the CloudRadial portal.

    Requires the ImportExcel PowerShell module. If not installed, the script will
    attempt to install it automatically for the current user.

.PARAMETER InputFile
    Mandatory. Path to the Secure Score .xlsx export file. The file must contain
    columns: Rank, Improvement Action, Score Impact, Points Achieved, Status,
    Category, Service.

.PARAMETER OutputFile
    Optional. Path for the generated CloudRadial Assessment import .xlsx file.
    Defaults to "Assessment-Import-<InputFileName>.xlsx" in the current directory.

.PARAMETER AssessmentName
    Optional. Name used in the Checklist column to identify this assessment group.
    Defaults to "Microsoft Secure Score".

.PARAMETER WhatIf
    Preview the conversion without writing an output file. Shows what would be
    generated, including category breakdown and compliance summary.

.EXAMPLE
    PS> .\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx"

.EXAMPLE
    PS> .\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx" -WhatIf

.EXAMPLE
    PS> .\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx" `
        -AssessmentName "Contoso Secure Score" -OutputFile "Contoso-Assessment.xlsx"

.NOTES
    Author:  Nick Westgate
    Version: 1.0
    Date:    2026-05-04
    Requires: ImportExcel module (auto-installed if missing)
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$InputFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile,

    [Parameter(Mandatory = $false)]
    [string]$AssessmentName = "Microsoft Secure Score",

    [switch]$WhatIf
)

# ============================================================================
# Configuration
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$requiredColumns = @('Rank', 'Improvement Action', 'Score Impact', 'Points Achieved', 'Status', 'Category', 'Service')

$categoryOrder = @{
    'Identity' = 1
    'Device'   = 2
    'Apps'     = 3
    'Data'     = 4
}

$templateColumns = @(
    'Partner Notes', 'Monthly Unit Cost', 'Project Unit Cost',
    'Psa Board', 'Psa Item', 'Psa Status', 'Psa Category', 'Psa Sub Type',
    'Psa Type', 'Psa Priority', 'Psa Source', 'Psa Estimated Time',
    'Email List', 'Teams Webhook', 'Slack Webhook', 'Flow Webhook',
    'Json Webhook', 'Script', 'Checklist', 'Category', 'Question', 'Order',
    'Explanation', 'Type', 'Answer', 'Text Answer', 'Responses',
    'Is Flagged', 'Notes', 'Evaluation', 'Remediation Summary', 'Remediation',
    'Reference', 'Monthly Units', 'Monthly Unit Price', 'Project Units',
    'Project Unit Price', 'Control Type', 'Likelihood', 'Risk', 'Risk Cost',
    'Risk Impact', 'Owner', 'Updated by', 'Update Key', 'Content Update Key',
    'Note Compliant', 'Note Partially Compliant', 'Note NA', 'Note Missing',
    'Note Not Compliant'
)

# ============================================================================
# Helper Functions
# ============================================================================

function Confirm-ImportExcelModule {
    if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
        Write-Host "ImportExcel module not found. Installing for current user..." -ForegroundColor Yellow
        try {
            Install-Module ImportExcel -Scope CurrentUser -Force -ErrorAction Stop
        }
        catch {
            Write-Error "Failed to install ImportExcel. Run 'Install-Module ImportExcel -Scope CurrentUser' manually."
            exit 1
        }
    }
    Import-Module ImportExcel -ErrorAction Stop
}

function Confirm-CsvColumns {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Data,

        [Parameter(Mandatory = $true)]
        [string[]]$RequiredColumns
    )

    $actualColumns = $Data[0].PSObject.Properties.Name
    $missing = $RequiredColumns | Where-Object { $_ -notin $actualColumns }

    if ($missing) {
        Write-Error "Input file is missing required columns: $($missing -join ', ')"
        exit 1
    }
}

function ConvertTo-AssessmentRow {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Item,

        [Parameter(Mandatory = $true)]
        [int]$Order,

        [Parameter(Mandatory = $true)]
        [string]$ChecklistName
    )

    $isCompliant = [bool]$Item.Status
    $answer = if ($isCompliant) { "Compliant" } else { "Not Compliant" }
    $isFlagged = if ($isCompliant) { "FALSE" } else { "TRUE" }
    $scorePercent = if ($Item.'Score Impact' -gt 0) { [math]::Round($Item.'Score Impact' * 100, 2) } else { 0 }

    $risk = if (-not $isCompliant -and $scorePercent -ge 0.5) { "High" }
            elseif (-not $isCompliant) { "Medium" }
            else { "Low" }

    $row = [ordered]@{}
    foreach ($col in $script:templateColumns) { $row[$col] = $null }

    $row['Checklist']               = $ChecklistName
    $row['Category']                = $Item.Category
    $row['Question']                = $Item.'Improvement Action'
    $row['Order']                   = $Order
    $row['Explanation']             = "Service: $($Item.Service) | Score Impact: $scorePercent% | Points Achieved: $($Item.'Points Achieved')"
    $row['Type']                    = "Compliance"
    $row['Answer']                  = $answer
    $row['Responses']               = "Compliant,Not Compliant,Partially Compliant,N/A,Missing"
    $row['Is Flagged']              = $isFlagged
    $row['Evaluation']              = $answer
    $row['Reference']               = "Microsoft Secure Score - $($Item.Service)"
    $row['Control Type']            = "Technical"
    $row['Risk']                    = $risk
    $row['Note Compliant']          = "This control is currently enabled and meeting Microsoft's recommendation."
    $row['Note Not Compliant']      = "This control is not yet enabled. Enabling it would improve your Secure Score by approximately $scorePercent%."
    $row['Note Partially Compliant'] = "This control is partially configured. Review the Microsoft 365 Defender portal for details."
    $row['Note NA']                 = "This control does not apply to your current environment."
    $row['Note Missing']            = "Unable to determine the status of this control. Manual review recommended."

    [PSCustomObject]$row
}

function Show-Summary {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Rows
    )

    $compliant = ($Rows | Where-Object { $_.Answer -eq "Compliant" }).Count
    $notCompliant = ($Rows | Where-Object { $_.Answer -eq "Not Compliant" }).Count

    Write-Host ""
    Write-Host "Conversion summary:" -ForegroundColor Cyan
    Write-Host "  Assessment name: $AssessmentName" -ForegroundColor White
    Write-Host "  Total questions: $($Rows.Count)" -ForegroundColor White
    Write-Host "  Compliant:       $compliant" -ForegroundColor Green
    Write-Host "  Not Compliant:   $notCompliant" -ForegroundColor Red
    Write-Host ""
    Write-Host "Breakdown by category:" -ForegroundColor Cyan

    $Rows | Group-Object -Property Category | ForEach-Object {
        $catCompliant = ($_.Group | Where-Object { $_.Answer -eq "Compliant" }).Count
        Write-Host "  $($_.Name): $catCompliant/$($_.Count) compliant" -ForegroundColor White
    }
}

# ============================================================================
# Main
# ============================================================================

Confirm-ImportExcelModule

$InputFile = Resolve-Path $InputFile
if (-not $OutputFile) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($InputFile)
    $OutputFile = Join-Path (Get-Location) "Assessment-Import-$baseName.xlsx"
}

Write-Host "Reading Secure Score export: $InputFile" -ForegroundColor Cyan
$secureScores = Import-Excel -Path $InputFile

if (-not $secureScores -or $secureScores.Count -eq 0) {
    Write-Error "No data found in the input file."
    exit 1
}

Confirm-CsvColumns -Data $secureScores -RequiredColumns $requiredColumns
Write-Host "Found $($secureScores.Count) improvement actions." -ForegroundColor Cyan

# Sort by category priority, then by Rank within each category
$sorted = $secureScores | Sort-Object @(
    @{ Expression = { if ($categoryOrder.ContainsKey($_.Category)) { $categoryOrder[$_.Category] } else { 99 } } },
    @{ Expression = { $_.Rank } }
)

# Build assessment rows
$orderCounter = 0
$assessmentRows = foreach ($item in $sorted) {
    $orderCounter++
    ConvertTo-AssessmentRow -Item $item -Order $orderCounter -ChecklistName $AssessmentName
}

# WhatIf: preview only
if ($WhatIf) {
    Write-Host ""
    Write-Host "What if: Would create $($assessmentRows.Count) assessment questions in $OutputFile" -ForegroundColor Yellow
    Show-Summary -Rows $assessmentRows
    Write-Host ""
    Write-Host "Run without -WhatIf to generate the file." -ForegroundColor Yellow
    exit 0
}

# Export
if (Test-Path $OutputFile) {
    Remove-Item $OutputFile -Force
}

$assessmentRows | Export-Excel -Path $OutputFile -WorksheetName "Assessment" -AutoSize -FreezeTopRow -BoldTopRow

Write-Host ""
Write-Host "Assessment import file created: $OutputFile" -ForegroundColor Green
Show-Summary -Rows $assessmentRows
Write-Host ""
Write-Host "Import this file into CloudRadial via: Content > Assessments > Import" -ForegroundColor Yellow
