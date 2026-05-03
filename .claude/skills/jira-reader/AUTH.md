# Jira Auth Setup

Jira Cloud uses Basic Auth with an API token (not your password).

## Step 1 — Generate an API token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Label it (e.g. "claude-code") and copy the token

## Step 2 — Set environment variables

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="your-token-here"
```

Then reload: `source ~/.zshrc`

## Step 3 — Add to Claude Code env (recommended)

So Claude Code picks them up without a shell reload, add via the `update-config` skill or run:

```bash
# Add to project settings
claude config set env.JIRA_BASE_URL "https://your-domain.atlassian.net"
claude config set env.JIRA_EMAIL "you@example.com"
claude config set env.JIRA_API_TOKEN "your-token-here"
```

Or add them to your global `~/.claude/settings.json` under `"env": {}`.

## Verify

```bash
node ~/.claude/skills/jira-reader/scripts/fetch-issue.js PROJ-1
```

Should print the issue. A `401` means the token is wrong; a `404` means the issue key or base URL is wrong.