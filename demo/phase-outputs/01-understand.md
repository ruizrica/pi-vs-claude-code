# Phase 1: UNDERSTAND - Example Output

This document shows an example of the UNDERSTAND phase in action.

## User Input

```
User: Add a dark theme toggle extension that cycles through themes when pressing Ctrl+T
```

## Clarifying Questions

The pipeline asks clarifying questions to ensure full understanding:

```
Pipeline: Before proceeding, I have a few clarifying questions:

1. Should the toggle work globally (affecting all open files) or per-file?

2. What keyboard shortcut do you prefer?
   - Ctrl+T (cycling through all themes)
   - Ctrl+Shift+T (toggle between light/dark only)
   - Custom shortcut

3. Should the theme preference persist across sessions?

4. Do you want visual feedback when the theme changes?
   - Yes, show a notification
   - Yes, update status bar
   - No feedback needed
```

## User Responses

```
User:
1. Global toggle
2. Ctrl+T cycling through ALL themes
3. Yes, persist the preference
4. Yes, show a brief notification in the status bar
```

## Phase Summary

The pipeline summarizes the clarified requirements:

```
=== PHASE 1: UNDERSTAND - COMPLETE ===

Task: Add a dark theme toggle extension
Clarified Requirements:
- Global theme toggle (affects all open files)
- Keyboard shortcut: Ctrl+T cycles through ALL available themes
- Persist preference across sessions using local storage
- Show brief notification in status bar when theme changes

Context Variables Set:
$TASK = "Add a dark theme toggle extension"
$CONTEXT = "Global toggle, Ctrl+T cycles all themes, persist preference, status bar notification"

Ready to proceed to GATHER phase.
```

## Key Points

The UNDERSTAND phase:
- Uses **interactive mode** - real conversation with the user
- Asks clarifying questions until requirements are clear
- Sets `$TASK` and `$CONTEXT` variables for future phases
- Provides summary that advances to next phase

## Next Phase

The pipeline now has clear requirements to pass to the GATHER phase where Scout agents will explore the codebase.