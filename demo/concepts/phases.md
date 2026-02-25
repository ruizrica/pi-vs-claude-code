# Pipeline Phases

The Pipeline Team executes through 5 distinct phases. Each phase has a specific purpose and mode of operation.

## Phase Overview

| Phase | Mode | Agents | Purpose |
|-------|------|--------|---------|
| UNDERSTAND | Interactive | None | Clarify requirements |
| GATHER | Parallel | Scout | Explore codebase |
| PLAN | Sequential | Planner | Create strategy |
| EXECUTE | Parallel | Builder | Implement feature |
| REVIEW | Sequential | Reviewer | Quality check |

## Phase Details

---

### UNDERSTAND

**Purpose**: Clarify the user's task through interactive conversation

**Mode**: Interactive (user conversation)

**Agents**: None

**Key Actions**:
1. Present user's task
2. Ask clarifying questions
3. Collect user answers
4. Set `$TASK` and `$CONTEXT`

**Example**:
```
Pipeline: What would you like to build?
> Add a dark theme toggle

Pipeline: Should this be global or per-file?
> Global

Pipeline: Any keyboard shortcut preference?
> Ctrl+T

Summary: Create a global dark theme toggle with Ctrl+T shortcut
```

**Context Set**:
- `$TASK` = "Add a dark theme toggle"
- `$CONTEXT` = "Global toggle with Ctrl+T shortcut"

---

### GATHER

**Purpose**: Explore the codebase to gather context

**Mode**: Parallel (multiple Scout agents run simultaneously)

**Agents**: Scout (1-5 typically)

**Key Actions**:
1. Dispatch Scout agents with task templates
2. Each Scout explores different aspects
3. Results are consolidated into `$SCOUT_OUTPUT`

**Example**:
```
Dispatching 3 Scout agents:
- Scout #1: Project structure
- Scout #2: Theme patterns  
- Scout #3: Extension patterns
```

**Context Set**:
- `$SCOUT_OUTPUT` = consolidated findings

---

### PLAN

**Purpose**: Create an implementation strategy

**Mode**: Sequential (runs after GATHER completes)

**Agents**: Planner (1)

**Key Actions**:
1. Planner receives context + Scout output
2. Creates step-by-step implementation plan
3. Includes risk assessment and file list

**Example Plan**:
```
STEP 1: Analyze existing theme-cycler.ts
STEP 2: Add Ctrl+T keyboard shortcut
STEP 3: Implement theme cycling logic
STEP 4: Add localStorage persistence
STEP 5: Add status bar notification
```

**Context Set**:
- `$PLAN` = implementation plan

---

### EXECUTE

**Purpose**: Implement the feature

**Mode**: Parallel (Builder agents can work simultaneously)

**Agents**: Builder (1-3 typically)

**Key Actions**:
1. Builder receives plan + context
2. Implements each step
3. Reports changes made

**Example**:
```
Executing:
- Builder: Implementing theme toggle
  - Added Ctrl+Alt+T keymap
  - Added cycleAllThemes() function
  - Added persistence
```

**Context Set**:
- `$EXECUTE_OUTPUT` = implementation summary

---

### REVIEW

**Purpose**: Quality assurance and approval

**Mode**: Sequential with loops (up to 3 iterations)

**Agents**: Reviewer (1)

**Key Actions**:
1. Reviewer examines implementation
2. Either approves or requests changes
3. If issues, loop back to EXECUTE
4. If approved, pipeline completes

**Review Loop**:
```
REVIEW 1 → Issues Found → Fix → REVIEW 2 → Approved → COMPLETE
```

**Context Set**:
- `$REVIEW_OUTPUT` = review feedback

## Phase Progression

```
UNDERSTAND ──▶ GATHER ──▶ PLAN ──▶ EXECUTE ──▶ REVIEW
    │            │         │          │          │
    │            │         │          │          │
    ▼            ▼         ▼          ▼          ▼
$CONTEXT   $SCOUT_OUTPUT  $PLAN   $EXECUTE_OUTPUT $REVIEW
```

##Skipping Phases

Phases can be skipped if not needed:
```yaml
phases:
  - name: understand
    mode: interactive  # Need this
  - name: gather
    mode: parallel
    skip: true  # Skip if context already known
```

## See Also

- [Context Variables](context-variables.md)
- [Tool Reference](tool-reference.md)
- [Agent Roles](../agents/roles.md)