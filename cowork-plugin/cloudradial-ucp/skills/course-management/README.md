# Course Management — Partner Guide

> Create training courses, manage lessons, track enrollments and completions.

Use this skill any time you need **training content** in a client's portal — a security-awareness course, an onboarding curriculum, a software-specific module — or any time you need to **see who's done it**.

## Try saying

| What you want | Say this | What you'll get |
|---|---|---|
| Build a course from a topic | `Build a phishing-awareness training course for company 15` | Claude drafts course + lessons, asks to confirm, then creates them |
| Build from a document | `Build a course for Contoso from this PDF / Word doc` *(attach it)* | Claude reads the doc, drafts a structured course, then creates it |
| Build from a YouTube video | `Build a training course for Contoso from this YouTube link: <url>` | Claude summarizes the video into lessons, then creates the course |
| See what exists | `Show all courses for Contoso` | List of courses with their IDs, names, and enrollment counts |
| Add a lesson to an existing course | `Add a lesson called "Reporting Phishing" to course 372` | New `course_lesson` created with the right `courseId` |
| Check completion | `Who's completed the security training at Acme Corp?` | List of completed enrollments with scores |
| Mark someone complete | `Mark John Smith complete on course 372 with score 95` | Calls `courseenrollment_complete` |
| Overdue learners | `Who at Contoso hasn't finished their required training?` | Filtered enrollment list |

## Tips

- **Courses + lessons = two-step creation.** Course container first (`name`, `description`, `category`, `passScore`), then each lesson (`title`, `overview`, `text`, `order`). Claude handles the order for you.
- **YouTube / docs / images** — Claude does the reading; the plugin just stores the resulting course. So results are as good as Claude's source comprehension.
- **Final exam lessons are stubs.** Quiz mechanics live in the CloudRadial platform, not in lesson `text`.
- **Course = `name`, not `title`.** Lesson = `title`. (Claude knows this; only matters if you use raw API calls.)

## Related

- [content-management](../content-management/README.md) — same write pattern for articles, catalogs, menus.
- [user-management](../user-management/README.md) — for assigning courses to specific users or checking enrollments.
- [portal-setup](../portal-setup/README.md) — Session 5 covers training assignment as part of handoff.
