# Pipeline Team Demo

Welcome to the Pipeline Team Demo! This demo showcases the 5-phase pipeline workflow that orchestrates multiple AI agents to complete software development tasks.

## What is the Pipeline Team?

The Pipeline Team is a multi-agent orchestration system that coordinates specialized AI agents through a structured workflow:

- **Scout** - Explores and understands the codebase
- **Planner** - Creates implementation strategies
- **Builder** - Implements features and changes
- **Reviewer** - Reviews code and provides feedback
- **Documenter** - Creates documentation

## The 5 Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ UNDERSTAND  │───▶│   GATHER    │───▶│    PLAN     │        │
│   │ (Interactive│    │  (Parallel) │    │(Sequential) │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                           │           │
│         │                User clarifies task         │           │
│         ▼                                           ▼           │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   GATHER    │◀───│    PLAN     │◀───│   EXECUTE   │        │
│   │  (Parallel) │    │(Sequential) │    │  (Parallel) │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                           │           │
│         ▼                                           ▼           │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                      REVIEW                         │       │
│   │            (Loop up to 3 times)                     │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Details

| Phase | Mode | Description |
|-------|------|-------------|
| UNDERSTAND | Interactive | Clarify requirements with the user |
| GATHER | Parallel | Explore codebase with Scout agents |
| PLAN | Sequential | Create implementation plan |
| EXECUTE | Parallel | Implement with Builder agents |
| REVIEW | Sequential | Review and approve (loops up to 3x) |

## Demo Contents

- **[Quick Start](quickstart.md)** - Get up and running in 5 minutes
- **[Pipeline Configs](pipeline-configs/)** - Sample YAML configurations
- **[Phase Outputs](phase-outputs/)** - Example outputs from each phase
- **[Visual](visual/)** - ASCII diagrams and timelines
- **[Agents](agents/)** - Detailed agent role documentation
- **[Concepts](concepts/)** - Core pipeline concepts and tools
- **[Examples](examples/)** - Common workflow patterns

## Prerequisites

- Pi Coding Agent installed (`bun install -g pi`)
- This codebase (pi-vs-claude-code)

## Quick Start

```bash
# Run the pipeline team extension
pi -e extensions/pipeline-team.ts -e extensions/theme-cycler.ts

# Select a pipeline config when prompted
# Try: demo/pipeline-configs/demo-pipeline.yaml
```

## More Information

- See **[Concepts Overview](concepts/overview.md)** for deep dive
- See **[Tool Reference](concepts/tool-reference.md)** for pipeline tools
- See **[Commands Reference](concepts/commands.md)** for CLI commands