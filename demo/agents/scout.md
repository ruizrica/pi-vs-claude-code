# Scout Agent

The Scout agent is used in the **GATHER** phase to explore and understand the codebase.

## Role Summary

| Attribute | Value |
|-----------|-------|
| **Primary Phase** | GATHER |
| **Mode** | Parallel (multiple Scouts run simultaneously) |
| **Purpose** | Explore codebase, find patterns, gather context |
| **Tools** | Full codebase tools |

## When to Use Scouts

Use Scout agents when you need to:
- Understand project structure
- Find specific files or patterns
- Identify dependencies
- Discover existing implementations
- Gather context for planning

## Task Template

```yaml
agents:
  - role: scout
    task_template: |
      Explore for: $TASK

      Context:
      $CONTEXT

      Find:
      1. Relevant directories and files
      2. Technology stack
      3. Existing patterns
      4. Potential conflicts
```

## Example Tasks

### Project Structure Exploration
```
"Explore the project structure. Find:
1. Main entry points
2. Configuration files
3. Source directories
4. Test locations"
```

### Pattern Finding
```
"Find all instances of error handling patterns.
Report:
1. Files with try/catch
2. Common patterns used
3. Best practices observed"
```

### Dependency Analysis
```
"Find all imports of the 'axios' package.
Report:
1. Files that import it
2. Common use cases
3. Version being used"
```

## Output Format

Scouts should provide structured output:

```
=== SCOUT REPORT ===

Findings:
1. <finding 1>
2. <finding 2>
3. <finding 3>

Files Identified:
- /path/to/file1.ts
- /path/to/file2.ts

Patterns Found:
- Pattern A: <description>
- Pattern B: <description>

Recommendations:
- <recommendation 1>
- <recommendation 2>
```

## Best Practices

1. **Be specific** - Give Scouts focused tasks
2. **Use parallel execution** - Run multiple Scouts for different aspects
3. **Consolidate results** - Gather outputs and merge findings
4. **Set clear scope** - Limit exploration to relevant areas

## See Also

- [Agent Roles Overview](roles.md)
- [GATHER Phase](../concepts/phases.md#gather)
- [Context Variables](../concepts/context-variables.md)