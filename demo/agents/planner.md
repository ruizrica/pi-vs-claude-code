# Planner Agent

The Planner agent is used in the **PLAN** phase to create implementation strategies.

## Role Summary

| Attribute | Value |
|-----------|-------|
| **Primary Phase** | PLAN |
| **Mode** | Sequential (runs after GATHER completes) |
| **Purpose** | Create implementation plans, assess risks |
| **Tools** | Read-only + planning capabilities |

## When to Use Planners

Use Planner agents when you need to:
- Break down complex tasks into steps
- Identify dependencies and ordering
- Assess potential risks
- Estimate effort
- Create a roadmap

## Task Template

```yaml
agents:
  - role: planner
    task_template: |
      Plan implementation for: $TASK

      Context:
      $CONTEXT

      Scout Findings:
      $SCOUT_OUTPUT

      Create a plan with:
      1. Step-by-step implementation
      2. Files to modify/create
      3. Dependencies
      4. Risk assessment
```

## Input Variables

The Planner receives:
- `$TASK` - Original user request
- `$CONTEXT` - User clarifications and context
- `$SCOUT_OUTPUT` - Findings from Scout agents (if in GATHER phase)

## Example Output

```
=== IMPLEMENTATION PLAN ===

Task: Add dark theme toggle extension

STEP 1: Analyze existing code
- Read extensions/theme-cycler.ts
- Understand current theme cycling logic
- Identify where to add keyboard shortcut

STEP 2: Add keyboard shortcut
- Use pi.keymap() to register Ctrl+T
- Test shortcut doesn't conflict with existing

STEP 3: Implement theme cycling
- Get list of all themes
- Implement wrap-around logic
- Apply theme globally

STEP 4: Add persistence
- Save to localStorage
- Load on startup

STEP 5: Add notifications
- Use pi.ui.statusBar.showMessage()

Files to Modify:
- extensions/theme-cycler.ts

Files to Create:
- None

Dependencies:
- None (uses existing APIs)

Risk Assessment:
- LOW: Extends existing functionality
- No breaking changes
- LocalStorage already used elsewhere

Estimated Time: 15-20 minutes
```

## Best Practices

1. **Provide Scout output** - Give Planners context from GATHER
2. **Be actionable** - Steps should be specific and executable
3. **Include risk assessment** - Identify potential issues
4. **List files explicitly** - Specify what to create/modify
5. **Consider edge cases** - Plan for error scenarios

## See Also

- [Agent Roles Overview](roles.md)
- [PLAN Phase](../concepts/phases.md#plan)
- [Context Variables](../concepts/context-variables.md)