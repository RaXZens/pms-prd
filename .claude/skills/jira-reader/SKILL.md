---
name: jira-reader
description: Fetch a Jira Cloud issue and all related assets (description, comments, attachments, subtasks, linked issues, Confluence remote links) and load them as structured context for follow-on tasks like writing a PRD or sub-tasks. Use when user mentions a Jira ticket key (e.g. PROJ-123), pastes a Jira URL, or says "read Jira", "pull Jira ticket", or "/jira".
---

# Jira Reader

## Quick start

```
/jira PROJ-123
/jira https://your-domain.atlassian.net/browse/PROJ-123
```

Or just mention a ticket key in conversation — the skill auto-detects `PROJ-123` patterns.

## Auth setup (first time)

See [AUTH.md](AUTH.md). Needs three env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

Check if already set:
```bash
echo $JIRA_BASE_URL
```

## Fetching a ticket

Run the fetch script, substituting the issue key:

```bash
node ~/.claude/skills/jira-reader/scripts/fetch-issue.js PROJ-123
```

The script outputs structured markdown with all fields. Capture and read it:

```bash
node ~/.claude/skills/jira-reader/scripts/fetch-issue.js PROJ-123 > /tmp/jira-context.md
```

Then `Read /tmp/jira-context.md` to load the context.

## Attachments

Attachments are downloaded to `/tmp/jira-{KEY}/`. The script lists local paths in output.
Use the `Read` tool on each path to view images and PDFs inline.

## Handoff to follow-on tasks

Once the context is loaded, say what you want next:
- "Write a PRD from this ticket" → triggers `/write-a-prd`
- "Break this into sub-tasks" → triggers `/to-issues`
- "Summarize this ticket" → summarize directly from context

## Troubleshooting

- **401 Unauthorized** — token wrong or expired; regenerate at `https://id.atlassian.com/manage-profile/security/api-tokens`
- **Issue not found** — check `JIRA_BASE_URL` matches your org (e.g. `https://acme.atlassian.net`)
- **Missing env vars** — see [AUTH.md](AUTH.md) to re-run setup