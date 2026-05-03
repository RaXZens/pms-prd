#!/usr/bin/env node
// Usage: FIGMA_TOKEN=xxx node figma-fetch.js <url-or-key> [--node <id>] [--styles] [--components] [--export <ids>]

const https = require('https');

const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('Error: FIGMA_TOKEN environment variable is required');
  console.error('Get one at: figma.com → Account Settings → Personal access tokens');
  process.exit(1);
}

function extractFileKey(input) {
  const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input;
}

function extractNodeId(url) {
  const match = url.match(/node-id=([^&]+)/);
  if (!match) return null;
  // Figma URLs use '-' as separator, API uses ':'
  return decodeURIComponent(match[1]).replace(/-/g, ':');
}

function figmaGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.figma.com',
      path: `/v1${path}`,
      headers: { 'X-Figma-Token': TOKEN },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.err) { reject(new Error(parsed.err)); return; }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const input = args[0];

  if (!input || input === '--help') {
    console.error([
      'Usage: figma-fetch.js <figma-url-or-file-key> [options]',
      '',
      'Options:',
      '  --node <id>       Fetch a specific node (e.g. 1:23)',
      '  --styles          List all published styles',
      '  --components      List all published components',
      '  --export <ids>    Export nodes as SVG (comma-separated IDs)',
      '',
      'Examples:',
      '  node figma-fetch.js https://www.figma.com/design/abc123/MyFile',
      '  node figma-fetch.js abc123 --node 1:23',
      '  node figma-fetch.js abc123 --styles',
      '  node figma-fetch.js abc123 --export 1:23,4:56',
    ].join('\n'));
    process.exit(0);
  }

  const fileKey = extractFileKey(input);
  const urlNodeId = input.startsWith('http') ? extractNodeId(input) : null;

  const nodeFlagIdx = args.indexOf('--node');
  const nodeId = nodeFlagIdx !== -1 ? args[nodeFlagIdx + 1] : urlNodeId;
  const exportFlagIdx = args.indexOf('--export');

  let result;

  if (args.includes('--styles')) {
    result = await figmaGet(`/files/${fileKey}/styles`);
  } else if (args.includes('--components')) {
    result = await figmaGet(`/files/${fileKey}/components`);
  } else if (exportFlagIdx !== -1) {
    const ids = args[exportFlagIdx + 1];
    if (!ids) { console.error('--export requires a comma-separated list of node IDs'); process.exit(1); }
    result = await figmaGet(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=svg`);
  } else if (nodeId) {
    result = await figmaGet(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`);
  } else {
    result = await figmaGet(`/files/${fileKey}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
