# Pipeline Team Overview

The Pipeline Team is a multi-agent orchestration system that coordinates specialized AI agents through a structured software development workflow.

## What is the Pipeline Team?

The Pipeline Team extends Pi Coding Agent with:
- **Multi-phase workflow** - 5 distinct phases from understanding to review
- **Agent orchestration** - Coordinates multiple specialized agents
- **Context passing** - Variables flow through phases automatically
- **Visual widget** - Real-time progress tracking

## Core Concepts

### 1. Pipeline Configuration

Pipelines are defined in YAML files:

```yaml
name: my-pipeline
description: "What this pipeline does"
review_max_loops: 3

phases:
  - name: understand
    mode: interactive
  - name: gather
    mode: parallel
    agents:
      - role: scout
  - name: plan
    mode: sequential
    agents:
      - role: planner
  - name: execute
    mode: parallel
    agents:
      - role: builder
  - name: review
    mode: sequential
    max_iterations: 3
    agents:
      - role: reviewer
```

### 2. Phase Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Interactive | User conversation | UNDERSTAND |
| Parallel | Multiple agents simultaneously | GATHER, EXECUTE |
| Sequential | One agent after another | PLAN, REVIEW |

### 3. Agent Roles

- **Scout** - Explores codebase
- **Planner** - Creates strategies
- **Builder** - Implements features
- **Reviewer** - Quality assurance
- **Documenter** - Creates docs
- **Red Team** - Security testing

### 4. Context Variables

Information flows through phases via context variables:
- `$TASK` - User's original request
- `$CONTEXT` - Accumulated context
- `$SCOUT_OUTPUT` - Scout findings
- `$PLAN` - Implementation plan
- `$EXECUTE_OUTPUT` - Implementation results

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │  YAML    │──▶│  Parser  │──▶│ Context  │                │
│  │  Config  │   │          │   │ Manager  │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                         │                   │
│                                         ▼                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │  Agent   │◀──│ Dispatch │◀──│  Phase   │                │
│  │  Pool    │   │   er     │   │ Controller│               │
│  └──────────┘   └──────────┘   └──────────┘                │
│                         │                                   │
│                         ▼                                   │
│                  ┌──────────┐                               │
│                  │  Widget  │ (Ctrl+J overlay)              │
│                  └──────────┘                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

1. **Install**: `pi -e extensions/pipeline-team.ts`
2. **Select**: Choose a pipeline config
3. **Execute**: Run through the phases
4. **Review**: Get approval or iterate

## See Also

- [Phases](phases.md)
- [Context Variables](context-variables.md)
- [Tool Reference](tool-reference.md)
- [Commands](commands.md)