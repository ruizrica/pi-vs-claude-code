# Agent Roles Overview

The Pipeline Team orchestrates multiple specialized AI agents to complete software development tasks. Each agent has a specific role and set of capabilities.

## Available Agents

| Agent | Phase(s) | Mode | Description |
|-------|----------|------|-------------|
| **Scout** | GATHER | Parallel | Explores and understands the codebase |
| **Planner** | PLAN | Sequential | Creates implementation strategies |
| **Builder** | EXECUTE | Parallel | Implements features and changes |
| **Reviewer** | REVIEW | Sequential | Reviews code and provides feedback |
| **Documenter** | Any | Parallel | Creates documentation |
| **Red Team** | GATHER/REVIEW | Parallel | Security testing and vulnerability finding |

## Agent Capabilities

### Scout
- **Purpose**: Explore codebase and gather context
- **Tools**: Full codebase tools (read, search, glob, etc.)
- **Best for**: Finding files, understanding patterns, identifying dependencies
- **Output**: Structured findings report

### Planner
- **Purpose**: Create implementation strategies
- **Tools**: Read-only codebase tools + planning capabilities
- **Best for**: Breaking down complex tasks, identifying risks, sequencing work
- **Output**: Step-by-step implementation plan

### Builder
- **Purpose**: Implement features and changes
- **Tools**: Full codebase tools (read, write, edit, bash)
- **Best for**: Writing code, creating files, making changes
- **Output**: Modified files, implementation summary

### Reviewer
- **Purpose**: Quality assurance and review
- **Tools**: Read-only + review-specific tools
- **Best for**: Evaluating code quality, finding bugs, ensuring standards
- **Output**: Approval or issue list

### Documenter
- **Purpose**: Create and maintain documentation
- **Tools**: Full codebase tools + documentation tools
- **Best for**: README files, API docs, code comments
- **Output**: Documentation files

### Red Team
- **Purpose**: Security testing and vulnerability finding
- **Tools**: Security scanning tools + codebase access
- **Best for**: Finding vulnerabilities, security audits
- **Output**: Security findings report

## Agent Configuration

Agents are configured in pipeline YAML files:

```yaml
phases:
  - name: gather
    mode: parallel
    agents:
      - role: scout
        task_template: |
          Explore: $TASK
          Context: $CONTEXT
```

## Task Templates

Each agent receives a task template with context variables:

- `$TASK` - The user's original request
- `$CONTEXT` - Accumulated context from previous phases
- `$SCOUT_OUTPUT` - Results from Scout agents (in PLAN/EXECUTE)
- `$PLAN` - Implementation plan (in EXECUTE/REVIEW)
- `$EXECUTE_OUTPUT` - Implementation results (in REVIEW)

## Session Persistence

Agents maintain session context across invocations:
- Each agent gets its own Pi session
- Sessions can be resumed with `--session` flag
- Enables cross-invocation memory

## See Also

- [Scout Agent](scout.md)
- [Planner Agent](planner.md)
- [Builder Agent](builder.md)
- [Reviewer Agent](reviewer.md)