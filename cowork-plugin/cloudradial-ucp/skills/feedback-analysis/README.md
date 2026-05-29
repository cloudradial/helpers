# Feedback Analysis — Partner Guide

> Read and analyze user feedback, CSAT scores, and satisfaction trends.

Use this skill any time you need to know **how a client's users feel** — CSAT after ticket resolution, portal feedback, satisfaction trends over time.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Recent feedback | `What feedback has Contoso submitted lately?` | The 10 newest feedback entries with ratings and comments |
| CSAT score | `What's Contoso's CSAT average over the last 90 days?` | Rolled-up average across feedback in that window |
| Negative feedback only | `Show me Contoso's bad reviews from the last month` | Filtered list (low ratings) so you can act on them |
| Across all clients | `Which of my clients have the lowest CSAT this quarter?` | Cross-company comparison ranked by score |
| Specific user's feedback | `What feedback has user 12345 submitted?` | Per-user feedback history |
| Categorize | `What are the most common complaints from Contoso?` | Claude groups feedback by theme |
| QBR-ready trend | `Build me a CSAT trend chart for Acme Corp` | Time-series summary suitable for QBR slides |

## Tips

- **Sort by `dateCreated desc`** to get newest first — Claude does this automatically when you ask for "recent."
- **Rating scale.** Different portals may use different scales (1–5, NPS). Claude works with whatever's in the data.
- **Comment text matters.** Even with a high rating, the comment can reveal issues — ask Claude to "summarize themes in Contoso's recent feedback" rather than just averaging numbers.
- **Pair with [user-management](../user-management/README.md)** to attach names to the user IDs in feedback rows.

## Related

- [portal-lookup](../portal-lookup/README.md) — overview includes the most recent feedback, useful for pre-meeting prep.
- [portal-setup](../portal-setup/README.md) — Session 4 covers setting up feedback collection in the portal.
