# CloudRadial UCP Plugin for Claude

Connect Claude Desktop, Claude Code, or Cowork to your CloudRadial UCP Portal via a local MCP server. Query companies, users, endpoints, articles, feedback, and 20+ other resource types — with full read/write support — directly from Claude.

## Architecture

```
You in Claude
     |
     |  MCP tool calls (in-process, over stdio)
     v
@cloudradial/ucp-mcp  (local Node process, auto-spawned by your MCP client)
     |
     |  HTTPS with HTTP Basic auth (keys from OS keychain)
     v
CloudRadial API V2
```

There is **no Azure Function**, no Chrome extension, no separate server to deploy. The plugin ships an MCP server config in `plugin.json` — installing the plugin auto-registers the server with your MCP client. Credentials live in the OS keychain (Windows Credential Manager / macOS Keychain / Linux libsecret).

## Quick start

1. **Install the plugin.** Drag the `.plugin` file into Cowork, or run `/plugin install cloudradial-ucp` in Claude Code, or install via the Claude Desktop plugin gallery.
2. **Restart your MCP client** so it picks up the newly registered MCP server.
3. **Say "Set up CloudRadial."** The setup wizard asks for your CloudRadial public + private keys (Settings → API in your CloudRadial admin portal), validates them with a live API call, and stores them in your OS keychain.
4. **Start using it.** "Look up Acme Corp," "How many endpoints does company 42 have?", "Create a KB article about password resets," etc.

That's the whole flow. No Azure deployment, no Chrome extension required, no config file to edit by hand.

## Skills (11)

| Skill | What it does |
|-------|--------------|
| **setup** | First-time setup wizard — validates and stores credentials in the OS keychain |
| **portal-setup** | Guide partners through portal implementation: 5-session process, LOMG assessment, 8 CSA pain point playbooks, content seeding |
| **portal-lookup** | Look up companies, check portal status, assess LOMG lifecycle stage, prepare for meetings |
| **content-management** | Create and manage articles, catalogs, menus, courses, lessons, and assessments |
| **user-management** | Look up users by email/name, list users by company, analyze user adoption |
| **endpoint-reporting** | List endpoints, warranty reports, device inventory, application audits |
| **course-management** | Create courses and lessons, check enrollments, manage training content |
| **assessment-compliance** | Review security assessments, compliance tracking, flexible asset management |
| **feedback-analysis** | Analyze user feedback, CSAT trends, satisfaction reporting |
| **service-management** | Services, service installs, domains, products, coverage analysis |
| **reporting-admin** | Archives, certificates, company groups, media, tokens, raw API access |

## MCP tools (17)

The MCP server exposes 17 tools to Claude:

| Tool | Purpose |
|------|---------|
| `setup_status` | Check whether credentials are configured (returns hint only, never the keys) |
| `configure_credentials` | Validate and store credentials in the OS keychain |
| `clear_credentials` | Wipe stored credentials from the keychain |
| `search_companies` | Search companies by partial name |
| `company_overview` | Full snapshot: details, counts, recent articles + feedback |
| `list_resources` | List any of 30 resource types with OData filtering |
| `count_resources` | Count any resource type with optional filter |
| `get_resource` | Retrieve a single resource by ID (incl. composite keys) |
| `create_resource` | Create a new resource |
| `update_resource` | Update a resource (PUT full / PATCH partial) |
| `delete_resource` | Delete a resource by ID |
| `user_lookup` | Find users by email, name, or company |
| `manage_tokens` | List / get / create / revoke CloudRadial API tokens |
| `endpoint_update_warranty` | Trigger an async warranty refresh by endpoint serial number |
| `courseenrollment_complete` | Mark a course enrollment as completed (with optional score/comment) |
| `courseenrollment_for_user` | Get a user's enrollment record for a specific course |
| `raw_api_call` | Direct API call for advanced use cases |

## 30 supported resource types

`company`, `user`, `application_user`, `article`, `endpoint`, `catalog`, `catalog_question`, `assessment`, `feedback`, `service`, `service_install`, `domain`, `course`, `course_enrollment`, `course_lesson`, `course_lesson_history`, `menu`, `product`, `archive_item`, `certificate`, `company_group`, `company_group_company`, `quickstart`, `flexible_asset`, `flexible_asset_type`, `flexible_asset_field`, `endpoint_application`, `endpoint_custom_property`, `media`, `token`.

Composite-key resources (need extra args on get/update/delete): `archive_item`, `service_install`, `company_group_company`, `course_lesson_history`. `application_user` has no OData listing — get by id only.

## Credentials & security

- **Stored in the OS keychain.** Never written to disk in plain text. Encrypted at rest by the operating system; accessible only to your user account.
- **Validated before storage.** The setup wizard makes a live `GET /v2/odata/company/$count` call before writing anything — bad keys never get saved.
- **Privacy note for setup.** Because setup happens in chat, your keys appear briefly in the conversation transcript when you paste them. If you prefer the keys never enter the LLM context, set `CLOUDRADIAL_PUBLIC_KEY` and `CLOUDRADIAL_PRIVATE_KEY` environment variables in your MCP client config instead — the server picks those up first and skips the keychain.
- **To rotate:** re-run the setup wizard (it overwrites the keychain entry). To remove: ask Claude to run `clear_credentials`.

## Usage examples

- "Look up Acme Corp in CloudRadial"
- "Give me an overview of company 42 before my meeting"
- "How many endpoints does company 42 have?"
- "Show me all articles for Contoso"
- "Create a KB article for company 42 about password resets"
- "Build a training course about phishing awareness"
- "Which endpoints are out of warranty?"
- "Check assessment compliance for company 15"
- "What feedback has company 42 submitted?"
- "List all services installed for Contoso"

## Things to know

- **OData pagination caps at 200.** The CloudRadial API returns at most 200 results per page. The `list_resources` tool accepts `top` and `skip` for pagination.
- **Article uses `subject`, not `title`.** Course uses `name`, not `title`. Skills know this, but keep it in mind if you use `raw_api_call`.
- **EU partners:** during setup, choose `https://api.eu.cloudradial.com` as the base URL instead of the US default.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Install steps for Claude Desktop, Claude Code, and Cowork, plus troubleshooting.
- **[CAPABILITIES.md](CAPABILITIES.md)** — Tool reference: operations, 30 resource types, OData query options, examples.
- **[references/api-reference.md](references/api-reference.md)** — CloudRadial API V2 field-level schema reference.
- **MCP server source:** [`../cloudradial-ucp-mcp/`](../cloudradial-ucp-mcp) — the Node project that powers the tools.

## Legacy: Azure Function path

The `azure-mcp-server/` directory contains the previous architecture — a self-hosted Azure Function proxy that the plugin used to call via Chrome JS `fetch()`. **It is no longer required and the skills do not use it.** Partners who previously deployed the Azure Function can decommission it (it costs nothing on the consumption plan if idle, but the skills no longer call it). The directory is retained for historical reference and will be removed in a future release.

## License

MIT
