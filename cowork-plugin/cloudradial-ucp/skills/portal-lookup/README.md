# Portal Lookup

> Company search, portal health checks, and meeting prep — all from a chat prompt.

> `Prepare me for my meeting with Contoso`

<img src="images/portal-result.png" alt="Meeting prep visual showing portal snapshot, feedback, flags, and talking points" width="100%">

Claude pulls real data from the portal and renders an interactive visual card with stats, recent feedback, flags, and suggested talking points — ready for your call.

---

## Try it

| Say this | What you get |
|---|---|
| `Look up Acme Corp in CloudRadial` | Company details with user and endpoint counts |
| `Prepare me for my meeting with Contoso` | Visual meeting prep card with LOMG stage, flags, and talking points |
| `How is Acme Corp doing in their portal?` | Adoption snapshot with activity indicators |
| `Give me an overview of company 42` | Direct lookup by ID — skips the search step |
| `Show me overviews for Acme, Contoso, and Globex` | Side-by-side comparison of multiple companies |

## Good to know

- **Search is fuzzy** — partial names work ("Acme" matches "Acme Corp", "Acme Holdings").
- **Results are framed against the LOMG lifecycle** — Land, Onboard, Manage, Grow.
- **Meeting prep renders a visual card** — includes portal stats, recent feedback with rating badges, flags, and actionable talking points.
- **Company IDs are stable numbers** — once known, use them directly to skip the search step.

## Related skills

- [Portal Setup](../portal-setup) — for guided implementation after the lookup.
- [Content Management](../content-management) — to act on content gaps identified in the overview.
