# Service Management — Partner Guide

> Review services, service installs, managed domains, and products across portals.

Use this skill for anything **service-coverage-related**: what services a client has installed, what domains you're managing for them, which domains are about to expire, and what products are available.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| What's a client paying for | `What services are installed for Acme Corp?` | List of `service_install` records (links service IDs to companies) |
| Catalog of services | `What services do we offer?` | All defined services with name, description, category |
| Domains we manage | `List Contoso's managed domains` | Domain records with registrar, expiration |
| Domain expiry sweep | `Which of my managed domains expire in the next 90 days?` | Filtered list across companies |
| Add a service | `Install service 12 for Acme Corp` | Creates a `service_install` linking those two |
| Remove a service | `Uninstall service 12 from Acme Corp` | Deletes the matching `service_install` |
| Product catalog | `What products are listed in the portal?` | All `product` records |
| Coverage summary | `Service coverage summary for Acme Corp` | Cross-references services and installs to show gaps |

## Tips

- **`service_install` is a composite-key resource.** On create, Claude passes `endpoint_id` + `service_id`; on update/delete, `endpoint_id` + `id` (where `id` = the serviceId). Worth knowing if you use raw API calls.
- **Domain expirations are partner-wide alerts.** Ask "any of my domains expiring soon" without naming a company to get a roll-up across every client.
- **Products vs. services.** `product` = catalog item available for purchase. `service` = something offered/installed. Different resources; don't confuse them.

## Related

- [reporting-admin](../reporting-admin/README.md) — for archive-style cross-company reports including services.
- [portal-setup](../portal-setup/README.md) — Session 2 covers initial service catalog configuration.
