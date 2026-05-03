---
name: prd-to-plan
description: Turn a PRD into a multi-phase implementation plan using tracer-bullet vertical slices, saved as numbered Markdown task files in ./plans/<plan-name>/. Use when user wants to break down a PRD, create an implementation plan, plan phases from a PRD, or mentions "tracer bullets".
---

# PRD to Plan

Break a PRD into a phased implementation plan using vertical slices (tracer bullets). Output is a folder under `./plans/` containing one numbered Markdown file per phase plus a `README.md`.

## Process

### 1. Confirm the PRD is in context

The PRD should already be in the conversation. If it isn't, ask the user to paste it or point you to the file.

### 2. Explore the codebase

If you have not already explored the codebase, do so to understand the current architecture, existing patterns, and integration layers.

### 3. Identify durable architectural decisions

Before slicing, identify high-level decisions that are unlikely to change throughout implementation:

- Route structures / URL patterns
- Database schema shape
- Key data models
- Authentication / authorization approach
- Third-party service boundaries

These go in the plan's `README.md` so every phase can reference them.

### 4. Draft vertical slices

Break the PRD into **tracer bullet** phases. Each phase is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
- Do NOT include specific file names, function names, or implementation details that are likely to change as later phases are built
- DO include durable decisions: route paths, schema shapes, data model names
</vertical-slice-rules>

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each phase show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

For each phase, decide the mode. **If you are unsure about a phase's mode, ask the user.** Do not guess silently.

### 6. Write the plan folder

Create a folder `./plans/<plan-name>/` (kebab-case feature name). Inside, write:

- `README.md` — overview, source PRD, durable architectural decisions
- One file per phase, numbered with a zero-padded prefix matching the phase order: `01-{phase-slug}.md`, `02-{phase-slug}.md`, ...

**Every task file MUST start with this frontmatter:**

```
---
status: todo
mode: afk | hitl
---
```

(`status` is always `todo` on creation; `mode` is the value decided in step 6.)

**The `README.md` MUST start with this frontmatter:**

```
---
status: active
---
```

Use the templates below.

<readme-template>
---
status: active
---

# Plan: <Feature Name>

> Source PRD: <brief identifier or link, e.g. `prds/<feature>.md`>

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: ...
- **Schema**: ...
- **Key models**: ...
- (add/remove sections as appropriate)

## Phases

1. [01-<phase-slug>.md](./01-<phase-slug>.md) — <Title>
2. [02-<phase-slug>.md](./02-<phase-slug>.md) — <Title>
<!-- one line per phase -->
</readme-template>

<task-file-template>
---
status: todo
mode: afk | hitl
---

# Phase <N>: <Title>

**User stories**: <list from PRD>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
</task-file-template>
