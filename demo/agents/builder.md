# Builder Agent

The Builder agent is used in the **EXECUTE** phase to implement features and make changes.

## Role Summary

| Attribute | Value |
|-----------|-------|
| **Primary Phase** | EXECUTE |
| **Mode** | Parallel (multiple Builders can run simultaneously) |
| **Purpose** | Implement features, create/modify files |
| **Tools** | Full codebase tools (read, write, edit, bash) |

## When to Use Builders

Use Builder agents when you need to:
- Write new code
- Modify existing files
- Create configuration files
- Run build commands
- Implement planned features

## Task Template

```yaml
agents:
  - role: builder
    task_template: |
      Implement the following plan:

      $PLAN

      Context:
      $CONTEXT

      Follow existing code patterns.
      Create clean, well-documented code.
```

## Input Variables

The Builder receives:
- `$TASK` - Original user request
- `$CONTEXT` - Accumulated context
- `$PLAN` - Implementation plan from Planner
- `$SCOUT_OUTPUT` - Scout findings (optional)

## Example Implementation

```typescript
// Example: Implementing theme toggle in theme-cycler.ts

// Step 1: Add keyboard shortcut
pi.keymap({
  ctrl: true,
  alt: true,
  key: "t",
  action: () => cycleAllThemes()
});

// Step 2: Implement theme cycling
function cycleAllThemes() {
  const themes = Object.keys(themeMap);
  const currentIndex = themes.indexOf(themeMap.current);
  const nextIndex = (currentIndex + 1) % themes.length;
  themeMap.setTheme(themes[nextIndex]);
}

// Step 3: Add persistence
function saveThemePreference(theme: string) {
  try {
    localStorage.setItem("preferred-theme", theme);
  } catch (e) {
    console.warn("Could not save theme preference");
  }
}

// Step 4: Add notification
function showThemeNotification(theme: string) {
  pi.ui.statusBar.showMessage(`Theme: ${theme}`, 2000);
}
```

## Output Format

Builders should report:

```
=== IMPLEMENTATION COMPLETE ===

Files Modified:
- extensions/theme-cycler.ts

Files Created:
- None

Changes Made:
- Added Ctrl+Alt+T keymap registration
- Added cycleAllThemes() function
- Added theme persistence via localStorage
- Added status bar notification

Lines Added: ~40
Lines Modified: ~5
```

## Best Practices

1. **Follow the plan** - Use $PLAN as your guide
2. **Match existing patterns** - Look at how similar code is written
3. **Write clean code** - Add comments, use proper formatting
4. **Test incrementally** - Verify changes work
5. **Report changes** - Clearly document what was done

## See Also

- [Agent Roles Overview](roles.md)
- [EXECUTE Phase](../concepts/phases.md#execute)
- [Context Variables](../concepts/context-variables.md)