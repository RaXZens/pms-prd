---
name: figma-reader
description: Read Figma files via REST API and convert designs into React/TypeScript frontend components. Extracts design tokens (colors, typography, spacing), component structure, auto-layout, and exports vector/image assets. Use when user shares a Figma URL or file key and wants to generate components, build a design system, extract tokens, or inspect a design for implementation.
---

# Figma Reader

## Quick start

1. Get a Personal Access Token: figma.com → Account Settings → Personal access tokens
2. Run the fetch script:
   ```bash
   FIGMA_TOKEN=xxx node .claude/skills/figma-reader/scripts/figma-fetch.js <figma-url-or-key>
   ```
3. Use the JSON output to generate components (see pipeline below)

## Fetch modes

```bash
# Full file tree (use for first-pass exploration)
node figma-fetch.js <url-or-key>

# Specific frame or component by node ID
node figma-fetch.js <url-or-key> --node 1:23

# All published styles (colors, text, effects, grids)
node figma-fetch.js <url-or-key> --styles

# All published components with metadata
node figma-fetch.js <url-or-key> --components

# Export assets as SVG (returns download URLs)
node figma-fetch.js <url-or-key> --export 1:23,4:56
```

The script auto-extracts the file key and node ID from full Figma URLs.

## Component generation pipeline

Work through this sequence after fetching:

1. **Design tokens** — run `--styles`, then map:
   - `FILL` styles → CSS custom properties or Tailwind theme colors
   - `TEXT` styles → typography scale (font size, weight, line height)
   - `EFFECT` styles → `box-shadow` / `drop-shadow` utilities

2. **Layout** — for each `FRAME` or `COMPONENT` node:
   - `layoutMode: HORIZONTAL` → `flex flex-row`
   - `layoutMode: VERTICAL` → `flex flex-col`
   - `primaryAxisAlignItems` / `counterAxisAlignItems` → `justify-*` / `items-*`
   - `paddingTop/Right/Bottom/Left` → `p-*` or individual padding classes
   - `itemSpacing` → `gap-*`

3. **Components** — run `--components`:
   - `COMPONENT` nodes → React components with typed props
   - `INSTANCE` nodes → usages; `componentProperties` map to prop values
   - Variants (`COMPONENT_SET`) → map to a `variant` prop union type

4. **Assets** — for `VECTOR` and image-fill `RECTANGLE` nodes, run `--export` to get SVG URLs; inline as `<img src>` or import as React SVG components

See [REFERENCE.md](REFERENCE.md) for complete node type reference, property tables, and Tailwind mapping cheatsheet.
