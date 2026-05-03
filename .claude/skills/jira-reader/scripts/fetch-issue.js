#!/usr/bin/env node
// Fetches a Jira Cloud issue + all related assets and prints structured markdown.
// Usage: node fetch-issue.js PROJ-123
//        node fetch-issue.js https://your-domain.atlassian.net/browse/PROJ-123
// Requires: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN env vars

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const issueArg = process.argv[2];
if (!issueArg) {
  console.error('Usage: node fetch-issue.js <ISSUE-KEY or Jira URL>');
  process.exit(1);
}

// Accept full URL or bare key
const issueKey = (() => {
  const m = issueArg.match(/([A-Z][A-Z0-9]+-\d+)/);
  return m ? m[1] : null;
})();

if (!issueKey) {
  console.error(`Could not extract a Jira issue key from: ${issueArg}`);
  process.exit(1);
}

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error(`Missing Jira credentials. Set env vars:
  JIRA_BASE_URL=https://your-domain.atlassian.net
  JIRA_EMAIL=you@example.com
  JIRA_API_TOKEN=<token from https://id.atlassian.com/manage-profile/security/api-tokens>

See ~/.claude/skills/jira-reader/AUTH.md for setup instructions.`);
  process.exit(1);
}

const base = JIRA_BASE_URL.replace(/\/$/, '');
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

function get(apiPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = apiPath.startsWith('http') ? apiPath : `${base}${apiPath}`;
    const parsed = new URL(fullUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    };
    const lib = parsed.protocol === 'https:' ? https : http;
    lib.get(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode === 404) return reject(new Error(`404 Not found: ${fullUrl}`));
        if (res.statusCode === 401) return reject(new Error('401 Unauthorized — check JIRA_EMAIL and JIRA_API_TOKEN'));
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function download(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(fileUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { Authorization: `Basic ${auth}` },
    };
    const lib = parsed.protocol === 'https:' ? https : http;
    lib.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', () => { out.close(); resolve(destPath); });
      out.on('error', reject);
    }).on('error', reject);
  });
}

// Walk Atlassian Document Format (ADF) nodes to plain text
function adf(node, depth) {
  if (!node) return '';
  depth = depth || 0;
  const indent = '  '.repeat(depth);
  const children = (n, d) => (n.content || []).map((c) => adf(c, d !== undefined ? d : depth)).join('');

  switch (node.type) {
    case 'doc': return children(node);
    case 'paragraph': return children(node) + '\n';
    case 'text': return node.text || '';
    case 'hardBreak': return '\n';
    case 'heading':
      return '#'.repeat(node.attrs?.level || 1) + ' ' + children(node).trim() + '\n';
    case 'bulletList':
      return (node.content || []).map((li) => `${indent}- ${adf(li, depth + 1).trim()}`).join('\n') + '\n';
    case 'orderedList':
      return (node.content || []).map((li, i) => `${indent}${i + 1}. ${adf(li, depth + 1).trim()}`).join('\n') + '\n';
    case 'listItem': return children(node).trim();
    case 'blockquote': return children(node).split('\n').map((l) => `> ${l}`).join('\n') + '\n';
    case 'codeBlock': {
      const lang = node.attrs?.language || '';
      return `\`\`\`${lang}\n${children(node)}\`\`\`\n`;
    }
    case 'inlineCard':
    case 'blockCard':
      return `[${node.attrs?.url || 'link'}]`;
    case 'mention':
      return `@${node.attrs?.text || node.attrs?.id || 'user'}`;
    case 'emoji': return node.attrs?.shortName || '';
    case 'rule': return '---\n';
    case 'table':
      return (node.content || []).map((row) => {
        const cells = (row.content || []).map((cell) => adf(cell, depth).trim()).join(' | ');
        return `| ${cells} |`;
      }).join('\n') + '\n';
    case 'tableRow': return children(node);
    case 'tableCell':
    case 'tableHeader': return children(node).trim();
    case 'mediaSingle':
    case 'mediaGroup': return children(node);
    case 'media':
      return `[attachment: ${node.attrs?.alt || node.attrs?.id || 'media'}]\n`;
    default:
      if (node.content) return children(node);
      if (node.text) return node.text;
      return '';
  }
}

async function main() {
  const tmpDir = `/tmp/jira-${issueKey}`;
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const FIELDS = [
    'summary', 'description', 'status', 'assignee', 'reporter',
    'priority', 'labels', 'components', 'comment', 'attachment',
    'issuelinks', 'subtasks', 'issuetype', 'project', 'parent',
    'fixVersions', 'customfield_10016', // story points (classic)
  ].join(',');

  const issue = await get(`/rest/api/3/issue/${issueKey}?fields=${FIELDS}`);
  const f = issue.fields;
  const out = [];

  // ── Header ────────────────────────────────────────────────────────────────
  out.push(`# ${issueKey}: ${f.summary}`);
  out.push('');

  // ── Metadata ──────────────────────────────────────────────────────────────
  out.push('## Metadata');
  out.push(`- **Type**: ${f.issuetype?.name}`);
  out.push(`- **Status**: ${f.status?.name}`);
  out.push(`- **Priority**: ${f.priority?.name || '—'}`);
  out.push(`- **Reporter**: ${f.reporter?.displayName || '—'}`);
  out.push(`- **Assignee**: ${f.assignee?.displayName || 'Unassigned'}`);
  if (f.parent) out.push(`- **Parent**: ${f.parent.key} — ${f.parent.fields?.summary}`);
  if (f.fixVersions?.length) out.push(`- **Fix Versions**: ${f.fixVersions.map((v) => v.name).join(', ')}`);
  if (f.labels?.length) out.push(`- **Labels**: ${f.labels.join(', ')}`);
  if (f.components?.length) out.push(`- **Components**: ${f.components.map((c) => c.name).join(', ')}`);
  if (f.customfield_10016) out.push(`- **Story Points**: ${f.customfield_10016}`);
  out.push(`- **URL**: ${base}/browse/${issueKey}`);
  out.push('');

  // ── Description ───────────────────────────────────────────────────────────
  out.push('## Description');
  out.push(f.description ? adf(f.description).trim() : '_(no description)_');
  out.push('');

  // ── Subtasks ──────────────────────────────────────────────────────────────
  if (f.subtasks?.length) {
    out.push('## Subtasks');
    for (const sub of f.subtasks) {
      out.push(`- [${sub.key}] ${sub.fields.summary} *(${sub.fields.status.name})*`);
    }
    out.push('');
  }

  // ── Linked issues ─────────────────────────────────────────────────────────
  if (f.issuelinks?.length) {
    out.push('## Linked Issues');
    for (const link of f.issuelinks) {
      const linked = link.outwardIssue || link.inwardIssue;
      const dir = link.outwardIssue ? link.type.outward : link.type.inward;
      if (linked) {
        out.push(`- **${dir}**: [${linked.key}] ${linked.fields.summary} *(${linked.fields.status.name})*`);
      }
    }
    out.push('');
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  if (f.attachment?.length) {
    out.push('## Attachments');
    out.push(`_(saved to \`${tmpDir}/\`)_`);
    out.push('');
    for (const att of f.attachment) {
      const dest = path.join(tmpDir, att.filename);
      try {
        await download(att.content, dest);
        out.push(`- \`${dest}\` — ${att.filename} (${att.mimeType})`);
      } catch (e) {
        out.push(`- ${att.filename} — download failed: ${e.message}`);
      }
    }
    out.push('');
    out.push('Use the `Read` tool on each path above to view images and PDFs.');
    out.push('');
  }

  // ── Remote links (Confluence, external) ───────────────────────────────────
  let remoteLinks = [];
  try { remoteLinks = await get(`/rest/api/3/issue/${issueKey}/remotelink`); }
  catch (_) {}
  if (remoteLinks?.length) {
    out.push('## Remote Links');
    for (const rl of remoteLinks) {
      out.push(`- [${rl.object?.title || rl.relationship || 'link'}](${rl.object?.url})`);
    }
    out.push('');
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  const comments = f.comment?.comments || [];
  if (comments.length) {
    out.push('## Comments');
    for (const c of comments) {
      const author = c.author?.displayName || 'Unknown';
      const date = c.created?.substring(0, 10);
      out.push(`### ${author} (${date})`);
      out.push(c.body ? adf(c.body).trim() : '_(empty)_');
      out.push('');
    }
  }

  console.log(out.join('\n'));
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});