CloudRadial Codex Plugin
A Claude Code / Codex plugin that connects your AI assistant to the CloudRadial UCP
Portal via a local MCP server. Query companies, users, endpoints, articles, feedback, and
27 other resource types — including full read/write support — directly from your AI
conversations.
What’s here
• cloudradial-codex/ — the plugin itself: 11 skills covering portal lookup, content
management, endpoint reporting, course management, assessment compliance,
feedback analysis, service management, reporting/admin, and an interactive setup
wizard. The MCP server (@cloudradial/ucp-mcp) is bundled inside at cloudradialcodex/mcp-server/ so partners get a single drag-and-drop install — no Azure
deployment, no Chrome extension, no separate server to host.
Quick start
For partners installing the plugin:
1. Download the latest .plugin from GitHub Releases.
2. Install using the normal plugin install flow (drag into Cowork, /plugin install in
Claude Code, or install via gallery in Claude Desktop), then restart or reload the
client so the MCP server is registered.
3. In a new conversation, say “Set up CloudRadial.” The setup wizard collects your
API keys, validates them with a live call, and stores them encrypted in your OS
keychain.
4. Start using it — “Look up Acme Corp”, “Give me an overview of company 42”,
“Create a KB article about password resets”, etc.
The first MCP tool call after install takes ~10 seconds while the bundled MCP server installs
its production dependencies locally; subsequent calls are instant.
For developers / contributors:
git clone https://github.com/cloudradial/helpers.git
cd helpers/codex-plugin/cloudradial-codex/mcp-server
npm install
npm run build
Then point your MCP client at cloudradial-codex/mcp-server/launch.cjs (see
DEPLOYMENT.md for client-specific config).
Requirements
• Node.js 18 or newer
• CloudRadial API public and private keys
• Network access to CloudRadial API V2
Credential storage uses the local OS keychain (Windows Credential Manager, macOS
Keychain, or libsecret / Secret Service on Linux). Linux systems need a running Secret
Service provider such as gnome-keyring or kwallet.
Architecture at a glance
You in Claude Code / Codex
 |
 | MCP tool calls (stdio JSON-RPC)
 v
mcp-server/launch.cjs (auto-installs deps on first run)
 |
 | spawns
 v
mcp-server/dist/index.js (the MCP server)
 |
 | HTTPS + HTTP Basic auth (keys from OS keychain)
 v
CloudRadial API V2
Documentation
• cloudradial-codex/README.md — plugin overview: skills, MCP tools, supported
resources.
• cloudradial-codex/DEPLOYMENT.md — install steps for Cowork, Claude Code, and
Claude Desktop, plus troubleshooting.
• cloudradial-codex/CAPABILITIES.md — tool reference with examples.
• cloudradial-codex/mcp-server/README.md — MCP server details (for developers).
• cloudradial-codex/references/api-reference.md — CloudRadial API V2 fieldlevel schema reference.
Setup notes
During setup, the plugin asks for your CloudRadial public key and private key. If your portal
is not in the US region, you will also be asked for the region.
Default API URL: https://api.us.cloudradial.com
EU API URL: https://api.eu.cloudradial.com
The setup wizard validates credentials with CloudRadial before storing them.
Privacy note
If you paste API keys into chat during setup, they may briefly appear in the conversation
transcript. To avoid that, configure these environment variables in the MCP client instead:
CLOUDRADIAL_PUBLIC_KEY
CLOUDRADIAL_PRIVATE_KEY
CLOUDRADIAL_BASE_URL
Environment variables take precedence over keychain credentials.
Troubleshooting
• If Set up CloudRadial does not expose setup tools, restart or reload the MCP client.
• If Node is missing, install the Node.js LTS release from https://nodejs.org.
• If Linux keychain setup fails, install and start gnome-keyring or kwallet, or use
environment variables.
• If CloudRadial rejects credentials, re-check the public and private keys in the
CloudRadial admin portal.
License
MIT
