# Phase 4: EXECUTE - Example Output

This document shows an example of the EXECUTE phase where Builder agents implement the feature.

## Phase Configuration

```yaml
name: execute
description: "Implement the feature"
mode: parallel
agents:
  - role: builder
```

## Builder Task

```
[Builder] Implementing feature...

Plan:
1. Analyze existing theme-cycler.ts
2. Add Ctrl+T keyboard shortcut
3. Implement theme cycling logic
4. Add persistence
5. Add status bar notification

Context:
- Target: extensions/theme-cycler.ts
- Use pi.keymap() for Ctrl+T binding
- Use localStorage for persistence
- Use pi.ui.statusBar.showMessage() for notifications
```

## Implementation

```
=== PHASE 4: EXECUTE - COMPLETE ===

Implementation Summary:

File Modified: extensions/theme-cycler.ts

Changes Made:

1. Added Ctrl+T keymap registration:
   ```typescript
   pi.keymap({
     ctrl: true,
     key: "t",
     action: () => cycleAllThemes()
   })
   ```

2. Added cycleAllThemes() function:
   ```typescript
   function cycleAllThemes() {
     const themes = Object.keys(themeMap);
     const current = themeMap.current;
     const currentIndex = themes.indexOf(current);
     const nextIndex = (currentIndex + 1) % themes.length;
     const nextTheme = themes[nextIndex];
     
     themeMap.setTheme(nextTheme);
     saveThemePreference(nextTheme);
     showThemeNotification(nextTheme);
   }
   ```

3. Added preference persistence:
   ```typescript
   function saveThemePreference(theme: string) {
     localStorage.setItem("preferred-theme", theme);
   }
   
   function loadThemePreference(): string | null {
     return localStorage.getItem("preferred-theme");
   }
   ```

4. Added notification:
   ```typescript
   function showThemeNotification(theme: string) {
     pi.ui.statusBar.showMessage(`Theme: ${theme}`, 2000);
   }
   ```

5. Added startup theme loading:
   ```typescript
   pi.on("load", () => {
     const saved = loadThemePreference();
     if (saved && themeMap[saved]) {
       themeMap.setTheme(saved);
     }
   });
   ```

Files Created: none
Files Modified: extensions/theme-cycler.ts
Lines Added: ~40
Lines Modified: ~5
```

## Context Variables Set

```
$EXECUTE_OUTPUT = <implementation summary above>
```

## Key Points

The EXECUTE phase:
- Uses **parallel mode** - Builders can work simultaneously (or single builder)
- Uses $PLAN and $CONTEXT to guide implementation
- Reports具体 changes made
- Sets $EXECUTE_OUTPUT for the REVIEW phase

## Next Phase

The Reviewer will examine this implementation and either approve or request changes.