# Pi vs Claude Code — Comprehensive Repository Analysis

**Repository:** `/Users/ricardo/Workshop/Github-Work/pi-vs-claude-code`  
**Date:** February 24, 2026  
**Project Type:** Pi Coding Agent Extension Playground & Demonstration

---

## 1. PROJECT OVERVIEW

### Purpose
This is a **customization and demonstration repository** for [Pi Coding Agent](https://github.com/mariozechner/pi-coding-agent) — an open-source alternative to Claude Code. The repo showcases:

- **14 production-ready Pi extensions** demonstrating advanced features
- **Multi-agent orchestration patterns** (teams, chains, subagents)
- **Safety auditing and damage control** mechanisms
- **Cross-agent integration** with other coding agents (Claude, Gemini, Codex)
- **Comprehensive comparison documentation** against Claude Code (CC)

### Core Thesis
"Hedge against the leader in the agentic coding market (Claude Code) by showcasing how to customize the Pi Coding Agent UI, agent orchestration tools, safety auditing, and cross-agent integrations."

### Key Differentiator: **Pi is Open Source (MIT)**
- **Cost:** $0 (bring your own API keys)
- **Freedom:** Fork/embed/self-host
- **Extensibility:** In-process TypeScript extensions with full session state access
- **Multi-model:** 324+ models across 20+ providers (vs Claude Code's Claude-only focus)

---

## 2. DIRECTORY STRUCTURE & ORGANIZATION

```
pi-vs-cc/
├── extensions/              # 16 TypeScript extension files (4,860 total lines)
├── specs/                   # Feature specifications (4 markdown files)
├── .pi/
│   ├── agents/              # Agent definitions and orchestration configs
│   │   ├── pi-pi/          # Expert agents for pi-pi meta-agent
│   │   ├── *.md            # Individual agent personas (planner, builder, etc.)
│   │   ├── teams.yaml      # Team definitions (7 teams defined)
│   │   └── agent-chain.yaml # Pipeline workflows (5 workflows defined)
│   ├── themes/              # 11 custom color themes (JSON)
│   ├── skills/              # Custom skills directory
│   ├── damage-control-rules.yaml # Security policy rules (140+ patterns)
│   ├── settings.json        # Pi workspace configuration
│   ├── bowser/              # Bowser agent directory
│   └── agent-sessions/      # Ephemeral session files (gitignored)
├── .claude/                 # Claude Code commands (cross-compatibility)
│   └── commands/
│       └── prime.md         # Prime command integration
├── Documentation Files
│   ├── README.md            # Main documentation (~500 lines)
│   ├── CLAUDE.md            # Quick reference for developers
│   ├── COMPARISON.md        # Claude Code vs Pi Agent feature matrix
│   ├── TOOLS.md             # Built-in tool function signatures
│   ├── THEME.md             # Color token conventions
│   └── RESERVED_KEYS.md     # Keyboard binding guidance
├── Configuration
│   ├── package.json         # Project dependencies
│   ├── bun.lock            # Lock file (uses Bun, not npm)
│   ├── justfile            # Task runner recipes (20+ recipes)
│   └── .env.sample         # API key template
├── Support Files
│   ├── .gitignore          # Git exclusions
│   └── images/             # Pi logo assets

```

---

## 3. FILE INVENTORY & PURPOSES

### Extensions (16 files, 4,860 lines total)

| File | Lines | Purpose | Type |
|------|-------|---------|------|
| **agent-team.ts** | 734 | Dispatcher orchestrator; primary agent delegates to specialist agents via `dispatch_agent` tool; shows grid dashboard | Multi-agent |
| **agent-chain.ts** | 797 | Sequential pipeline orchestrator; chains agents where output becomes next input; `/chain` command | Multi-agent |
| **pi-pi.ts** | 633 | Meta-agent that builds Pi extensions using parallel research experts (11 specialized agents in `.pi/agents/pi-pi/`) | Meta-orchestration |
| **tilldone.ts** | 726 | Task discipline system; define tasks before working, track completion across steps, live progress footer | Workflow |
| **subagent-widget.ts** | 481 | `/sub <task>` spawns background Pi subagents with streaming live-progress widgets above editor | Subagent |
| **tool-counter.ts** | 102 | Rich two-line footer: model + context meter (line 1), cwd/branch + per-tool tally (line 2) | UI/Monitoring |
| **tool-counter-widget.ts** | 68 | Live-updating widget above editor showing per-tool call counts with background colors | UI/Monitoring |
| **damage-control.ts** | 206 | Real-time safety auditing; intercepts dangerous bash patterns and enforces path-based access controls | Safety |
| **system-select.ts** | 167 | `/system` command to interactively switch between agent personas from `.pi/agents/`, `.claude/agents/`, etc. | Agent Persona |
| **theme-cycler.ts** | 181 | Keyboard shortcuts (Ctrl+X forward, Ctrl+Q backward) and `/theme` command to cycle through themes | UI |
| **cross-agent.ts** | 265 | Scans `.claude/`, `.gemini/`, `.codex/` dirs for commands, skills, agents and registers them in Pi | Cross-tool |
| **purpose-gate.ts** | 84 | Prompts user to declare session intent on startup; shows persistent purpose widget; blocks prompts until answered | Workflow |
| **session-replay.ts** | 216 | Scrollable timeline overlay of session history — showcases customizable dialog UI patterns | UI/Replay |
| **pure-focus.ts** | 24 | Removes footer bar and status line entirely — pure distraction-free mode | UI |
| **minimal.ts** | 33 | Compact footer showing model name and 10-block context usage meter `[###-------] 30%` | UI |
| **themeMap.ts** | 143 | Utility module for applying extension theme defaults; shared dependency for other extensions | Utility |

### Specifications (4 files)

| File | Purpose |
|------|---------|
| **damage-control.md** | Spec for real-time security auditing extension; rule engine, path resolution, blocking/confirmation logic |
| **pi-pi.md** | Spec for meta-agent that builds Pi extensions; parallel expert research, web crawling fallbacks |
| **agent-workflow.md** | Workflow orchestration patterns and best practices |
| **agent-forge.md** | Agent creation and lifecycle patterns |

### Agent Definitions

**Individual Agents (.pi/agents/*.md):**
- **planner.md** — Architecture and implementation planning
- **builder.md** — Code implementation executor
- **reviewer.md** — Code quality and correctness review
- **plan-reviewer.md** — Critiques and improves plans
- **scout.md** — Codebase exploration and analysis
- **red-team.md** — Security and edge-case testing
- **documenter.md** — Documentation generation
- **bowser.md** — (Custom agent, name TBD)

**Expert Agents (.pi/agents/pi-pi/):**  
10 specialized experts for the pi-pi meta-agent:
- `ext-expert.md` — Pi extension development
- `theme-expert.md` — Theme design and customization
- `tui-expert.md` — Terminal UI component design
- `config-expert.md` — Configuration and settings
- `skill-expert.md` — Custom skill creation
- `prompt-expert.md` — System prompt engineering
- `agent-expert.md` — Agent definition and personas
- `cli-expert.md` — CLI tooling and commands
- `keybinding-expert.md` — Keyboard shortcut design
- `pi-orchestrator.md` — Orchestration patterns

**Team Definitions (.pi/agents/teams.yaml):**
```yaml
full:           [scout, planner, builder, reviewer, documenter, red-team]
plan-build:     [planner, builder, reviewer]
info:           [scout, documenter, reviewer]
frontend:       [planner, builder, bowser]
pi-pi:          [ext-expert, theme-expert, skill-expert, config-expert, 
                 tui-expert, prompt-expert, agent-expert]
```

**Pipeline Definitions (.pi/agents/agent-chain.yaml):**
```yaml
plan-build-review:  Plan → Build → Review
plan-build:         Plan → Build
scout-flow:         Scout → Scout (validate) → Scout (verify)
plan-review-plan:   Plan → Review → Refined Plan
full-review:        Scout → Plan → Build → Review
```

### Configuration Files

| File | Lines | Purpose |
|------|-------|---------|
| **.pi/settings.json** | 4 | Pi workspace config: synthwave theme, quiet startup, Claude command paths |
| **.pi/damage-control-rules.yaml** | 140+ | Security ruleset: 90+ bash patterns, 30+ zero-access paths, 40+ read-only paths, 30+ no-delete paths |
| **.pi/themes/*.json** | 11 files | Pre-built color themes: Catppuccin, Cyberpunk, Dracula, Everforest, Gruvbox, Midnight Ocean, Nord, Ocean Breeze, Rose Pine, Synthwave, Tokyo Night |

### Documentation Files

| File | Lines | Purpose |
|------|-------|---------|
| **README.md** | ~500 | Main docs: installation, API keys, extension list, usage patterns, multi-agent orchestration, safety auditing, resource links |
| **COMPARISON.md** | ~450 | 12-category feature comparison: design philosophy, cost/licensing, model support, agent harness, tools, hooks, compaction, performance |
| **CLAUDE.md** | 20 | Quick reference: tooling, project structure, conventions, imports |
| **THEME.md** | 30 | Color token conventions: `success` (green), `accent` (cyan), `warning` (yellow), `dim` (gray), `muted` (subdued) |
| **TOOLS.md** | 20 | Function signatures for built-in tools: `read()`, `write()`, `edit()`, `bash()` |
| **RESERVED_KEYS.md** | 60 | Keyboard binding guidance: reserved keys (can't override), overridable keys, safe keys for extensions |

---

## 4. DEPENDENCIES

### package.json
```json
{
  "name": "pi-vs-cc",
  "private": true,
  "type": "module",
  "description": "Pi Coding Agent extension playground",
  "dependencies": {
    "yaml": "^2.8.0"
  }
}
```

**Single Dependency:**
- **yaml** — For parsing `.pi/agents/teams.yaml` and agent-chain.yaml in agent-team and agent-chain extensions

**Built-in Runtime Access (No Additional Deps):**
- `@mariozechner/pi-coding-agent` — Pi SDK (types, events, tool registration)
- `@mariozechner/pi-tui` — Terminal UI library (components, theming)
- `@mariozechner/pi-ai` — AI abstractions
- `@sinclair/typebox` — JSON schema types for tool definitions

---

## 5. JUSTFILE & TASK RUNNER

**Task Runner:** `just` (installed via `brew install just`)  
**Config Location:** `justfile` (53 lines)

### Group 1: UI Extensions (Individual Features)
```bash
just pi                      # Plain Pi, no extensions
just ext-pure-focus         # Distraction-free (no footer/status)
just ext-minimal            # Compact model + context meter
just ext-cross-agent        # Load Claude/Gemini/Codex commands
just ext-purpose-gate       # Intent declaration gate
just ext-tool-counter       # Rich two-line footer with stats
just ext-tool-counter-widget # Per-tool widget above editor
just ext-subagent-widget    # /sub command for background tasks
just ext-tilldone           # Task discipline system
```

### Group 2: Multi-Agent Orchestration
```bash
just ext-agent-team         # Dispatcher with team selection
just ext-system-select      # /system command for agent personas
just ext-damage-control     # Safety auditing + minimal footer
just ext-agent-chain        # Sequential pipeline orchestrator
```

### Group 3: Advanced
```bash
just ext-pi-pi              # Meta-agent for building Pi extensions
just ext-session-replay     # Timeline overlay UI demo
just ext-theme-cycler       # Theme switcher
```

### Utilities
```bash
just all                    # Open every extension in separate terminal windows
just open <ext1> <ext2>     # Open stacked extensions in new terminal
```

**Feature:** `set dotenv-load := true` auto-loads `.env` for all recipes

---

## 6. EXTENSION FILE ARCHITECTURE

### Pattern 1: Simple UI (pure-focus, minimal)
```typescript
export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    // Register hooks
    ctx.ui.setFooter((...) => { /* render function */ })
  })
}
```
**Lines:** 24-33 lines total  
**Complexity:** Simple event listener + rendering

### Pattern 2: Orchestration (agent-team, agent-chain)
```typescript
export default function (pi: ExtensionAPI) {
  // Load YAML configs
  // Parse agent definitions
  pi.registerCommand({ name: "/agents-team", ... })
  pi.registerTool({
    name: "dispatch_agent",
    description: "Delegate to specialist",
    inputSchema: { ... },
    handler: async (input, ctx) => { /* spawn subagent */ }
  })
  // Render grid dashboard
}
```
**Lines:** 734-797 lines total  
**Complexity:** YAML parsing, subprocess spawning, dashboard rendering

### Pattern 3: Safety/Monitoring (damage-control, tool-counter)
```typescript
export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    // Intercept tool calls
    // Check against rules
    // Block, confirm, or allow
    return { block: false }
  })
}
```
**Lines:** 102-206 lines total  
**Complexity:** Event filtering, rule matching, confirmation dialogs

### Pattern 4: Workflow (tilldone, purpose-gate)
```typescript
export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    // Initialize persistent state
    pi.appendEntry("tasks", { ... })  // Store in session
  })
  pi.on("input", async (event, ctx) => {
    // Check workflow constraints
  })
}
```
**Lines:** 84-726 lines total  
**Complexity:** Session state management, lifecycle hooks

### Common Patterns Across All Extensions

1. **Theme Application:**
   ```typescript
   import { applyExtensionDefaults } from "./themeMap.ts"
   pi.on("session_start", (event, ctx) => {
     applyExtensionDefaults(import.meta.url, ctx)
   })
   ```

2. **Tool Registration:**
   ```typescript
   pi.registerTool({
     name: "example_tool",
     description: "...",
     inputSchema: Type.Object({ ... }),
     handler: async (input, ctx) => { ... }
   })
   ```

3. **Command Registration:**
   ```typescript
   pi.registerCommand({
     name: "/example",
     aliases: ["/ex"],
     description: "...",
     handler: async (args, ctx) => { ... }
   })
   ```

4. **Keyboard Shortcuts:**
   ```typescript
   pi.registerShortcut({
     keys: "ctrl+x",
     description: "Next theme",
     handler: async (ctx) => { ... }
   })
   ```

5. **Type-Safe Tool Call Detection:**
   ```typescript
   import { isToolCallEventType } from "@mariozechner/pi-coding-agent"
   pi.on("tool_call", async (event, ctx) => {
     if (isToolCallEventType("bash", event)) {
       const cmd = event.input.command
     }
   })
   ```

---

## 7. KEY CONFIGURATION & CONVENTIONS

### .pi/settings.json
```json
{
  "theme": "synthwave",           // Default theme (cyberpunk aesthetic)
  "quietStartup": true,           // Skip intro messages
  "prompts": ["../.claude/commands"]  // Load Claude commands for compatibility
}
```

### .pi/damage-control-rules.yaml
**Three rule categories with 140+ patterns:**

1. **bashToolPatterns** (90+ regex patterns)
   - Destructive: `rm -rf`, `git reset --hard`, `aws s3 rm --recursive`, `DROP DATABASE`
   - Confirmation: `git checkout -- .`, `git stash drop`, `git branch -D`

2. **zeroAccessPaths** (30+ patterns)
   - `.env*` files, `~/.ssh/`, `~/.aws/`, API key files, TLS certificates
   - **Action:** Block entirely, no confirmation

3. **readOnlyPaths** (40+ patterns)
   - `/etc/`, `/usr/`, shell history, lockfiles, minified/compiled code
   - **Action:** Block writes/edits, allow reads

4. **noDeletePaths** (30+ patterns)
   - `.git/`, `Dockerfile`, `README.md`, source files
   - **Action:** Block deletes, allow reads/writes

### Theme Conventions (THEME.md)

| Token | Color | Role | Example |
|-------|-------|------|---------|
| `success` | Green | Primary values | `1.2k` in token count, `###` in meter fill |
| `accent` | Cyan | Secondary values | `30%` percentage, `Bash` tool name |
| `warning` | Yellow | Frame/punctuation | `[`, `]`, `\|`, `$` |
| `dim` | Gray | Labels/spacing | `in`, `out`, `-`, `--` |
| `muted` | Subdued | Context text | CWD, fallback states |

**Example footer line:**
```
warning([) success(###) dim(---) warning(]) accent(30%) → "Context meter"
success(1.2k) dim(in) accent(340) dim(out) warning($0.0042) → "Token stats"
```

### Reserved vs. Safe Keybindings (RESERVED_KEYS.md)

**Cannot Override (Silent Skip):**
- `escape`, `ctrl+c`, `ctrl+d`, `ctrl+z` — System level
- `shift+tab`, `ctrl+p`, `ctrl+l`, `ctrl+t` — Model/thinking controls
- `enter`, `alt+enter` — Submission

**Can Override (Warns):**
- Arrow keys, `ctrl+a`, `ctrl+e`, `ctrl+n`, `ctrl+r`, `ctrl+s`, `ctrl+u`, etc.

**Safe for Extensions:**
- `ctrl+x` — Universally safe
- `ctrl+q` — Safe (though XON/XOFF may interfere on old systems)
- `f1`–`f12` — Function keys

**macOS Gotcha:**
- `alt+letter` types special characters (⌥+a → å) — use `ctrl+letter` instead

---

## 8. MULTI-AGENT ORCHESTRATION PATTERNS

### Pattern A: Agent Teams (Dispatcher Model)
**File:** `extensions/agent-team.ts`  
**Config:** `.pi/agents/teams.yaml`

**Flow:**
1. User selects a team (e.g., `frontend: [planner, builder, bowser]`)
2. Primary agent **cannot** run tools directly
3. User request → Primary agent reviews → calls `dispatch_agent` tool
4. `dispatch_agent` selects a specialist (e.g., `builder`) and spawns subprocess
5. Specialist agent runs in isolated session with codebase tools
6. Result returned to primary agent

**Commands:**
- `/agents-team` — Switch active team
- `/agents-list` — List team members
- `/agents-grid N` — Set dashboard columns

**Dashboard:** Grid layout showing active specialists, task queue, completion status

**Use Case:** Specialized workflows (frontend team, backend team, docs team)

### Pattern B: Agent Chains (Pipeline Model)
**File:** `extensions/agent-chain.ts`  
**Config:** `.pi/agents/agent-chain.yaml`

**Flow:**
1. User selects a workflow (e.g., `plan-build-review`)
2. **Step 1:** Agent A processes user request, produces output
3. **Step 2:** Agent B receives output as `$INPUT`, processes it
4. **Step 3:** Agent C reviews Agent B's output
5. Final output returned to user

**Variable Injection:**
- `$INPUT` — Previous step's output (user request for step 1)
- `$ORIGINAL` — Always the user's initial prompt

**Example Pipeline:**
```yaml
plan-build-review:
  - agent: planner
    prompt: "Plan: $INPUT"
  - agent: builder
    prompt: "Build from plan: $INPUT"
  - agent: reviewer
    prompt: "Review: $INPUT"
```

**Commands:**
- `/chain` — Select and run a pipeline

**Use Case:** Deterministic workflows (explore → plan → build → review)

### Pattern C: Subagents (Background Workers)
**File:** `extensions/subagent-widget.ts`

**Flow:**
1. User types `/sub <task>` in main Pi session
2. Extension spawns a separate Pi subprocess (isolated session)
3. Subagent runs in background while user continues in main session
4. Live-updating widget above editor shows streaming progress
5. User can dismiss/inspect subagent output

**Use Case:** Parallel research, documentation generation, test writing

### Pattern D: Meta-Agents (Agent-Building Agents)
**File:** `extensions/pi-pi.ts`  
**Agents:** `.pi/agents/pi-pi/*.md`

**Flow:**
1. User requests a Pi extension
2. **Orchestrator agent** reads the request
3. 10 specialist experts are spawned in **parallel** via `dispatch_agent`
   - `ext-expert` — Reviews Pi extension patterns
   - `theme-expert` — Designs color schemes
   - `tui-expert` — Plans UI components
   - `config-expert` — Sets up configuration
   - `skill-expert` — Creates skills
   - `prompt-expert` — Engineers system prompts
   - `agent-expert` — Defines agent personas
   - `cli-expert` — Plans CLI commands
   - `keybinding-expert` — Designs shortcuts
4. Each expert researches its domain (with Firecrawl web crawling, fallback to `curl`)
5. Orchestrator synthesizes findings into final extension code

**Use Case:** High-quality, well-researched extension generation with multi-perspective analysis

---

## 9. SAFETY & DAMAGE CONTROL

**File:** `extensions/damage-control.ts`  
**Rules:** `.pi/damage-control-rules.yaml`

### How It Works

1. **Session Start:** Load YAML ruleset or default to empty (graceful fail)
2. **Tool Call Event:** Intercept every tool call before execution
3. **Type-Safe Matching:** Use `isToolCallEventType("bash", event)` to narrow event type
4. **Rule Evaluation:**
   - **Bash Commands:** Regex match against `bashToolPatterns`
   - **File Paths:** Match against `zeroAccessPaths`, `readOnlyPaths`, `noDeletePaths`
   - **Path Resolution:** Expand `~` to home, resolve relative paths against `cwd`
5. **Action:**
   - **Block:** Return `{ block: true, reason: "..." }` for critical violations
   - **Confirm:** For `ask: true` rules, prompt user with 30s timeout
   - **Allow:** Return `{ block: false }` for safe operations
6. **Logging:** Every action logged via `pi.appendEntry("damage-control-log", {...})`

### Rule Statistics
- **90+ bash patterns** — destructive commands, dangerous flags
- **30+ zero-access paths** — API keys, SSH keys, credentials
- **40+ read-only paths** — system files, lockfiles, compiled code
- **30+ no-delete paths** — critical project files

### UI Feedback
- **Status Indicator:** `ctx.ui.setStatus()` shows "🛡️ Damage-Control Active: 142 Rules"
- **Violation Alert:** `ctx.ui.notify()` when rule triggered
- **Confirmation Dialog:** `ctx.ui.confirm()` for `ask: true` rules

---

## 10. NOTABLE PATTERNS & DESIGN DECISIONS

### 1. **Minimal System Prompt Philosophy**
Pi's base system prompt is **~200 tokens** vs Claude Code's **~10,000 tokens**.

**Rationale:** "Frontier models are RL-trained up the wazoo. They inherently understand what a coding agent is. Trust the model."

**Tradeoff:**
- ✅ More context for actual work
- ❌ Less behavioral guardrails

### 2. **Transparency-First Design**
Every token, tool call, and session branch is **fully visible** to the user. No hidden orchestration.

**Contrast with Claude Code:**
- Pi: `session.toJSON()` HTML export, every event logged
- CC: Sub-agents are black boxes, compaction is silent

### 3. **Extension Composition Over Configuration**
Extensions are **stackable** via multiple `-e` flags:
```bash
pi -e extensions/minimal.ts -e extensions/cross-agent.ts -e extensions/theme-cycler.ts
```

No monolithic settings file. Each extension handles its own lifecycle.

### 4. **TypeScript Extensions, Not Shell Hooks**
- **Pi:** In-process TypeScript (same runtime, full session state access, streaming results)
- **Claude Code:** Shell command hooks (external processes, JSON-RPC, slower)

**Advantage:** Can block/modify/transform any event, render UI directly, access context

### 5. **Model-Agnostic from Day One**
- **324 built-in models** across 20+ providers
- **Cross-provider context handoff** (e.g., start with GPT-4, switch to Opus mid-session)
- **Cost optimization** per task

vs. Claude Code: "Claude-first, others via gateway workaround"

### 6. **YOLO Safety Model**
Pi ships with **no permissions by default** ("YOLO mode"). Safety is opt-in.

**Philosophy:** "Security in coding agents is mostly theater. If it can write and run code, it's game over anyway."

**Escape hatch:** `damage-control` extension for users who want guardrails.

### 7. **Session as Branching Tree, Not Linear**
Pi sessions support:
- `/fork` — Branch off from current point
- `/tree` — Visualize session tree
- `/switch` — Jump between branches

vs. Claude Code: Linear conversation history

### 8. **State Persistence via pi.appendEntry()**
Extensions can persist custom data directly to session:
```typescript
pi.appendEntry("my-state", { key: "value" })
```
Data survives session restart, appears in HTML export.

### 9. **Per-Task Model/Provider Selection**
Each agent can use a different model/provider:
```yaml
steps:
  - agent: research-expert    # Uses Claude Opus (expensive, smart)
    prompt: "..."
  - agent: formatter          # Uses GPT-4 Turbo (cheap, fast)
    prompt: "..."
```

vs. Claude Code: Single model for entire session

### 10. **Color Token Abstraction**
All extensions use consistent **semantic color tokens** (`success`, `accent`, `warning`, `dim`, `muted`) that map to actual colors via theme.

**Benefit:** Extensions work across all 11 built-in themes without hardcoding hex codes.

---

## 11. DOCUMENTATION SUMMARY

### README.md (~500 lines)
- **Installation:** Bun, just, Pi prerequisites
- **API Keys:** Setup guide for 4+ providers (OpenAI, Anthropic, Google, OpenRouter, etc.)
- **Extension Table:** 14 extensions with descriptions and usage
- **Usage Patterns:** Stack extensions, just recipes, the `open` recipe
- **Project Structure:** Full directory tree
- **Multi-Agent Workflows:** Teams, chains, subagents, meta-agents
- **Safety Auditing:** Damage-control patterns
- **Resources:** Links to Pi docs (extensions, skills, settings, models, providers, SDK, RPC, etc.)

### COMPARISON.md (~450 lines)
12-category feature matrix:
1. **Design Philosophy** — Batteries-included vs. minimal
2. **Cost & Licensing** — Proprietary vs. MIT open source
3. **Model & Provider Support** — Claude-only vs. 324 models
4. **Agent Harness** — Hooks, sub-agents, teams, permissions
5. **Tools & Capabilities** — Built-in tools feature-by-feature
6. **Hooks & Event System** — Event types and timing
7. **Compaction & Memory** — Context management
8. **Performance & Latency** — Speed metrics
9. **UI/UX & Customization** — Theme, keybindings, extensions
10. **Enterprise Features** — Team collaboration, audit logs, single sign-on
11. **Documentation & Community** — Doc quality, examples, support
12. **Platform & Integration** — MCP, web search, notebooks, IDE plugins

**Winner Column:** Pi wins on cost, open source, multi-model, transparency, hooks/extensibility. CC wins on batteries-included, safety defaults, sub-agents, enterprise.

### CLAUDE.md (~20 lines)
Quick reference for developers:
- Tooling: Bun, just, pi
- Project structure
- Conventions: standalone .ts files, available imports, tool registration location, type-safe narrowing

### THEME.md (~30 lines)
Color token mapping for extension authors:
- 5 semantic tokens: `success`, `accent`, `warning`, `dim`, `muted`
- Example lines showing usage

### TOOLS.md (~20 lines)
Function signatures for 4 built-in tools:
```typescript
read(path, limit?, offset?)
bash(command, timeout?)
edit(path, oldText, newText)
write(path, content)
```

### RESERVED_KEYS.md (~60 lines)
Keybinding guidance:
- Reserved (can't override): 14 keys
- Overridable: 35+ keys (with warning)
- Safe for extensions: `ctrl+x`, `ctrl+q`, `f1-f12`
- macOS gotchas

---

## 12. CROSS-AGENT INTEGRATION

### Cross-Agent Extension (extensions/cross-agent.ts)
Scans for commands, skills, agents from other coding agents:

**Sources:**
- `.claude/commands/` — Claude Code commands
- `.claude/skills/` — Claude skills
- `.claude/agents/` — Claude agent personas
- `.gemini/commands/`, `.gemini/skills/`, `.gemini/agents/`
- `.codex/commands/`, `.codex/skills/`, `.codex/agents/`
- Global `~/.claude/`, `~/.gemini/`, `~/.codex/`

**Registration in Pi:**
- Commands → `/name` command
- Skills → `/skill:name` listing
- Agents → `@name` reference

**Benefit:** Leverage ecosystem tools across agents, avoid lock-in

---

## 13. SPECIFICATION FILES (specs/)

### damage-control.md
- Rule engine architecture
- Tool interception logic (bash, read, write, edit, grep, find, ls)
- Path resolution (tilde expansion, CWD fallback)
- Blocking vs. confirmation workflows
- Status indicators and notifications
- Logging to session via `pi.appendEntry()`

### pi-pi.md
- Meta-agent design: orchestrator + 10 parallel experts
- Expert domains: extensions, themes, TUI, config, skills, prompts, agents, CLI, keybindings
- Web crawling strategy: Firecrawl primary, curl fallback
- Parallel research with synthesis

### agent-workflow.md
- Orchestration patterns and best practices
- Lifecycle management

### agent-forge.md
- Agent creation and definition patterns

---

## 14. EXTENSION DEPENDENCIES & IMPORTS

### Available in All Extensions
```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"
import { Type } from "@sinclair/typebox"
import { 
  Box, Text, Markdown, Container, Spacer,
  matchesKey, Key, truncateToWidth, visibleWidth,
  getMarkdownTheme
} from "@mariozechner/pi-tui"
```

### Common Nodejs Modules
```typescript
import { spawn, exec } from "child_process"
import { readdirSync, readFileSync, existsSync, writeFileSync } from "fs"
import { join, resolve, basename } from "path"
import { homedir } from "os"
import YAML from "yaml"  // from dependencies
```

### Extension-Specific Imports
**themeMap.ts** — Utility for applying theme defaults:
```typescript
export function applyExtensionDefaults(importUrl: string, ctx: Context) {
  // Apply theme customizations to ctx.ui
}
```

---

## 15. GIT & VERSIONING

**.gitignore excludes:**
- `node_modules/`, `__pycache__/`, `.DS_Store`
- `.env` (never commit real API keys)
- `.pi/agent-sessions/` (ephemeral)
- `tmp/`, `.playwright-cli/`

**Repository:** Git-tracked, main branch active

---

## 16. PACKAGE MANAGER & RUNTIME

**Package Manager:** `bun` (not npm/yarn/pnpm)
- Why? Faster, native TypeScript support, all-in-one runtime
- Min version: 1.3.2
- Lock file: `bun.lock`

**Runtime:** Node 20.19.5 (via nvm)

**Installation:**
```bash
bun install  # Installs only 'yaml' from package.json
```

---

## 17. PROJECT STATISTICS

| Metric | Count |
|--------|-------|
| **Total Extensions** | 16 |
| **Total Extension Lines** | 4,860 |
| **Largest Extension** | agent-chain.ts (797 lines) |
| **Smallest Extension** | pure-focus.ts (24 lines) |
| **Specifications** | 4 files |
| **Agent Definitions** | 18 (8 base + 10 specialists) |
| **Teams Defined** | 7 (full, plan-build, info, frontend, pi-pi, etc.) |
| **Pipelines Defined** | 5 (plan-build-review, scout-flow, etc.) |
| **Damage-Control Rules** | 140+ patterns |
| **Color Themes** | 11 |
| **Documentation Files** | 6 (README, COMPARISON, CLAUDE, THEME, TOOLS, RESERVED_KEYS) |
| **Just Recipes** | 20+ |
| **Dependencies** | 1 (yaml) |
| **Built-in Runtime Access** | 4 packages (@mariozechner/*, @sinclair/typebox) |

---

## 18. KEY TAKEAWAYS

### What This Repo Demonstrates

1. **Extensibility Matters**
   - Pi's in-process TypeScript model allows sophisticated customization impossible in plugin systems
   - Each extension is <800 lines; compose them for complex workflows

2. **Multi-Agent Orchestration is Practical**
   - Dispatcher model (agent-team) for specialist workflows
   - Pipeline model (agent-chain) for deterministic sequences
   - Parallel experts (pi-pi) for high-quality generation

3. **Safety Can Be Bolted On**
   - Damage-control shows how to layer security without monolithic design
   - Opt-in approach respects user autonomy vs. "safe by default" philosophy

4. **Cost Optimization is Real**
   - Model-agnostic architecture allows per-task cost optimization
   - Mix expensive research agents with cheap formatter agents

5. **Open Source Wins on Customization**
   - MIT license + TypeScript = full control
   - No proprietary lock-in
   - Fork and self-host if needed

6. **Design Philosophy Matters**
   - Pi: minimal, transparent, trusts frontier models
   - CC: batteries-included, safe-by-default, extensive guardrails
   - Both approaches valid; pick your tradeoff

### Ideal Use Cases for Pi + This Repo

- ✅ Teams wanting **cost control** across agents
- ✅ Orgs needing **safety auditing** for compliance
- ✅ Engineers who want **full transparency** into agent behavior
- ✅ Projects requiring **cross-provider switching** or **open source tooling**
- ✅ Developers building **specialized workflows** (pipelines, teams, metadata)

### Ideal Use Cases for Claude Code

- ✅ Individual developers wanting **batteries-included** experience
- ✅ Teams valuing **safety guardrails** and **permissions model**
- ✅ Organizations needing **native Anthropic integration** (Bedrock, Vertex)
- ✅ Users wanting **zero configuration** and guided workflows

---

## CONCLUSION

**pi-vs-cc** is a **comprehensive playground** showcasing Pi Coding Agent's customization capabilities, multi-agent orchestration patterns, and open-source philosophy. With **16 production-ready extensions**, detailed specifications, and extensive documentation, it serves as both a **reference implementation** and a **hedge against vendor lock-in** from Claude Code.

The repo emphasizes:
- **Composability** (stack extensions freely)
- **Transparency** (every token visible)
- **Cost Control** (multi-model, per-task optimization)
- **Safety as Opt-In** (damage-control for guardrails)
- **Extensibility** (TypeScript, in-process, full state access)

It's a **proof of concept** that open-source agentic coding tooling can be **production-ready, enterprise-capable, and user-controllable** — without sacrificing the power of frontier AI models.

