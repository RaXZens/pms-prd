---
name: jira-creator
description: Create Jira Cloud issues in the TV project with full field support: summary, description, assignee, priority, labels, story points, and issue type. Use when user asks to create a Jira task, story, bug, ticket, or issue — including bulk creation from a PRD file, GitHub issue link, or conversation context.
---

# Jira Task Creator

## Setup (one-time)

Add to `~/.zshrc`:

```bash
export JIRA_DOMAIN=thaivis          # subdomain only → thaivis.atlassian.net
export JIRA_EMAIL=admin@thaivis.com
export JIRA_API_TOKEN=your_token    # https://id.atlassian.com/manage-profile/security/api-tokens
export JIRA_PROJECT_KEY=TV
```

Then reload: `source ~/.zshrc`

Verify setup:
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://$JIRA_DOMAIN.atlassian.net/rest/api/3/myself" | python3 -c "import sys,json; u=json.load(sys.stdin); print('OK:', u['displayName'])"
```

## Workflow: single issue

1. Collect fields (ask for any not provided):
   - **summary** (required)
   - **description** — plain text, optional
   - **issuetype** — Task / Story / Bug / Sub-task (default: Task)
   - **priority** — Highest / High / Medium / Low / Lowest (default: Medium)
   - **assignee** — accountId (optional; see Finding accountId)
   - **labels** — array of strings (optional)
   - **storyPoints** — number (optional)

2. Run the helper script from the project root:
```bash
node .claude/skills/jira-creator/scripts/create-issue.js '<json>'
```

   Example JSON argument:
```json
{"summary":"Fix login bug","description":"Steps to reproduce...","issuetype":"Bug","priority":"High","labels":["auth"],"storyPoints":3}
```

3. Report the created issue URL from the script output.

## Workflow: from PRD

Use when user asks to create tasks from a PRD. Determine the PRD source first:

| Source | How to load |
|--------|-------------|
| **File** | Always ask the user for the exact file path before reading — never read from `prds/` automatically |
| **GitHub issue** | `gh issue view <number> --repo thaivis/app --json title,body` — use body as PRD content |
| **Conversation context** | PRD content already in the current chat — use it directly, no fetch needed |

Then:

1. Extract all actionable work items from the PRD content. For each, determine:
   - summary, description (1-2 sentences from PRD context), issuetype, priority, labels, storyPoints
2. Present a preview table to the user — ask for confirmation before creating:
   ```
   | # | Type  | Summary                  | Priority | Points |
   |---|-------|--------------------------|----------|--------|
   | 1 | Story | User can reset password  | High     | 3      |
   | 2 | Task  | Add email template       | Medium   | 1      |
   ```
3. After confirmation, create each issue sequentially with the script.
4. Report all created issue URLs as a list.

## Finding an accountId

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://$JIRA_DOMAIN.atlassian.net/rest/api/3/user/search?query=name@example.com" \
  | python3 -c "import sys,json; [print(u['accountId'], u['displayName']) for u in json.load(sys.stdin)]"
```

## Notes

- Story points use `customfield_10016` (Jira Cloud default). If they don't save, ask user to confirm the field ID via Project Settings → Fields.
- Sub-tasks require a `parent` field — ask for the parent issue key (e.g. `TV-42`) if issuetype is Sub-task.