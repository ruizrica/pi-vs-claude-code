# Common Workflow Patterns

This document shows common patterns for using the Pipeline Team.

## Workflow 1: Simple Feature Addition

**Use case**: Adding a small feature to an existing codebase

**Best pipeline**: `simple-feature.yaml`

**Steps**:
1. UNDERSTAND - Quick clarification (1-2 questions)
2. GATHER - One Scout for quick context
3. PLAN - Simple plan (3-5 steps)
4. EXECUTE - One Builder
5. REVIEW - Quick review (usually 1 iteration)

**Time estimate**: 3-5 minutes

**Example**: "Add a keyboard shortcut to toggle line numbers"

---

## Workflow 2: New Extension Creation

**Use case**: Creating a new Pi extension from scratch

**Best pipeline**: `demo-pipeline.yaml`

**Steps**:
1. UNDERSTAND - Thorough clarification (5+ questions)
2. GATHER - Multiple Scouts (structure, patterns, dependencies)
3. PLAN - Detailed plan with edge cases
4. EXECUTE - One or more Builders
5. REVIEW - Thorough review (2-3 iterations)

**Time estimate**: 10-20 minutes

**Example**: "Create a new extension that shows a clock in the status bar"

---

## Workflow 3: Code Refactoring

**Use case**: Safely refactoring existing code

**Best pipeline**: `refactoring.yaml`

**Steps**:
1. UNDERSTAND - Understand what to refactor and why
2. GATHER - Two Scouts (code analysis + test coverage)
3. PLAN - Plan with safety measures and rollback
4. EXECUTE - Builder implements in stages
5. REVIEW - Thorough review (verify tests still pass)

**Time estimate**: 15-30 minutes

**Example**: "Refactor the theme-cycler to use a class-based pattern"

---

## Workflow 4: Security Review

**Use case**: Finding and fixing security vulnerabilities

**Best pipeline**: `security-audit.yaml`

**Steps**:
1. UNDERSTAND - Clarify scope and concerns
2. GATHER - Scout + Red Team (parallel)
3. PLAN - Prioritize fixes by severity
4. EXECUTE - Builder implements fixes
5. REVIEW - Security-focused review

**Time estimate**: 15-45 minutes

**Example**: "Review the user input handling for vulnerabilities"

---

## Workflow 5: Bug Fix

**Use case**: Finding and fixing a bug

**Best pipeline**: `simple-feature.yaml` (adapted)

**Steps**:
1. UNDERSTAND - Understand bug symptoms
2. GATHER - Find relevant code
3. PLAN - Plan fix
4. EXECUTE - Implement fix
5. REVIEW - Verify fix works

**Time estimate**: 5-15 minutes

**Example**: "Fix the theme toggle not persisting on startup"

---

## Customizing Workflows

### Adjust Phase Modes

```yaml
phases:
  - name: gather
    mode: parallel  # Default - scouts run together
    # or
    mode: sequential  # Scouts run one at a time

  - name: execute
    mode: parallel  # Builders can work together
    # or
    mode: sequential  # One builder after another
```

### Skip Phases

```yaml
phases:
  - name: gather
    skip: true  # Skip if context is already known
```

### Add More Agents

```yaml
phases:
  - name: gather
    mode: parallel
    agents:
      - role: scout
        task_template: "Find files..."
      - role: scout  # More scouts = more parallel exploration
        task_template: "Find patterns..."
      - role: scout
        task_template: "Find tests..."
```

---

## Tips for Effective Workflows

1. **Right-size the pipeline** - Don't use a complex pipeline for simple tasks
2. **Be specific in UNDERSTAND** - More clarity = smoother execution
3. **Use parallel in GATHER/EXECUTE** - Faster execution
4. **Trust the reviewer** - Don't approve broken code to save time
5. **Iterate** - First run might reveal needed adjustments

## Pipeline Selection Guide

| Task Type | Recommended Pipeline |
|-----------|---------------------|
| Small feature | simple-feature |
| New extension | demo-pipeline |
| Refactoring | refactoring |
| Security work | security-audit |
| Bug fix | simple-feature |
| Unknown scope | demo-pipeline |

---

## See Also

- [Quick Start](../quickstart.md)
- [Phase Outputs](../phase-outputs/)
- [Pipeline Configs](../pipeline-configs/)