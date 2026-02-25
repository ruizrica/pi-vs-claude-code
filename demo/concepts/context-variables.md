# Context Variables

Context variables carry information through the pipeline phases. They are automatically passed from one phase to the next.

## Available Variables

| Variable | Phase Set | Description |
|----------|-----------|-------------|
| `$TASK` | UNDERSTAND | User's original request |
| `$CONTEXT` | UNDERSTAND | User clarifications and context |
| `$SCOUT_OUTPUT` | GATHER | Consolidated Scout findings |
| `$PLAN` | PLAN | Implementation plan |
| `$EXECUTE_OUTPUT` | EXECUTE | Implementation results |
| `$REVIEW_OUTPUT` | REVIEW | Review feedback |

## Variable Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ UNDERSTAND  │─────▶│   GATHER    │─────▶│    PLAN     │
│             │      │             │      │             │
│ $TASK       │      │ $CONTEXT    │      │ $SCOUT      │
│ $CONTEXT    │ ──▶  │ $SCOUT_OUT  │ ──▶  │   _OUTPUT   │
│             │      │             │      │ $PLAN       │
└─────────────┘      └─────────────┘      └─────────────┘
                                                    │
       ┌───────────────────────────────────────────┘
       ▼
┌─────────────┐      ┌─────────────┐
│   EXECUTE   │─────▶│   REVIEW    │
│             │      │             │
│ $PLAN       │      │ $EXECUTE    │
│ $EXECUTE    │ ──▶  │   _OUTPUT   │
│   _OUTPUT   │      │ $REVIEW     │
│             │      │   _OUTPUT   │
└─────────────┘      └─────────────┘
```

## Using Variables in Templates

Variables are used in agent task templates:

```yaml
agents:
  - role: scout
    task_template: |
      Explore for: $TASK

      Context:
      $CONTEXT

      Report findings.
```

### Variable Substitution

When the agent runs, variables are replaced:

**Template:**
```
Task: $TASK
Context: $CONTEXT
Scout findings: $SCOUT_OUTPUT
```

**Becomes:**
```
Task: Add dark theme toggle
Context: Global toggle, Ctrl+T shortcut, persist preference
Scout findings: Found theme-cycler.ts, use pi.keymap()
```

## Setting Variables

### In UNDERSTAND Phase

The pipeline automatically captures user input:

```yaml
- name: understand
  mode: interactive
  # $TASK and $CONTEXT are set from user interaction
```

### In GATHER Phase

Scout outputs are automatically consolidated:

```yaml
- name: gather
  mode: parallel
  agents:
    - role: scout
      # Each scout contributes to $SCOUT_OUTPUT
```

### In PLAN Phase

Planner explicitly defines `$PLAN`:

```yaml
- name: plan
  mode: sequential
  agents:
    - role: planner
      # Planner's output becomes $PLAN
```

### In EXECUTE Phase

Builder outputs become `$EXECUTE_OUTPUT`:

```yaml
- name: execute
  mode: parallel
  agents:
    - role: builder
      # Builder's output becomes $EXECUTE_OUTPUT
```

## Accessing Variables

### In Pipeline Extension

```typescript
// Read variables
const task = pi.variables.get("TASK");
const context = pi.variables.get("CONTEXT");

// Set variables
pi.variables.set("PLAN", planContent);
```

### In Agent Task Templates

Variables are automatically substituted:

```yaml
task_template: |
  Task: $TASK
  This was set in UNDERSTAND phase.
```

## Best Practices

1. **Use descriptive context** - Set `$CONTEXT` clearly in UNDERSTAND
2. **Reference previous outputs** - Use `$SCOUT_OUTPUT` in PLAN
3. **Make templates readable** - Use variables to keep templates clean
4. **Check for existence** - Some phases might not set all variables

## See Also

- [Phases](phases.md)
- [Tool Reference](tool-reference.md)
- [Agent Roles](../agents/roles.md)