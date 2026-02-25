# Reviewer Agent

The Reviewer agent is used in the **REVIEW** phase to evaluate implementations and provide feedback.

## Role Summary

| Attribute | Value |
|-----------|-------|
| **Primary Phase** | REVIEW |
| **Mode** | Sequential (loops up to 3 times) |
| **Purpose** | Quality assurance, bug finding, approval |
| **Tools** | Read-only + review-specific tools |

## When to Use Reviewers

Use Reviewer agents when you need to:
- Verify code quality
- Find bugs or issues
- Ensure standards are met
- Validate implementation against plan
- Approve or request changes

## Task Template

```yaml
agents:
  - role: reviewer
    task_template: |
      Review implementation for: $TASK

      Plan:
      $PLAN

      Context:
      $CONTEXT

      Implementation:
      $EXECUTE_OUTPUT

      Provide:
      1. Overall assessment (APPROVED or issues)
      2. Specific issues (if any)
      3. Recommendations
```

## Review Loop

The REVIEW phase supports looping:
- **Max iterations**: 3
- **Flow**: Review → Issues Found → Fix → Review Again
- **Exit**: Either APPROVED or after 3 iterations

```
┌──────────────┐
│   REVIEW     │
│  Iteration 1 │──── Issues Found ────▶ Fix Issues
└──────┬───────┘                              │
       │                                      │
   APPROVED?                                  │
       │ No                                   │
       ▼                                      │
┌──────────────┐                              │
│   REVIEW     │──── No Issues ────▶ APPROVED │
│  Iteration 2 │                              │
└──────────────┘                              │
       │                                      │
   APPROVED? ───▶ (repeat up to 3x)           │
       │                                      │
      Yes                                     │
       ▼                                      │
  COMPLETE                                    │
```

## Example Reviews

### Review Finding Issues
```
=== REVIEW ===

Task: Add dark theme toggle extension

Issues Found:
1. MODERATE: Shortcut Ctrl+T conflicts with browser (new tab)
2. LOW: Notification duration too short (2s)
3. LOW: No error handling for localStorage

Recommendation:
- Change to Ctrl+Alt+T
- Increase to 3 seconds
- Add try/catch

Status: CHANGES REQUESTED
```

### Review Approving
```
=== REVIEW ===

Task: Add dark theme toggle extension

Assessment:
✓ Code follows existing patterns
✓ All plan items implemented
✓ No syntax errors
✓ Error handling added
✓ Tests would pass

Status: APPROVED ✓
```

## Best Practices

1. **Check against plan** - Verify all planned items were done
2. **Be specific** - List exact issues, not vague feedback
3. **Categorize severity** - Critical, Moderate, Low
4. **Provide solutions** - Don't just criticize, suggest fixes
5. **Know when to approve** - Don't block on trivial issues

## Output Format

```
=== REVIEW ===

Assessment:
- Overall: <APPROVED or CHANGES REQUESTED>
- Issues Found: <count>
  - <severity>: <description>

Recommendations:
- <recommendation 1>
- <recommendation 2>

Status: <APPROVED/CHANGES REQUESTED>
```

## See Also

- [Agent Roles Overview](roles.md)
- [REVIEW Phase](../concepts/phases.md#review)
- [Context Variables](../concepts/context-variables.md)