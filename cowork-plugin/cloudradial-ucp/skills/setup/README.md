# Setup & Welcome Tour — Partner Guide

> First-run setup for the plugin itself. Walks you through credentials and shows what the plugin can do.

This is the **first thing you'll use** after installing the plugin. It introduces CloudRadial UCP, lets you tour what's included, and stores your CloudRadial API keys securely in your computer's keychain. You only run this once per computer — your keys are then shared across every Claude app on that machine.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Run the full setup the first time | `Setup the CloudRadial Plugin` | Brand intro → 4-button tour menu → credential prompt → live validation → confirmation |
| See what the plugin can do without setting up yet | `Tour the plugin` *or* `What does this plugin do` | The branded "what's included" panel + the same tour menu |
| Change keys / switch portals | `Setup the CloudRadial Plugin` (again) | Wizard overwrites the stored keys after validating the new ones |
| Remove stored keys | `Clear my CloudRadial credentials` | Calls `clear_credentials`; the keychain entry is wiped |
| Check whether keys are stored | `Is the CloudRadial plugin configured` | Calls `setup_status` — returns last-4 of your public key for confirmation, never the full key |

## Tips

- **One setup per machine.** If you also use Claude Code or Claude Desktop, install the plugin there too — the wizard will see your existing keys and skip credential entry.
- **Privacy.** Pasted keys briefly appear in the chat transcript before being moved into the OS keychain. If you'd rather they never enter chat, set `CLOUDRADIAL_PUBLIC_KEY` / `CLOUDRADIAL_PRIVATE_KEY` as environment variables before launching your Claude app — the server reads env vars first.
- **EU partners.** During setup, pick `https://api.eu.cloudradial.com` for region. US is the default.

## Related

- All other skills depend on this one. If anything errors with "credentials not configured" or 401/403, just run setup again.
- [Plugin DEPLOYMENT guide](../../DEPLOYMENT.md) — install steps and troubleshooting.
