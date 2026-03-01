set dotenv-load := true

ext := justfile_directory()

default:
    @just --list

# g1

# 1. default pi
pi:
    pi

dev:
    pi -e {{ext}}/extensions/subagent-widget.ts -e {{ext}}/extensions/tilldone.ts -e {{ext}}/extensions/pipeline-team.ts -e {{ext}}/extensions/user-question.ts -e {{ext}}/extensions/system-select.ts -e {{ext}}/ui/footer.ts

# 2. Pure focus pi: strip footer and status line entirely
ext-pure-focus:
    pi -e {{ext}}/extensions/pure-focus.ts

# 3. Minimal pi: model name + 10-block context meter
ext-minimal:
    pi -e {{ext}}/extensions/minimal.ts -e {{ext}}/extensions/theme-cycler.ts

# 4. Cross-agent pi: load commands from .claude/, .gemini/, .codex/ dirs
ext-cross-agent:
    pi -e {{ext}}/extensions/cross-agent.ts -e {{ext}}/extensions/minimal.ts

# 5. Purpose gate pi: declare intent before working, persistent widget, focus the system prompt on the ONE PURPOSE for this agent
ext-purpose-gate:
    pi -e {{ext}}/extensions/purpose-gate.ts -e {{ext}}/extensions/minimal.ts

# 6. Customized footer pi: Tool counter, model, branch, cwd, cost, etc.
ext-tool-counter:
    pi -e {{ext}}/extensions/tool-counter.ts

# 7. Tool counter widget: tool call counts in a below-editor widget
ext-tool-counter-widget:
    pi -e {{ext}}/extensions/tool-counter-widget.ts -e {{ext}}/extensions/minimal.ts

# 8. Subagent widget: /sub <task> with live streaming progress
ext-subagent-widget:
    pi -e {{ext}}/extensions/subagent-widget.ts -e {{ext}}/extensions/pure-focus.ts -e {{ext}}/extensions/theme-cycler.ts

# 9. TillDone: task-driven discipline — define tasks before working
ext-tilldone:
    pi -e {{ext}}/extensions/tilldone.ts -e {{ext}}/extensions/theme-cycler.ts

#g2

# 10. Agent team: dispatcher orchestrator with team select and grid dashboard
ext-agent-team:
    pi -e {{ext}}/extensions/agent-team.ts -e {{ext}}/extensions/theme-cycler.ts

# 11. System select: /system to pick an agent persona as system prompt
ext-system-select:
    pi -e {{ext}}/extensions/system-select.ts -e {{ext}}/extensions/minimal.ts -e {{ext}}/extensions/theme-cycler.ts

# 12. Launch with Damage-Control safety auditing
ext-damage-control:
    pi -e {{ext}}/extensions/damage-control.ts -e {{ext}}/extensions/minimal.ts -e {{ext}}/extensions/theme-cycler.ts

# 13. Agent chain: sequential pipeline orchestrator
ext-agent-chain:
    pi -e {{ext}}/extensions/agent-chain.ts -e {{ext}}/extensions/theme-cycler.ts

#g3

# 14. Pi Pi: meta-agent that builds Pi agents with parallel expert research
ext-pi-pi:
    pi -e {{ext}}/extensions/pi-pi.ts -e {{ext}}/extensions/theme-cycler.ts

# 15. MIC: hybrid orchestrator with lane dispatch, worktree isolation, multi-model review
ext-mic:
    pi -e {{ext}}/extensions/mic.ts -e {{ext}}/extensions/theme-cycler.ts

# 16. Plan Mode: Shift+Tab plan workflow UI with optional /sub dispatch
ext-plan-mode:
    pi -e {{ext}}/extensions/plan-mode.ts -e {{ext}}/extensions/theme-cycler.ts

# 17. Pipeline Team: hybrid pipeline with parallel dispatch and Ctrl+X overlay
ext-pipeline-team:
    pi -e {{ext}}/extensions/pipeline-team.ts -e {{ext}}/extensions/theme-cycler.ts

#ext

# 19. Footer: minimal dark-bg footer with cwd
ext-footer:
    pi -e {{ext}}/ui/footer.ts

# 20. User Question: ask_user tool with split-panel select, input, and confirm modes
ext-user-question:
    pi -e {{ext}}/extensions/user-question.ts -e {{ext}}/ui/footer.ts

# 17. Session Replay: scrollable timeline overlay of session history (legit)
ext-session-replay:
    pi -e {{ext}}/extensions/session-replay.ts -e {{ext}}/extensions/minimal.ts

# 18. Theme cycler: Ctrl+X forward, Ctrl+Q backward, /theme picker
ext-theme-cycler:
    pi -e {{ext}}/extensions/theme-cycler.ts -e {{ext}}/extensions/minimal.ts

# utils

# Run a lightweight README.md sanity check
check-readme:
    bun run {{ext}}/scripts/check-readme.mjs

# Open pi with one or more stacked extensions in a new terminal: just open minimal tool-counter
open +exts:
    #!/usr/bin/env bash
    args=""
    for ext in {{exts}}; do
        args="$args -e {{ext}}/extensions/$ext.ts"
    done
    cmd="cd '{{justfile_directory()}}' && pi$args"
    escaped="${cmd//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    osascript -e "tell application \"Terminal\" to do script \"$escaped\""

# Open every extension in its own terminal window
all:
    just open pi
    just open pure-focus
    just open minimal theme-cycler
    just open cross-agent minimal
    just open purpose-gate minimal
    just open tool-counter
    just open tool-counter-widget minimal
    just open subagent-widget pure-focus theme-cycler
    just open plan-mode theme-cycler
    just open tilldone theme-cycler
    just open agent-team theme-cycler
    just open system-select minimal theme-cycler
    just open damage-control minimal theme-cycler
    just open agent-chain theme-cycler
    just open pi-pi theme-cycler
    just open mic theme-cycler
