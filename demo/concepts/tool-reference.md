# Tool Reference

The Pipeline Team extension provides three main tools for orchestration.

## Available Tools

| Tool | Description |
|------|-------------|
| `advance_phase` | Move to the next pipeline phase |
| `dispatch_agents` | Launch agents to do work |
| `pipeline_status` | Check current pipeline state |

---

## advance_phase

Moves the pipeline from the current phase to the next phase.

### Usage

```typescript
// Basic usage
await pi.tools.advance_phase({});

// With summary
await pi.tools.advance_phase({
  summary: "Task clarified: Add dark theme toggle extension"
});
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `summary` | string | No | Summary of what was accomplished in the current phase |

### Returns

```typescript
{
  success: true,
  nextPhase: "GATHER",
  message: "Moved to GATHER phase"
}
```

### When to Use

Call `advance_phase` when:
- ✅ Current phase tasks are complete
- ✅ You have all needed information
- ✅ User has provided required clarifications (UNDERSTAND)

Do NOT call when:
- ❌ Agents are still running
- ❌ Awaiting user input
- ❌ Current phase not complete

---

## dispatch_agents

Launches one or more agents to perform work in parallel or sequential mode.

### Usage

```typescript
// Dispatch single agent
await pi.tools.dispatch_agents({
  agents: [
    {
      role: "scout",
      task: "Explore the project structure"
    }
  ]
});

// Dispatch multiple agents (parallel)
await pi.tools.dispatch_agents({
  agents: [
    { role: "scout", task: "Find theme patterns" },
    { role: "scout", task: "Find extension patterns" },
    { role: "scout", task: "Find test patterns" }
  ]
});
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agents` | array | Yes | Array of agent configs |
| `agents[].role` | string | Yes | Agent role (scout, builder, etc.) |
| `agents[].task` | string | Yes | Task description |
| `agents[].session` | string | No | Custom session ID |

### Returns

```typescript
{
  success: true,
  agentsDispatched: 3,
  results: [
    { role: "scout", status: "complete", output: "..." },
    { role: "scout", status: "complete", output: "..." },
    { role: "scout", status: "complete", output: "..." }
  ]
}
```

### Context Variables in Tasks

Agents receive context variables automatically:

```typescript
// In UNDERSTAND/GATHER - use $TASK and $CONTEXT
{
  role: "scout",
  task: "Explore for: $TASK\n\nContext: $CONTEXT"
}

// In PLAN - use $SCOUT_OUTPUT
{
  role: "planner",
  task: "Plan for: $TASK\n\nScout findings: $SCOUT_OUTPUT"
}

// In EXECUTE - use $PLAN
{
  role: "builder",
  task: "Implement:\n$PLAN"
}
```

---

## pipeline_status

Returns the current state of the pipeline.

### Usage

```typescript
// Get full status
const status = await pi.tools.pipeline_status({});

// Access properties
console.log(status.currentPhase);  // "EXECUTE"
console.log(status.progress);       // 40
console.log(status.loops);          // 0
```

### Returns

```typescript
{
  pipeline: "default",
  currentPhase: "EXECUTE",
  phaseIndex: 4,
  totalPhases: 5,
  progress: 40,
  reviewLoops: 0,
  maxLoops: 3,
  phases: [
    { name: "UNDERSTAND", status: "done" },
    { name: "GATHER", status: "done" },
    { name: "PLAN", status: "done" },
    { name: "EXECUTE", status: "active" },
    { name: "REVIEW", status: "pending" }
  ],
  context: {
    TASK: "Add dark theme toggle",
    CONTEXT: "Global toggle, Ctrl+T shortcut"
  }
}
```

---

## Programmatic Access

### In Extensions

```typescript
// Check if in pipeline mode
if (pi.pipeline) {
  const status = await pi.tools.pipeline_status({});
  // handle status
}
```

### In Agent Templates

Variables are auto-substituted:

```yaml
task_template: |
  Current phase: $PHASE
  Task: $TASK
```

---

## Best Practices

1. **Use dispatch_agents in GATHER/EXECUTE** - These phases support parallelism
2. **Always advance_phase after completion** - Don't skip phases manually
3. **Check pipeline_status** - Before making decisions based on phase
4. **Use context variables** - Keep templates clean and dynamic

## See Also

- [Phases](phases.md)
- [Context Variables](context-variables.md)
- [Commands](commands.md)