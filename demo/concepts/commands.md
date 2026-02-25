# Pipeline Commands

The Pipeline Team provides several commands for controlling and monitoring the pipeline.

## Available Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/pipeline` | None | Show current pipeline status |
| `/pipeline-status` | None | Detailed phase progress |
| `/pipeline-reset` | None | Reset and start over |
| `advance_phase` | None | Move to next phase |

## Command Details

### /pipeline

Shows a quick summary of the current pipeline status.

```
/pipeline
```

**Output:**
```
Pipeline: demo-feature
Current Phase: EXECUTE (Phase 4/5)
Progress: ████████░░░░░░░░░░░░ 40%
```

### /pipeline-status

Shows detailed progress including all phases.

```
/pipeline-status
```

**Output:**
```
=== PIPELINE STATUS ===

Pipeline: demo-feature
Phase: EXECUTE (4/5)

Phases:
✓ UNDERSTAND - Done (2m 15s)
✓ GATHER - Done (45s)
✓ PLAN - Done (1m 30s)
○ EXECUTE - Running (Builder: 78%)
○ REVIEW - Pending

Total Time: 5m 30s
Review Loops: 0/3
```

### /pipeline-reset

Resets the pipeline and starts over from the beginning.

```
/pipeline-reset
```

**Output:**
```
⚠️  This will reset the pipeline. Continue? (y/n)
> y

Pipeline reset complete.
Starting fresh with UNDERSTAND phase...
```

### advance_phase

Moves from the current phase to the next phase.

```
advance_phase
```

**Available in phases:**
- UNDERSTAND: After clarifying requirements
- GATHER: After scouts complete
- PLAN: After planner creates strategy
- EXECUTE: After builders complete
- REVIEW: After approval (or 3 loops)

**Output varies by phase:**
```
# From UNDERSTAND to GATHER
Moving to GATHER phase...
Dispatching Scout agents...

# From GATHER to PLAN
Moving to PLAN phase...
Launching Planner...

# From EXECUTE to REVIEW
Moving to REVIEW phase...
Launching Reviewer...
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+J | Toggle widget visibility |
| Ctrl+C | Cancel current phase |

## Widget Controls

When the widget is visible (Ctrl+J):

- Scroll through agent outputs
- See real-time progress
- View context variables
- Monitor agent status

## Best Practices

1. **Use `/pipeline-status`** - Get detailed view when needed
2. **Wait for phase complete** - Don't advance before agents finish
3. **Check in REVIEW** - Ensure issues are resolved before advancing
4. **Use Ctrl+J** - Toggle widget to see agent outputs

## See Also

- [Tool Reference](tool-reference.md)
- [Phases](phases.md)
- [Visual Files](../visual/)