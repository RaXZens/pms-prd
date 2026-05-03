---
name: do-work
description: Execute a unit of work end-to-end for the thaivis monorepo: plan, implement, verify with type-check and tests, then commit. Use when asked to implement a feature, fix a bug, or complete any development task in this repository.
---

# Do Work

Structured workflow for completing a unit of development work in this repository.

## Workflow


### 1. Understand the task
Read any reference plan or PRD, explore the codebase to understand the relevant files, patterns, and conventions. if the task is ambiguous, ask user to clarify scope before proceeding.


### 2. Plan (Optional)

If the task has not been already planned, create a plan for it:

### 3. Implement

Work through the plan step by step.

**For backend code (NestJS/Prisma), use red/green/refactor — one test at a time:**

1. **Red** — write a single failing test that captures the next behaviour you need. Run it and confirm it fails for the right reason.
2. **Green** — write the minimum production code to make that one test pass. Run tests, confirm green.
3. **Refactor** — clean up the implementation without breaking the test. Run tests again.
4. Repeat for the next behaviour.

Work in tracer-bullet slices: pick the thinnest vertical cut through the feature (e.g. the happy-path of one endpoint), get it fully green, then layer in error cases and edge cases one test at a time.

> **Frontend code (Next.js/React) is exempt** — skip the red/green/refactor loop for frontend work and implement directly.

### 4. Validate

Run the feedback loops and fix any issues, repeat until pass cleanly

### 5. Commit

Use Conventional Commits with the affected app

Stage only the files changed for this unit of work. Never use `git add -A` without reviewing what it includes.

### 6. Close the issue (if provided)

If a GitHub issue number or URL was provided at the start of the task, close it after a successful commit with related git branch: