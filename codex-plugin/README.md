# CloudRadial UCP Plugin Install

This folder contains the shareable CloudRadial UCP plugin package:

```text
cloudradial-ucp.plugin
```

## What It Does

CloudRadial UCP connects Cowork, Claude, or Codex to a CloudRadial portal through a local MCP server. It can look up companies, users, endpoints, articles, feedback, services, courses, assessments, and other CloudRadial API V2 resources.

The plugin does not require an Azure Function, browser extension, or separate hosted service.

## Requirements

- Node.js 18 or newer
- CloudRadial API public and private keys
- Network access to CloudRadial API V2

Credential storage uses the local OS keychain:

| OS | Credential store |
| --- | --- |
| Windows | Windows Credential Manager |
| macOS | macOS Keychain |
| Linux | libsecret / Secret Service |

Linux systems need a running Secret Service provider such as `gnome-keyring` or `kwallet`.

## Install In Cowork

1. Open Cowork.
2. Drag `cloudradial-ucp.plugin` into the Cowork window.
3. Approve the plugin install when prompted.
4. Start a new conversation and say:

   ```text
   Set up CloudRadial
   ```

5. Follow the setup wizard to enter your CloudRadial API keys.

## Install In Claude

For Claude Desktop or Claude Code, install the plugin using the normal plugin install flow, then restart or reload the client so the MCP server is registered.

After install, start a new conversation and say:

```text
Set up CloudRadial
```

## Install In Codex

Codex plugin support is intended for local development. If you are installing this as a Codex local plugin, add it through your configured local marketplace or plugin install flow, then start a new thread after install so Codex reloads the plugin tools.

## Setup Notes

During setup, the plugin asks for:

- CloudRadial public key
- CloudRadial private key
- Region, if not using the US default

Default API URL:

```text
https://api.us.cloudradial.com
```

EU API URL:

```text
https://api.eu.cloudradial.com
```

The setup wizard validates credentials with CloudRadial before storing them.

## Privacy Note

If you paste API keys into chat during setup, they may briefly appear in the conversation transcript. To avoid that, configure these environment variables in the MCP client instead:

```text
CLOUDRADIAL_PUBLIC_KEY
CLOUDRADIAL_PRIVATE_KEY
CLOUDRADIAL_BASE_URL
```

Environment variables take precedence over keychain credentials.

## First Launch

The first tool call may take a few seconds while the plugin installs production npm dependencies locally. The launcher validates the actual dependency files before starting, including the native keyring binding, so partial npm installs are repaired automatically.

## Troubleshooting

- If `Set up CloudRadial` does not expose setup tools, restart or reload the MCP client.
- If Node is missing, install the Node.js LTS release from `https://nodejs.org`.
- If Linux keychain setup fails, install and start `gnome-keyring` or `kwallet`, or use environment variables.
- If CloudRadial rejects credentials, re-check the public and private keys in the CloudRadial admin portal.

