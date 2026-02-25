# Phase 3: PLAN - Example Output

This document shows an example of the PLAN phase where the Planner creates an implementation strategy.

## Phase Configuration

```yaml
name: plan
description: "Create implementation plan"
mode: sequential
agents:
  - role: planner
```

## Planner Task

```
[Planner] Creating implementation strategy...

Task: Plan implementation for: Add a dark theme toggle extension

Context from UNDERSTAND:
- Global theme toggle (affects all open files)
- Keyboard shortcut: Ctrl+T cycles through ALL available themes
- Persist preference across sessions using localStorage
- Show brief notification in status bar when theme changes

Scout Findings from GATHER:
- Target: extensions/theme-cycler.ts (extend existing)
- Pattern: Use pi.keymap() for Ctrl+T binding
- Storage: Use localStorage for persistence
- UI: Use pi.ui.statusBar.showMessage() for notifications
```

## Implementation Plan

```
=== PHASE 3: PLAN - COMPLETE ===

Implementation Plan: Theme Toggle Extension

STEP 1: Analyze existing theme-cycler.ts
├── Read current implementation
├── Understand theme cycling logic
└── Identify where to add Ctrl+T handler

STEP 2: Add Ctrl+T keyboard shortcut
├── Use pi.keymap() to register Ctrl+T
├── Ensure it doesn't conflict with Ctrl+Shift+T
└── Test shortcut registration

STEP 3: Implement theme cycling logic
├── Get list of all available themes
├── Cycle to next theme in list
├── Handle wrap-around (last → first)
└── Apply theme globally

STEP 4: Add persistence
├── Save current theme to localStorage on change
├── Load saved theme on extension load
└── Apply saved theme on startup

STEP 5: Add status bar notification
├── Use pi.ui.statusBar.showMessage()
├── Display theme name briefly (2 seconds)
└── Show in bottom-left corner

Files to Modify:
- extensions/theme-cycler.ts (add Ctrl+T handler + notification)

Dependencies:
- No new dependencies needed
- Uses existing Pi SDK APIs

Risk Assessment:
- LOW RISK: Extends existing functionality
- No breaking changes to existing Ctrl+Shift+T
- LocalStorage is already used in codebase

Estimated Time: 15-20 minutes
```

## Context Variables Set

```
$PLAN = <the implementation plan above>
```

## Key Points

The PLAN phase:
- Uses **sequential mode** - runs after GATHER completes
- Planner has access to both $CONTEXT and $SCOUT_OUTPUT
- Creates actionable steps, not just vague ideas
- Includes risk assessment and file list
- Sets $PLAN for the EXECUTE phase

## Next Phase

The Builder will use this plan to implement the feature.