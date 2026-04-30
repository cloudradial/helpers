# Question Template Sync — Export and Import Service Catalog Templates

## The Problem

When Partners build a well-tuned service request form in CloudRadial's Service Catalog with conditional logic, approval flows, and custom fields, they want to reuse it across other client companies or back it up before making changes. Manually recreating a complex template with 10+ questions and show/hide rules is error-prone and time-consuming.

## What You'll Need

- CloudRadial API credentials (Public Key and Private Key)
- PowerShell 5.1 or later
- Access to both the source and destination CloudRadial environments

## Step 1: Set Your Credentials

The script reads API credentials from environment variables. Set them once before running:

**Windows (PowerShell):**
```powershell
$env:CLOUDRADIAL_API_USERNAME = "YOUR_PUBLIC_KEY"
$env:CLOUDRADIAL_API_PASSWORD = "YOUR_PRIVATE_KEY"
```

**Windows (Command Prompt):**
```batch
set CLOUDRADIAL_API_USERNAME=YOUR_PUBLIC_KEY
set CLOUDRADIAL_API_PASSWORD=YOUR_PRIVATE_KEY
```

If these variables are not set, the script will prompt you to enter them interactively.

## Step 2: List Available Templates

View all Question Templates available in your source company:

```powershell
.\Sync-QuestionTemplates.ps1 -Action List
```

Output:
```
ID    Subject                Category       Company ID  Question Count
--    -------                --------       ----------  ---------------
1234  Support Request Form   Support        100         8
5678  Change Request         Change Mgmt    100         5
9012  Incident Report        Incidents      100         12
```

Note the template ID you want to export.

## Step 3: Export a Template

Export a template (and all its questions with conditional logic) to a JSON file:

**By template name:**
```powershell
.\Sync-QuestionTemplates.ps1 -Action Export -TemplateName "Support Request"
```

**By template ID:**
```powershell
.\Sync-QuestionTemplates.ps1 -Action Export -TemplateId 1234
```

**To a specific file:**
```powershell
.\Sync-QuestionTemplates.ps1 -Action Export -TemplateId 1234 -FilePath C:\backup\SupportTemplate.json
```

If no file path is specified, the script creates a file named `QuestionTemplate_Export_{subject}_{date}.json` in the current directory.

## Step 4: Import to Another Company

Import the exported template to a different company or environment:

```powershell
.\Sync-QuestionTemplates.ps1 -Action Import -FilePath C:\backup\SupportTemplate.json -TargetCompanyId 200
```

- If you omit `-TargetCompanyId`, the script imports to the same company ID from the export file
- The imported template's name is automatically appended with "(Imported YYYY-MM-DD HH:mm:ss)" to avoid confusion
- All questions and conditional logic are automatically remapped to work in the destination

## What Gets Exported

The JSON export file contains:
- **Template metadata:** subject, category, PSA mappings (board, status, priority), permission settings
- **All questions:** with their types (text, dropdown, multi-select, user lookup, etc.)
- **Question settings:** labels, placeholder text, required/optional flags, default values
- **Conditional logic:** show/hide rules based on parent question answers (childQuestionIds)

**What is NOT included:**
- Company-specific tokens or authentication details
- Embedded images or file attachments
- Per-company overrides or customizations
- Historical audit trails

## Conditional Logic Remapping

When questions are created in the destination company, they receive new IDs. The script automatically remaps all conditional logic (show/hide rules) so that:

- Parent-child question relationships are preserved
- Show/hide conditions reference the correct new question IDs
- Multi-level conditional chains work as expected

No manual remapping is needed.

## Common Use Cases

**Copy a proven template to a new client company:**
Export your refined Support Request form and import it when onboarding a new customer. All questions and logic come across intact.

**Back up templates before making changes:**
Export critical templates regularly. If an edit goes wrong, re-import the backup to the same company.

**Share templates between Partner organizations:**
If you manage multiple Partner sub-tenants, export from one and import to another to maintain consistency.

**Migrate templates during environment changes:**
When transitioning to a new CloudRadial environment or region, export templates from the old environment and import to the new one.

## Customization Tips

**Changing the target company before import:**
Edit the exported JSON file and update the `SourceCompanyId` field, then import with `-TargetCompanyId`.

**Modifying templates before import:**
The JSON file is human-readable. You can edit question labels, defaults, or conditional logic before importing. Be careful to maintain valid JSON syntax.

**Re-exporting after modifications:**
If you import a template, modify it in CloudRadial, and want to back up the revised version, export it again using the new template ID.

## Troubleshooting

**"Max retries exceeded" error:**
The script encountered API throttling or temporary server issues. Wait a moment and try again.

**"No templates found":**
The script is looking for items with `catalogUsage = 'Template'` or `catalogType = 99`. If custom templates don't appear, verify they're marked as templates in CloudRadial.

**Conditional logic not working after import:**
The script remaps childQuestionIds automatically. If show/hide rules still don't work, check that parent and child questions exist in the destination and that the JSON was not manually edited incorrectly.

**"File not found" during import:**
Verify the full path to your export JSON file and that the file exists.

## Support

For API-related issues or questions about CloudRadial templates, contact your CloudRadial support team. For script bugs or feature requests, consult your Partner documentation.
