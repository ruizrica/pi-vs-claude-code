# Phase 5: REVIEW - Example Output

This document shows an example of the REVIEW phase where the Reviewer examines the implementation.

## Phase Configuration

```yaml
name: review
description: "Review and approve implementation"
mode: sequential
max_iterations: 3
agents:
  - role: reviewer
```

## Reviewer Task

```
[Reviewer] Examining implementation...

Task: Add dark theme toggle extension

Plan:
1. Analyze existing theme-cycler.ts
2. Add Ctrl+T keyboard shortcut
3. Implement theme cycling logic
4. Add persistence
5. Add status bar notification

Implementation:
- Modified: extensions/theme-cycler.ts
- Added: Ctrl+T keymap, cycleAllThemes(), preference persistence, notification
```

## Review #1

```
=== REVIEW ITERATION 1 ===

Reviewer Assessment:

Issues Found:
1. MODERATE: The Ctrl+T shortcut may conflict with browser default 
   (Ctrl+T typically opens new tab). Consider using a less common shortcut.

2. LOW: The theme notification duration (2000ms) might be too short for 
   users to read. Consider 3000ms.

3. LOW: No error handling if localStorage is disabled.

Recommended Fixes:
- Option A: Change shortcut to Ctrl+Alt+T (less common)
- Option B: Keep Ctrl+T but add note to user
- Increase notification duration to 3000ms
- Add try/catch around localStorage operations

Status: CHANGES REQUESTED
```

## Builder Response

```
[Builder] Addressing review feedback...

Changes Made:
1. Changed shortcut from Ctrl+T to Ctrl+Alt+T (avoids browser conflict)
2. Increased notification duration to 3000ms
3. Added try/catch for localStorage operations
```

## Review #2

```
=== REVIEW ITERATION 2 ===

Reviewer Assessment:

Issues Found:
- None! All previous issues have been addressed.

Code Quality:
✓ Clean, readable code
✓ Proper error handling added
✓ Follows existing code patterns
✓ Good use of Pi SDK APIs

Status: APPROVED ✓
```

## Final Result

```
=== PHASE 5: REVIEW - COMPLETE ===

Review Summary:
- Iterations: 2/3
- Status: APPROVED
- Issues Resolved: 3 (1 moderate, 2 low)

The implementation is ready!

Files Approved:
- extensions/theme-cycler.ts (modified)

This pipeline has successfully:
1. Understood user requirements
2. Gathered codebase context
3. Planned the implementation
4. Executed the changes
5. Reviewed and approved the work

🎉 PIPELINE COMPLETE!
```

## Key Points

The REVIEW phase:
- Uses **sequential mode** with loop capability (up to 3 iterations)
- Reviewer can request changes or approve
- If issues found, pipeline loops back to EXECUTE
- If approved, pipeline completes
- Sets final status for the task

## Pipeline Complete!

All 5 phases have been successfully completed:
- ✅ UNDERSTAND - Requirements clarified
- ✅ GATHER - Codebase explored
- ✅ PLAN - Strategy created
- ✅ EXECUTE - Feature implemented
- ✅ REVIEW - Approved after 1 revision