#!/usr/bin/env node
// Usage: node create-issue.js '<json-args>'
// Required env: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN
// Optional env: JIRA_PROJECT_KEY (default: TV)

const https = require('https');

const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY = 'TV' } = process.env;

if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Missing required env vars: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN');
  process.exit(1);
}

const args = JSON.parse(process.argv[2] || '{}');

if (!args.summary) {
  console.error('summary is required');
  process.exit(1);
}

function toAdf(text) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n\n').map(para => ({
      type: 'paragraph',
      content: [{ type: 'text', text: para }],
    })),
  };
}

const fields = {
  project: { key: JIRA_PROJECT_KEY },
  summary: args.summary,
  issuetype: { name: args.issuetype || 'Task' },
};

if (args.description) fields.description = toAdf(args.description);
if (args.assignee) fields.assignee = { accountId: args.assignee };
if (args.priority) fields.priority = { name: args.priority };
if (args.labels?.length) fields.labels = args.labels;
if (args.storyPoints != null) fields.customfield_10016 = Number(args.storyPoints);
if (args.parent) fields.parent = { key: args.parent };

const body = JSON.stringify({ fields });
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const options = {
  hostname: `${JIRA_DOMAIN}.atlassian.net`,
  path: '/rest/api/3/issue',
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.key) {
      console.log(`Created: https://${JIRA_DOMAIN}.atlassian.net/browse/${result.key}`);
      console.log(JSON.stringify({ key: result.key, id: result.id, self: result.self }));
    } else {
      console.error('Jira API error:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });
});

req.on('error', (e) => { console.error('Request failed:', e.message); process.exit(1); });
req.write(body);
req.end();