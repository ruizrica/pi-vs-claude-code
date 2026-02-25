# Quick Start Guide

Get up and running with the Pipeline Team in 5 minutes!

## Step 1: Install Prerequisites

```bash
# Install Pi Coding Agent
bun install -g pi

# Verify installation
pi --version
```

## Step 2: Run the Pipeline Extension

```bash
pi -e extensions/pipeline-team.ts -e extensions/theme-cycler.ts
```

This launches Pi with the pipeline team extension loaded.

## Step 3: Select a Pipeline

When prompted, select a pipeline configuration. For this demo, choose:

```
demo/pipeline-configs/demo-pipeline.yaml
```

## Step 4: Start a Task

Enter a task for the pipeline to execute. Try:

```
"Add a dark theme toggle extension that cycles through themes when pressing Ctrl+T"
```

## Step 5: Navigate Through Phases

The pipeline will guide you through each phase:

### Phase 1: UNDERSTAND
- Answer clarifying questions about your task
- The pipeline summarizes your requirements
- Type `advance_phase` when ready

### Phase 2: GATHER
- Watch Scout agents explore the codebase in parallel
- Each Scout reports findings
- Context is accumulated automatically

### Phase 3: PLAN
- Planner creates implementation strategy
- Review the plan steps
- Type `advance_phase` to proceed

### Phase 4: EXECUTE
- Builder agents implement the feature
- Files are modified in your codebase
- Watch progress in the widget

### Phase 5: REVIEW
- Reviewer examines the implementation
- If issues found, you can loop back (up to 3 times)
- When APPROVED, the task is complete!

## Available Commands

| Command | Description |
|---------|-------------|
| `/pipeline` | Show current pipeline status |
| `/pipeline-status` | Detailed phase progress |
| `/pipeline-reset` | Reset and start over |
| `Ctrl+J` | Toggle agent output overlay |

## Example Session

```
> pi -e extensions/pipeline-team.ts
✔ Loaded pipeline-team extension
✔ Loaded theme-cycler extension

Select pipeline config: demo/pipeline-configs/demo-pipeline.yaml
Starting pipeline: demo-feature

[UNDERSTAND] What would you like to build?
> Add a dark theme toggle extension

[UNDERSTAND] Clarifying questions:
- Should the toggle work globally or per file?
- What keyboard shortcut do you prefer?
- Should it cycle through all themes or just light/dark?

> Global toggle with Ctrl+T cycling all themes

[UNDERSTAND] Summary: Create a global theme toggle extension that cycles through all available themes when pressing Ctrl+T.

> advance_phase

[GATHER] Launching 3 Scout agents...
├── Scout #1: Exploring project structure...
├── Scout #2: Finding theme patterns...
├── Scout #3: Finding extension patterns...
✓ GATHER complete

> advance_phase

[PLAN] Planner creating implementation strategy...
✓ PLAN complete: 5-step implementation

> advance_phase

[EXECUTE] Builder implementing feature...
✓ EXECUTE complete: theme-toggle.ts created

> advance_phase

[REVIEW] Reviewer examining implementation...
✓ REVIEW complete: APPROVED

Pipeline complete! 🎉
```

## Next Steps

- Explore [Sample Pipeline Configs](pipeline-configs/)
- Read [Agent Role Descriptions](agents/roles.md)
- Learn about [Pipeline Concepts](concepts/overview.md)