# Create EndpointNames Token — Dynamic Endpoint Lists in Portal Content

## The Problem

CloudRadial tokens let you display dynamic data in portal content and forms. The @EndpointNames token gives your end users a dropdown or reference list of their company's active endpoints—useful for ticket forms ("Which computer is this about?"), reporting, dashboards, and self-service workflows. Without this script, you'd have to manually maintain and update hostname lists for each company every time their endpoint inventory changes.

## What You'll Need

- CloudRadial API credentials (PublicKey and PrivateKey)
- PowerShell 5.1 or later
- Knowledge of which company to target, or permission to run across all companies

## How Tokens Work

Tokens are dynamic @name placeholders that resolve to specific values for each company. This script:

1. Reads your active endpoint inventory from CloudRadial
2. Extracts hostnames (computer names) from each endpoint
3. Creates a comma-separated value and stores it as the @EndpointNames token
4. The portal then displays these hostnames in forms and content for that company

Every time you run the script, the token updates to reflect your current endpoints—new machines appear in dropdowns, removed machines disappear.

## Step 1: Set Your Credentials

Store your API credentials as environment variables so the script can access them:

**Windows (PowerShell):**
```powershell
$env:CLOUDRADIAL_API_USERNAME = "your_public_key"
$env:CLOUDRADIAL_API_PASSWORD = "your_private_key"
```

**Windows (Command Prompt):**
```cmd
set CLOUDRADIAL_API_USERNAME=your_public_key
set CLOUDRADIAL_API_PASSWORD=your_private_key
```

If the environment variables are not set, the script will prompt you to enter them at runtime.

## Step 2: Create Token for One Company

To create the @EndpointNames token for a single company, use either company ID or company name:

**By Company ID:**
```powershell
.\New-EndpointNamesToken.ps1 -CompanyId 42
```

**By Company Name:**
```powershell
.\New-EndpointNamesToken.ps1 -CompanyName "Contoso"
```

If your company name search returns multiple matches, the script will show you a menu to select the correct company.

## Step 3: Create Tokens for All Companies

To create @EndpointNames tokens for every company in your workspace:

```powershell
.\New-EndpointNamesToken.ps1 -AllCompanies
```

By default, the script skips companies that have no active endpoints. If you want to create empty tokens for these companies (useful for consistency), add the -CreateEmptyTokens switch:

```powershell
.\New-EndpointNamesToken.ps1 -AllCompanies -CreateEmptyTokens
```

## Step 4: Verify in the Portal

After running the script, verify that the tokens were created:

1. Log in to CloudRadial as a Partner Admin
2. Navigate to Settings > Tokens (or similar, depending on your UI version)
3. Search for or filter by "EndpointNames"
4. You should see one token per company, with hostnames listed as comma-separated values

## Using the Token in Forms

Once the @EndpointNames token is created, you can reference it in service catalog forms and portal content:

- **Service Catalog Form:** Add a dropdown field and set its data source to @EndpointNames. End users will see their company's endpoint list.
- **Portal Content:** Use @EndpointNames in markdown or template syntax to display endpoints in knowledge base articles, dashboards, or ticket templates.
- **Reports:** Reference the token in report filters or display logic to show only data for endpoints in the list.

## Scheduling This Script

To keep your tokens fresh as endpoints change, schedule the script to run regularly:

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create a new task
3. Set the trigger (daily, weekly, or as needed)
4. Set the action to run: `powershell.exe -File C:\path\to\New-EndpointNamesToken.ps1 -AllCompanies`
5. Run with credentials that have the CLOUDRADIAL_API_USERNAME and CLOUDRADIAL_API_PASSWORD environment variables set

**RMM/Automation Platform:**
If you use ConnectWise Automate, Datto RMM, or similar, create a scheduled script task that runs the PowerShell script on your desired interval (e.g., daily or weekly).

## Customization Tips

### Change the Token Name
If you want to use a different token name (e.g., @Computers or @MyEndpoints), pass the -TokenName parameter:

```powershell
.\New-EndpointNamesToken.ps1 -AllCompanies -TokenName "Computers"
```

### Filter Endpoints Differently
The script includes all active endpoints by default (isBlocked eq false). If you need different filtering logic—for example, excluding certain endpoint types, filtering by location, or applying custom business rules—edit the `Get-ActiveEndpoints` function to adjust the OData filter.

### Adapt with AI
Use tools like GitHub Copilot or ChatGPT to help customize the script for your specific workflow, such as:
- Excluding endpoints by name pattern (e.g., skip test machines)
- Creating different tokens for different endpoint groups (e.g., @ProductionEndpoints, @TestEndpoints)
- Adding logging or notifications when the script runs
- Integrating with your RMM tool's API

## Troubleshooting

**"No companies found matching..."**
- Check the company name spelling and try a partial search
- Verify you have access to view that company in CloudRadial

**"API returned 429"**
- Your API calls are being rate-limited. The script retries automatically, but if it continues, wait a few minutes and try again.

**"API returned 401"**
- Your PublicKey or PrivateKey is incorrect. Verify credentials in Settings > API Keys.

**Token created but hostnames are blank or incorrect**
- Some endpoints may have missing or empty machineName and name fields. Check the Endpoints page in CloudRadial to see what data is available.
- Edit the endpoint details to populate the machine name field.

**Script hangs or takes a long time**
- For workspaces with thousands of endpoints, pagination takes time. This is normal. Monitor the output and be patient.
