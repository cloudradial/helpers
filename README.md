# CloudRadial Scripts & Automations

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![PowerShell](https://img.shields.io/badge/PowerShell-5.1%2B-blue)
![CloudRadial API](https://img.shields.io/badge/CloudRadial-API%20v2-green)

## About This Repository

A library of production-ready PowerShell scripts and integration templates that help MSP Partners extend CloudRadial using the API, RMM tools, and AI-assisted automation. Built by the CloudRadial Customer Success team from real Partner engagements.

Whether you need to automate user provisioning, sync endpoint data to your PSA, deploy branding changes across endpoints, or integrate CloudRadial with Teams or Slack—you'll find working examples here, plus templates to customize with AI.

## Quick Start

Get your first API call working in 15 minutes:

1. **Get your API keys** from Settings > API in your CloudRadial portal (copy both Public and Private keys)
2. **Read** [getting-started/authentication.md](getting-started/authentication.md) for the full walkthrough
3. **Run this example** in PowerShell:

```powershell
$publicKey = "YOUR_PUBLIC_KEY"
$privateKey = "YOUR_PRIVATE_KEY"
$authHeader = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($publicKey):$($privateKey)"))
}
$response = Invoke-RestMethod -Uri "https://api.us.cloudradial.com/v2/odata/company" `
    -Headers $authHeader -Method Get
$response
```

That's it—you're calling the CloudRadial API.

## What's Inside

| Category | What It Does | Key Scripts |
|----------|-------------|------------|
| **Desktop App Management** | RMM-deployable scripts for branding, notifications, updates, location services | `branding/`, `notification-style/`, `uninstall-update/`, `location-services/` |
| **User Management** | Bulk user operations via the API—create, update, list, sync from PSA | `user-management/bulk-upload/`, `user-management/bulk-get-post-put/`, `user-management/psa-contact-sync/` |
| **Token Management** | Programmatically populate dynamic tokens for use in portal content | `tokens/endpoint-names-single/`, `tokens/endpoint-names-all-companies/` |
| **Service Catalog** | Create and sync service request forms and question templates via API | `service-catalog/create-service-request/`, `service-catalog/question-template-sync/` |
| **Endpoint Monitoring** | Query endpoint check-in health and status | `monitoring/endpoint-check-in-status/` |
| **Integrations** | Webhook templates, Teams notifications, Partner app setup | `integrations/teams-notifications/`, `integrations/psa-feedback-card/`, `integrations/partner-app-setup/` |
| **AI Prompt Templates** | Reusable prompts for generating custom CloudRadial scripts with AI | `templates/prompt-templates/` |

## Using AI to Customize

Don't see exactly what you need? Use AI to generate it.

CloudRadial's API follows standard REST and OData patterns that Claude, ChatGPT, and other large language models understand well. The process is simple:

1. Start with an existing script from this repo that's close to what you want
2. Describe your changes in plain English
3. Paste the script + your description into Claude or ChatGPT
4. Test the output with `-WhatIf` before running it in production

Check out [getting-started/using-ai-to-customize.md](getting-started/using-ai-to-customize.md) for detailed examples and prompt templates you can reuse.

## Prerequisites

- PowerShell 5.1 or later
- CloudRadial API keys (Public + Private) from your portal's Settings > API page
- Appropriate permissions in the CloudRadial portal for the operations you're automating
- For RMM deployment scripts: access to your RMM platform's script library

## Contributing

We welcome contributions from MSP Partners. Have a script that solves a real problem? Share it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- How to submit pull requests
- Script standards and best practices
- Documentation expectations
- How to open issues for script requests or bugs

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Questions?** Open an issue in this repo or contact the CloudRadial Customer Success team.
