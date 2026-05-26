# Secure Score to Assessment — Import Microsoft Secure Scores as CloudRadial Assessments

## Why This Matters

Microsoft Secure Score gives you a detailed breakdown of a tenant's security posture — what's enabled, what's missing, and how much each gap affects the overall score. But there's no built-in way to get that data into CloudRadial as an Assessment that you can present to clients, track over time, or use to drive remediation conversations.

Without this script, you'd need to manually create each assessment question, copy over each improvement action, set the compliance status, and calculate risk — for potentially hundreds of items. That's hours of copy-paste work per tenant.

This script automates the entire conversion. Export Secure Scores from the CloudRadial portal, run the script, and import the result as an Assessment. Every improvement action becomes an assessment question with the correct compliance status, risk level, and pre-written notes — ready for your next client review.

## Who This Is For

**Partners running security assessments** — Turn Microsoft's Secure Score data into a professional CloudRadial Assessment without any manual data entry.

**Partners preparing for QBRs** — Generate a current-state security assessment in minutes. Walk clients through what's compliant, what's not, and what the impact is.

**Partners onboarding new clients** — Run a Secure Score export on day one and immediately have a baseline security assessment in CloudRadial to track improvements against.

**Partners standardizing assessments across tenants** — Use the same script for every tenant. Consistent format, consistent categories, consistent scoring.

## What You'll Need

- PowerShell 5.1 or later
- The [ImportExcel](https://github.com/dfinke/ImportExcel) module (the script auto-installs it if missing)
- A Secure Score export from CloudRadial's Admin > Secure Score page (.xlsx format)
- Access to CloudRadial's Content > Assessments > Import

## Step 1: Export Secure Scores from CloudRadial

1. Log in to your CloudRadial portal
2. Navigate to **Admin** > **Secure Score** and select the company
3. Click **Export** to download the .xlsx file
4. Save it somewhere accessible (e.g., your desktop or a project folder)

The export file should contain columns: `Rank`, `Improvement Action`, `Score Impact`, `Points Achieved`, `Status`, `Category`, `Service`.

## Step 2: Do a Dry Run

Before generating the import file, preview what the script will produce:

```powershell
.\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx" -WhatIf
```

This shows:
- How many assessment questions will be created
- The compliance breakdown (Compliant vs. Not Compliant)
- Category-by-category summary (Identity, Device, Apps, Data)

No files are written in `-WhatIf` mode.

## Step 3: Generate the Assessment Import File

Once the dry run looks right, generate the file:

```powershell
.\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx"
```

The script creates `Assessment-Import-SecureScores-Contoso-20260504.xlsx` in the current directory.

To specify a custom output path or assessment name:

```powershell
.\Convert-SecureScoreToAssessment.ps1 -InputFile "SecureScores-Contoso-20260504.xlsx" `
    -AssessmentName "Contoso Security Review" `
    -OutputFile "C:\Assessments\Contoso-Security.xlsx"
```

## Step 4: Import into CloudRadial

1. Log in to the CloudRadial portal
2. Navigate to **Content** > **Assessments**
3. Click **Import**
4. Upload the generated .xlsx file
5. Review the imported assessment — all questions, categories, and compliance statuses should be populated

## What Gets Mapped

| Secure Score Field       | CloudRadial Assessment Field | Notes                                                    |
|--------------------------|------------------------------|----------------------------------------------------------|
| Improvement Action       | Question                     | Each action becomes an assessment question                |
| Category                 | Category                     | Identity, Device, Apps, Data                             |
| Status (True/False)      | Answer + Evaluation          | True → "Compliant", False → "Not Compliant"              |
| Score Impact             | Explanation, Risk, Notes     | Used to calculate risk level and populate note templates  |
| Service                  | Reference, Explanation       | Identifies the Microsoft service (MDATP, Azure AD, etc.) |
| Points Achieved          | Explanation                  | Shown in the explanation for context                      |

### Risk Calculation

- **High** — Not Compliant and Score Impact ≥ 0.5%
- **Medium** — Not Compliant and Score Impact < 0.5%
- **Low** — Compliant

### Pre-Written Notes

Each answer option gets a note template so that when you review the assessment in CloudRadial, the notes are already populated:

- **Compliant**: "This control is currently enabled and meeting Microsoft's recommendation."
- **Not Compliant**: "This control is not yet enabled. Enabling it would improve your Secure Score by approximately X%."
- **Partially Compliant**: "This control is partially configured. Review the Microsoft 365 Defender portal for details."
- **N/A**: "This control does not apply to your current environment."
- **Missing**: "Unable to determine the status of this control. Manual review recommended."

## Customization Tips

### Change the assessment name

Use `-AssessmentName` to set a client-specific label:

```powershell
.\Convert-SecureScoreToAssessment.ps1 -InputFile "scores.xlsx" -AssessmentName "Acme Corp - Q2 2026 Security Review"
```

### Modify risk thresholds

Edit the `ConvertTo-AssessmentRow` function in the script. The risk logic is in one block:

```powershell
$risk = if (-not $isCompliant -and $scorePercent -ge 0.5) { "High" }
        elseif (-not $isCompliant) { "Medium" }
        else { "Low" }
```

Change `0.5` to a different threshold, or add a "Critical" tier for high-impact items.

### Customize note templates

The five `Note *` fields in `ConvertTo-AssessmentRow` can be edited to match your Partner's tone or include specific remediation guidance.

### Filter by category or service

To generate an assessment for only a subset of items, filter the input after reading:

```powershell
# Example: only Identity items
$secureScores = Import-Excel -Path $InputFile | Where-Object { $_.Category -eq 'Identity' }
```

## Troubleshooting

**"ImportExcel module not found"**
The script tries to auto-install it. If that fails (e.g., restricted execution policy), install manually:
```powershell
Install-Module ImportExcel -Scope CurrentUser
```

**"Input file is missing required columns"**
The Secure Score export format may vary. Verify your export has these exact column headers: `Rank`, `Improvement Action`, `Score Impact`, `Points Achieved`, `Status`, `Category`, `Service`.

**"No data found in the input file"**
The .xlsx file exists but contains no data rows. Open it and check that there's data below the header row.

**Assessment imports but all items show as "Not Compliant"**
Check the `Status` column in your Secure Score export. The script expects boolean values (`True`/`False`). If your export uses different values (e.g., "Completed"/"To address"), you'll need to adjust the mapping in `ConvertTo-AssessmentRow`.

**Categories appear in unexpected order**
The script sorts by: Identity → Device → Apps → Data. If your export contains a category not in this list, it sorts to the end. Add it to the `$categoryOrder` hashtable in the Configuration section.

## Support

For script bugs or feature requests, open an issue in this repository.

For CloudRadial product questions, contact the CloudRadial Customer Success team.
