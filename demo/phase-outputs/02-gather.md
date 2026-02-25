# Phase 2: GATHER - Example Output

This document shows an example of the GATHER phase where Scout agents explore the codebase in parallel.

## Phase Configuration

```yaml
name: gather
description: "Explore codebase for context"
mode: parallel
agents:
  - role: scout (x3)
```

## Scout Agents Launched

Three Scout agents are dispatched in parallel, each with a different focus:

---

### Scout #1: Project Structure Explorer

```
[Scout #1] Exploring project structure...

Task: Find relevant directories and files for adding a theme toggle extension

Findings:
├── extensions/           # Extension directory - PRIMARY TARGET
│   ├── theme-cycler.ts  # EXISTING - similar functionality!
│   ├── themeMap.ts      # Theme definitions
│   └── pipeline-team.ts # Extension patterns to follow
├── .pi/                 # Agent definitions
├── css/styles.css       # Theme CSS
└── js/main.js           # Theme handling

Technology Stack:
- TypeScript (extensions)
- Pi Agent SDK (@mariozechner/pi-coding-agent)
- YAML for configuration

Pattern to follow: extensions/*.ts register tools via pi.on()
```

**Status: ✓ Complete**

---

### Scout #2: Theme Pattern Finder

```
[Scout #2] Finding theme patterns...

Task: Find existing theme-related code patterns

Findings:
├── theme-cycler.ts already implements:
│   - Theme cycling logic
│   - Keyboard shortcut handling (Ctrl+Shift+T)
│   - Uses pi.keymap() for key bindings
│
├── themeMap.ts contains:
│   - Theme definitions as objects
│   - getTheme(), setTheme() functions
│   - Theme persistence via localStorage
│
├── index.html has:
│   - Canvas-based theming via CSS variables
│   - Theme application via document.body.className

Opportunity: Extend existing theme-cycler.ts rather than create new file
```

**Status: ✓ Complete**

---

### Scout #3: Extension Pattern Finder

```
[Scout #3] Finding extension patterns...

Task: Find patterns for creating extensions

Findings:
├── Extension pattern (from theme-cycler.ts):
│   1. Use jiti runtime for TypeScript
│   2. Register with pi.on('load', ...) or top-level
│   3. Use pi.ui for UI interactions
│   4. Use pi.keymap() for shortcuts
│   5. Export nothing (side-effects only)
│
├── Tool registration pattern:
│   pi.on('load', () => {
│     pi.tools.myTool = { ... }
│   })
│
├── UI patterns:
│   - pi.ui.statusBar.showMessage(text, duration)
│   - pi.ui.notify(message)
```

**Status: ✓ Complete**

---

## Consolidated Findings

```
=== PHASE 2: GATHER - COMPLETE ===

Scout Reports Consolidated:
1. Target: extensions/theme-cycler.ts (extend existing)
2. Pattern: Use pi.keymap() for Ctrl+T binding
3. Storage: Use localStorage for persistence
4. UI: Use pi.ui.statusBar.showMessage() for notifications

Files to Modify:
- extensions/theme-cycler.ts (add Ctrl+T support)
- Possibly css/styles.css (if new styles needed)

Ready to proceed to PLAN phase.
```

## Context Variables Set

```
$SCOUT_OUTPUT = <consolidated findings above>
$CONTEXT = <previous context> + <scout findings>
```

## Key Points

The GATHER phase:
- Uses **parallel mode** - all Scouts run simultaneously
- Each Scout has a focused task template
- Results are automatically consolidated
- Sets `$SCOUT_OUTPUT` for the PLAN phase

## Next Phase

The Planner will use these findings to create an implementation plan.