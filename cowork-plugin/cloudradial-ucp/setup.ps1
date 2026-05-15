# CloudRadial UCP Plugin - Setup Script
# Prompts for your Azure Function name and key, then updates all skill files automatically.
#
# Usage:
#   cd cloudradial-ucp
#   .\setup.ps1

Write-Host ""
Write-Host "=== CloudRadial UCP Plugin Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will configure the plugin with your Azure Function URL and key."
Write-Host "You need two things from your Azure deployment:"
Write-Host "  1. Your function app name (e.g., my-cloudradial-mcp)"
Write-Host "  2. Your function key (from: az functionapp keys list)"
Write-Host ""

# Prompt for function app name
$funcName = Read-Host "Enter your Azure Function app name (just the name, not the full URL)"
$funcName = $funcName.Trim()

if ([string]::IsNullOrWhiteSpace($funcName)) {
    Write-Host "Error: Function app name cannot be empty." -ForegroundColor Red
    exit 1
}

# Strip .azurewebsites.net if they pasted the full URL
$funcName = $funcName -replace "\.azurewebsites\.net.*", ""
$funcName = $funcName -replace "https?://", ""
$funcName = $funcName -replace "/.*", ""

# Prompt for function key
$funcKey = Read-Host "Enter your Azure Function key"
$funcKey = $funcKey.Trim()

if ([string]::IsNullOrWhiteSpace($funcKey)) {
    Write-Host "Error: Function key cannot be empty." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuring with:" -ForegroundColor Yellow
Write-Host "  Function URL: https://$funcName.azurewebsites.net"
Write-Host "  Function Key: $($funcKey.Substring(0, [Math]::Min(8, $funcKey.Length)))..."
Write-Host ""

# All 11 skill files to update
$skillFiles = @(
    "skills\setup\SKILL.md",
    "skills\portal-setup\SKILL.md",
    "skills\portal-lookup\SKILL.md",
    "skills\content-management\SKILL.md",
    "skills\user-management\SKILL.md",
    "skills\endpoint-reporting\SKILL.md",
    "skills\course-management\SKILL.md",
    "skills\assessment-compliance\SKILL.md",
    "skills\feedback-analysis\SKILL.md",
    "skills\service-management\SKILL.md",
    "skills\reporting-admin\SKILL.md"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$updated = 0
$skipped = 0
$errors = 0

foreach ($file in $skillFiles) {
    $filePath = Join-Path $scriptDir $file

    if (-not (Test-Path $filePath)) {
        Write-Host "  WARNING: $file not found - skipping" -ForegroundColor Yellow
        $errors++
        continue
    }

    $content = Get-Content $filePath -Raw
    $original = $content

    # Replace placeholder function name
    $content = $content -replace "YOUR-FUNCTION-NAME", $funcName

    # Replace placeholder function key
    $content = $content -replace "YOUR_FUNCTION_KEY", $funcKey

    if ($content -eq $original) {
        if ($content -match "YOUR-FUNCTION-NAME|YOUR_FUNCTION_KEY") {
            Write-Host "  WARNING: $file still has placeholders after replacement" -ForegroundColor Yellow
            $errors++
        } else {
            Write-Host "  SKIP: $file (already configured)" -ForegroundColor DarkGray
            $skipped++
        }
    } else {
        Set-Content -Path $filePath -Value $content -NoNewline
        Write-Host "  DONE: $file" -ForegroundColor Green
        $updated++
    }
}

Write-Host ""

# Verify no placeholders remain
$remaining = 0
foreach ($file in $skillFiles) {
    $filePath = Join-Path $scriptDir $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        if ($content -match "YOUR-FUNCTION-NAME|YOUR_FUNCTION_KEY") {
            Write-Host "WARNING: $file still contains placeholders!" -ForegroundColor Red
            $remaining++
        }
    }
}

Write-Host ""
Write-Host "Results: $updated updated, $skipped already configured, $errors warnings" -ForegroundColor Cyan

if ($remaining -gt 0) {
    Write-Host ""
    Write-Host "Setup completed with warnings. Check the files above." -ForegroundColor Yellow
} elseif ($errors -gt 0) {
    Write-Host "Setup completed with warnings." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "All 11 skill files configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Build the plugin:  ./scripts/build-plugin.sh"
    Write-Host "  2. Drag the .plugin file into Claude Desktop (Cowork mode)"
    Write-Host "  3. Say 'Set up CloudRadial' to test the connection"
    Write-Host ""
}
