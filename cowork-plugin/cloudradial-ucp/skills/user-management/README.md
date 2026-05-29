# User Management — Partner Guide

> Find, list, and analyze the people who use a client's CloudRadial portal.

Use this skill any time you need to **find a specific user**, **list everyone in a portal**, or **check adoption** (who's logging in, who's enrolled in courses).

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Find someone by email | `Find user john@acme.com` | Matching user record(s) with name, role, and companyId |
| Find by partial name | `List users named Smith` | All users with "Smith" in their first or last name |
| Everyone at a company | `Who has access to Contoso's portal?` | Full user list for that company |
| Quick count | `How many users does Acme Corp have?` | Just the number — fastest way to confirm a company is staffed |
| Find by name + company | `Find Sarah at company 42` | Matches scoped to that company only |
| Specific fields | `List Contoso's users with just name, email, and role` | Trimmed result so it's easy to scan |

## Tips

- **`user_lookup` is the fast path.** If you know the email, name, or company, Claude will use it instead of pulling the whole list.
- **Adoption review** — pair this with [course-management](../course-management/README.md) ("which of Contoso's users haven't completed the security training?").
- **One user, multiple companies?** Use `user_lookup` with the email — it returns the user record across companies they belong to.
- **Pagination.** The CloudRadial API returns at most 200 results per page; for companies with thousands of users, Claude pages automatically.

## Related

- [portal-lookup](../portal-lookup/README.md) — for the company snapshot that includes user *count*.
- [course-management](../course-management/README.md) — for enrollment and completion checks per user.
- [feedback-analysis](../feedback-analysis/README.md) — to tie feedback back to specific users.
