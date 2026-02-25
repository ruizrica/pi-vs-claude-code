// ABOUTME: MIC Pi Extension — Multi Instance Claude lane orchestrator
// ABOUTME: Hybrid agent with task-first discipline, lane dispatch in git worktrees, multi-model review gates

import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, matchesKey, Text, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { spawn, execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { applyExtensionDefaults } from "./themeMap.ts";

// ── Types ──────────────────────────────────────────────────────────────

type TaskStatus = "idle" | "inprogress" | "done";

interface MicTask {
	id: number;
	text: string;
	status: TaskStatus;
	lane?: string;
}

interface MicTaskDetails {
	action: string;
	tasks: MicTask[];
	nextId: number;
	error?: string;
}

type LaneStatus = "pending" | "running" | "done" | "reviewing" | "approved" | "rejected" | "error";

interface ReviewDetail {
	model: string;
	score: number;
	recommendation: string;
	issues: string[];
}

interface LaneState {
	name: string;
	task: string;
	model?: string;
	filesOwned: string[];
	filesShared: string[];
	worktreePath: string;
	branchName: string;
	baseCommit: string;
	status: LaneStatus;
	progress: number;
	elapsed: number;
	lastWork: string;
	toolCount: number;
	reviewScore: number;
	reviewDetails: ReviewDetail[];
	timer?: ReturnType<typeof setInterval>;
}

interface MicConfig {
	laneModel: string;
	reviewModels: string[];
	passingScore: number;
	minApprovals: number;
	maxRevisionAttempts: number;
	maxParallelLanes: number;
	sharedFiles: string[];
	readonlyFiles: string[];
}

// ── Status helpers ─────────────────────────────────────────────────────

const STATUS_ICON: Record<TaskStatus, string> = { idle: "○", inprogress: "●", done: "✓" };
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { idle: "inprogress", inprogress: "done", done: "idle" };

const LANE_ICON: Record<LaneStatus, string> = {
	pending: "○", running: "●", done: "✓", reviewing: "◎",
	approved: "✓", rejected: "✗", error: "✗",
};
const LANE_COLOR: Record<LaneStatus, string> = {
	pending: "dim", running: "accent", done: "success", reviewing: "warning",
	approved: "success", rejected: "error", error: "error",
};

// ── Config parsing ─────────────────────────────────────────────────────

function parseConfigYaml(raw: string): MicConfig {
	const config: MicConfig = {
		laneModel: "",
		reviewModels: [],
		passingScore: 0.80,
		minApprovals: 2,
		maxRevisionAttempts: 3,
		maxParallelLanes: 4,
		sharedFiles: [],
		readonlyFiles: [],
	};

	let section = "";
	let subsection = "";

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		// Top-level key-value (before any section)
		const topKv = line.match(/^(\w+):\s+(.+)$/);
		if (topKv && topKv[1] === "lane_model") { config.laneModel = topKv[2].trim(); continue; }

		if (line.match(/^review_models:/)) { section = "review_models"; continue; }
		if (line.match(/^review:/)) { section = "review"; continue; }
		if (line.match(/^lanes:/)) { section = "lanes"; continue; }
		if (line.match(/^file_ownership:/)) { section = "file_ownership"; continue; }

		if (section === "file_ownership") {
			if (trimmed === "shared:") { subsection = "shared"; continue; }
			if (trimmed === "readonly:") { subsection = "readonly"; continue; }
			const itemMatch = trimmed.match(/^-\s+(.+)$/);
			if (itemMatch) {
				if (subsection === "shared") config.sharedFiles.push(itemMatch[1].trim());
				if (subsection === "readonly") config.readonlyFiles.push(itemMatch[1].trim());
			}
			continue;
		}

		if (section === "review_models") {
			const itemMatch = trimmed.match(/^-\s+(.+)$/);
			if (itemMatch) config.reviewModels.push(itemMatch[1].trim());
			continue;
		}

		if (section === "review") {
			const kvMatch = trimmed.match(/^(\w+):\s+(.+)$/);
			if (kvMatch) {
				const [, key, value] = kvMatch;
				if (key === "passing_score") config.passingScore = parseFloat(value);
				if (key === "min_approvals") config.minApprovals = parseInt(value);
				if (key === "max_revision_attempts") config.maxRevisionAttempts = parseInt(value);
			}
			continue;
		}

		if (section === "lanes") {
			const kvMatch = trimmed.match(/^(\w+):\s+(.+)$/);
			if (kvMatch) {
				const [, key, value] = kvMatch;
				if (key === "max_parallel") config.maxParallelLanes = parseInt(value);
			}
			continue;
		}
	}

	return config;
}

function loadConfig(cwd: string): MicConfig {
	const configPath = join(cwd, ".pi", "agents", "mic-config.yaml");
	if (existsSync(configPath)) {
		try {
			return parseConfigYaml(readFileSync(configPath, "utf-8"));
		} catch {}
	}
	return {
		laneModel: "",
		reviewModels: [
			"openrouter/anthropic/claude-3.5-sonnet",
			"openrouter/google/gemini-2.0-flash",
			"openrouter/openai/gpt-4-turbo",
		],
		passingScore: 0.80,
		minApprovals: 2,
		maxRevisionAttempts: 3,
		maxParallelLanes: 4,
		sharedFiles: ["package.json", "tsconfig.json"],
		readonlyFiles: [".git/**", "node_modules/**", "dist/**"],
	};
}

// ── /mic overlay component ────────────────────────────────────────────

class MicOverlayComponent {
	private tasks: MicTask[];
	private lanes: Map<string, LaneState>;
	private theme: Theme;
	private onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(tasks: MicTask[], lanes: Map<string, LaneState>, theme: Theme, onClose: () => void) {
		this.tasks = tasks;
		this.lanes = lanes;
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

		const lines: string[] = [];
		const th = this.theme;

		lines.push("");
		lines.push(truncateToWidth(
			th.fg("borderMuted", "─".repeat(3)) + th.fg("accent", " MIC Dashboard ") +
			th.fg("borderMuted", "─".repeat(Math.max(0, width - 18))),
			width,
		));
		lines.push("");

		// Task section
		const done = this.tasks.filter(t => t.status === "done").length;
		const total = this.tasks.length;
		lines.push(truncateToWidth("  " + th.fg("accent", `Tasks [${done}/${total}]`), width));
		lines.push("");

		for (const task of this.tasks) {
			const icon = task.status === "done"
				? th.fg("success", STATUS_ICON.done)
				: task.status === "inprogress"
					? th.fg("accent", STATUS_ICON.inprogress)
					: th.fg("dim", STATUS_ICON.idle);
			const id = th.fg("accent", `#${task.id}`);
			const text = task.status === "done"
				? th.fg("dim", task.text)
				: task.status === "inprogress"
					? th.fg("success", task.text)
					: th.fg("muted", task.text);
			const lane = task.lane
				? th.fg("warning", ` (lane:${task.lane})`)
				: th.fg("dim", " (self)");
			lines.push(truncateToWidth(`  ${icon} ${id} ${text}${lane}`, width));
		}

		if (this.tasks.length === 0) {
			lines.push(truncateToWidth(`  ${th.fg("dim", "No tasks yet.")}`, width));
		}

		// Lane section
		if (this.lanes.size > 0) {
			lines.push("");
			lines.push(truncateToWidth("  " + th.fg("accent", `Lanes [${this.lanes.size}]`), width));
			lines.push("");

			for (const [, lane] of this.lanes) {
				const icon = th.fg(LANE_COLOR[lane.status], LANE_ICON[lane.status]);
				const name = th.fg("accent", lane.name);
				const status = th.fg(LANE_COLOR[lane.status], lane.status);
				const time = lane.elapsed > 0 ? th.fg("dim", ` ${Math.round(lane.elapsed / 1000)}s`) : "";
				const score = lane.reviewScore > 0 ? th.fg("warning", ` score:${lane.reviewScore.toFixed(2)}`) : "";
				lines.push(truncateToWidth(`  ${icon} ${name} ${status}${time}${score}`, width));
				if (lane.lastWork) {
					const work = lane.lastWork.length > width - 8
						? lane.lastWork.slice(0, width - 11) + "..."
						: lane.lastWork;
					lines.push(truncateToWidth(`    ${th.fg("muted", work)}`, width));
				}
			}
		}

		lines.push("");
		lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
		lines.push("");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

// ── Extension entry point ──────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	let tasks: MicTask[] = [];
	let nextId = 1;
	let nudgedThisCycle = false;
	let config: MicConfig = loadConfig(process.cwd());
	const lanes: Map<string, LaneState> = new Map();
	let widgetCtx: any = null;
	let projectRoot = "";

	// ── Snapshot for details ───────────────────────────────────────────

	const makeDetails = (action: string, error?: string): MicTaskDetails => ({
		action,
		tasks: [...tasks],
		nextId,
		...(error ? { error } : {}),
	});

	// ── Lane card rendering ───────────────────────────────────────────

	// Track active lane widget keys so we can clean up removed lanes
	const activeLaneWidgetKeys = new Set<string>();

	// ── Widget update ─────────────────────────────────────────────────

	const updateWidget = () => {
		if (!widgetCtx) return;

		// ── Task summary widget ───────────────────────────────────────
		widgetCtx.ui.setWidget("mic-tasks", (_tui: any, theme: any) => {
			const text = new Text("", 0, 1);

			return {
				render(width: number): string[] {
					const lines: string[] = [];

					const done = tasks.filter(t => t.status === "done").length;
					const total = tasks.length;
					const active = tasks.filter(t => t.status === "inprogress").length;
					const idle = tasks.filter(t => t.status === "idle").length;

					const header = theme.fg("accent", " MIC Tasks ") +
						theme.fg("warning", `[${done}/${total}]`) +
						theme.fg("dim", "    ") +
						theme.fg("dim", `○ ${idle}`) +
						theme.fg("dim", "  ") +
						theme.fg("accent", `● ${active}`) +
						theme.fg("dim", "  ") +
						theme.fg("success", `✓ ${done}`);
					lines.push(truncateToWidth(header, width));

					const visible = tasks.slice(0, 6);
					for (const task of visible) {
						const icon = task.status === "done"
							? theme.fg("success", "✓")
							: task.status === "inprogress"
								? theme.fg("accent", "●")
								: theme.fg("dim", "○");
						const id = theme.fg("accent", `#${task.id}`);
						const taskText = task.status === "done"
							? theme.fg("dim", task.text)
							: theme.fg("muted", task.text);
						const lane = task.lane
							? theme.fg("warning", `(lane:${task.lane})`)
							: theme.fg("dim", "(self)");
						const score = task.lane && lanes.get(task.lane)?.reviewScore
							? theme.fg("success", ` ${lanes.get(task.lane)!.reviewScore.toFixed(2)}`)
							: "";
						lines.push(truncateToWidth(` ${icon} ${id} ${taskText} ${lane}${score}`, width));
					}
					if (tasks.length > 6) {
						lines.push(truncateToWidth(theme.fg("dim", ` +${tasks.length - 6} more`), width));
					}

					text.setText(lines.join("\n"));
					return text.render(width);
				},
				invalidate() {
					text.invalidate();
				},
			};
		});

		// ── Per-lane stacking widgets ─────────────────────────────────
		const currentKeys = new Set<string>();

		for (const [name, lane] of lanes) {
			const key = `mic-lane-${name}`;
			currentKeys.add(key);
			activeLaneWidgetKeys.add(key);

			widgetCtx.ui.setWidget(key, (_tui: any, theme: any) => {
				const container = new Container();
				const borderFn = (s: string) => theme.fg("dim", s);

				container.addChild(new Text("", 0, 0));
				container.addChild(new DynamicBorder(borderFn));
				const content = new Text("", 1, 0);
				container.addChild(content);
				container.addChild(new DynamicBorder(borderFn));

				return {
					render(width: number): string[] {
						const lines: string[] = [];
						const statusColor = LANE_COLOR[lane.status];
						const statusIcon = LANE_ICON[lane.status];

						const taskPreview = lane.task.length > 40
							? lane.task.slice(0, 37) + "..."
							: lane.task;

						const timeStr = lane.elapsed > 0 ? `${Math.round(lane.elapsed / 1000)}s` : "0s";
						const reviewStr = lane.reviewScore > 0
							? (lane.reviewScore >= config.passingScore
								? theme.fg("success", ` · ${lane.reviewScore.toFixed(2)}`)
								: theme.fg("error", ` · ${lane.reviewScore.toFixed(2)}`))
							: "";

						lines.push(
							theme.fg(statusColor, `${statusIcon} Lane: ${lane.name}`) +
							reviewStr +
							theme.fg("dim", `  ${taskPreview}`) +
							theme.fg("dim", `  (${timeStr})`) +
							theme.fg("dim", ` | Tools: ${lane.toolCount}`)
						);

						const workRaw = lane.lastWork || "";
						if (workRaw) {
							const trimmed = workRaw.length > width - 10
								? workRaw.slice(0, width - 13) + "..."
								: workRaw;
							lines.push(theme.fg("muted", `  ${trimmed}`));
						}

						content.setText(lines.join("\n"));
						return container.render(width);
					},
					invalidate() {
						container.invalidate();
					},
				};
			});
		}

		// Remove widgets for lanes that no longer exist
		for (const key of activeLaneWidgetKeys) {
			if (!currentKeys.has(key)) {
				widgetCtx.ui.setWidget(key, undefined);
				activeLaneWidgetKeys.delete(key);
			}
		}
	};

	const refreshFooter = (ctx: ExtensionContext) => {
		ctx.ui.setFooter((_tui, theme, _footerData) => ({
			dispose: () => {},
			invalidate() {},
			render(width: number): string[] {
				const model = ctx.model?.id || "no-model";
				const usage = ctx.getContextUsage();
				const pct = usage ? usage.percent : 0;
				const filled = Math.round(pct / 10);
				const bar = "#".repeat(filled) + "-".repeat(10 - filled);

				const taskDone = tasks.filter(t => t.status === "done").length;
				const taskTotal = tasks.length;
				const laneCount = lanes.size;
				const laneRunning = Array.from(lanes.values()).filter(l => l.status === "running").length;

				const left = theme.fg("dim", ` ${model}`) +
					theme.fg("muted", " · ") +
					theme.fg("accent", "MIC") +
					theme.fg("dim", ` tasks:${taskDone}/${taskTotal}`) +
					theme.fg("dim", ` lanes:${laneRunning}/${laneCount}`);
				const right = theme.fg("dim", `[${bar}] ${Math.round(pct)}% `);
				const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));

				return [truncateToWidth(left + pad + right, width)];
			},
		}));
	};

	const refreshUI = (ctx: ExtensionContext) => {
		const remaining = tasks.filter(t => t.status !== "done").length;
		ctx.ui.setStatus(`MIC: ${tasks.length} tasks (${remaining} remaining), ${lanes.size} lanes`, "mic");
		updateWidget();
		refreshFooter(ctx);
	};

	// ── State reconstruction from session ──────────────────────────────

	const reconstructState = (ctx: ExtensionContext) => {
		tasks = [];
		nextId = 1;
		lanes.clear();

		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (msg.role !== "toolResult" || msg.toolName !== "mic_tasks") continue;

			const details = msg.details as MicTaskDetails | undefined;
			if (details) {
				tasks = details.tasks;
				nextId = details.nextId;
			}
		}

		widgetCtx = ctx;
		refreshUI(ctx);
	};

	// ── Worktree helpers ──────────────────────────────────────────────

	const createWorktree = (laneName: string): { worktreePath: string; branchName: string; baseCommit: string } => {
		const ts = Date.now();
		const branchName = `mic/${laneName}-${ts}`;
		const worktreePath = join(projectRoot, ".mic", "worktrees", laneName);

		mkdirSync(join(projectRoot, ".mic", "worktrees"), { recursive: true });

		// Remove stale worktree at same path if exists
		try {
			execSync(`git worktree remove "${worktreePath}" --force`, { cwd: projectRoot, stdio: "pipe" });
		} catch {}

		// Capture base commit for later diffs
		const baseCommit = execSync("git rev-parse HEAD", { cwd: projectRoot, encoding: "utf-8" }).trim();

		execSync(`git worktree add -b "${branchName}" "${worktreePath}" HEAD`, {
			cwd: projectRoot,
			stdio: "pipe",
		});

		return { worktreePath, branchName, baseCommit };
	};

	const removeWorktree = (worktreePath: string, branchName: string) => {
		try {
			execSync(`git worktree remove "${worktreePath}" --force`, { cwd: projectRoot, stdio: "pipe" });
		} catch {}
		try {
			execSync(`git branch -D "${branchName}"`, { cwd: projectRoot, stdio: "pipe" });
		} catch {}
	};

	const cleanAllWorktrees = () => {
		const worktreeDir = join(projectRoot, ".mic", "worktrees");
		if (existsSync(worktreeDir)) {
			try {
				execSync("git worktree prune", { cwd: projectRoot, stdio: "pipe" });
				rmSync(worktreeDir, { recursive: true, force: true });
			} catch {}
		}
	};

	// ── Dispatch lane subprocess ──────────────────────────────────────

	function dispatchLane(
		lane: LaneState,
		ctx: any,
	): Promise<{ output: string; exitCode: number; elapsed: number }> {
		lane.status = "running";
		lane.elapsed = 0;
		lane.toolCount = 0;
		lane.lastWork = "";
		updateWidget();

		const startTime = Date.now();
		lane.timer = setInterval(() => {
			lane.elapsed = Date.now() - startTime;
			updateWidget();
		}, 1000);

		const model = lane.model
			|| config.laneModel
			|| (ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "")
			|| "openrouter/google/gemini-3-flash-preview";

		const laneSystemPrompt = [
			`You are a lane agent working in an isolated git worktree.`,
			``,
			`## Your Identity`,
			`Lane: ${lane.name}`,
			`Task: ${lane.task}`,
			``,
			`## File Ownership`,
			`You OWN these files exclusively (only you should modify them):`,
			...lane.filesOwned.map(f => `- ${f}`),
			``,
			`You can READ these shared files but be careful modifying them:`,
			...lane.filesShared.map(f => `- ${f}`),
			``,
			`## Rules`,
			`- Follow TDD: write failing test first, then implement`,
			`- Commit frequently with descriptive messages`,
			`- Stay within your file ownership boundaries`,
			`- Focus only on your assigned task`,
		].join("\n");

		const args = [
			"--mode", "json",
			"-p",
			"--no-extensions",
			"--model", model,
			"--tools", "read,write,edit,bash,grep,find,ls",
			"--thinking", "off",
			"--append-system-prompt", laneSystemPrompt,
		];
		args.push(lane.task);

		const textChunks: string[] = [];

		return new Promise((resolve) => {
			const proc = spawn("pi", args, {
				stdio: ["ignore", "pipe", "pipe"],
				cwd: lane.worktreePath,
				env: { ...process.env },
			});

			let buffer = "";

			proc.stdout!.setEncoding("utf-8");
			proc.stdout!.on("data", (chunk: string) => {
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const event = JSON.parse(line);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								textChunks.push(delta.delta || "");
								const full = textChunks.join("");
								const last = full.split("\n").filter((l: string) => l.trim()).pop() || "";
								lane.lastWork = last;
								updateWidget();
							}
						} else if (event.type === "tool_execution_start") {
							lane.toolCount++;
							lane.progress = Math.min(90, lane.toolCount * 5);
							updateWidget();
						}
					} catch {}
				}
			});

			proc.stderr!.setEncoding("utf-8");
			proc.stderr!.on("data", () => {});

			proc.on("close", (code) => {
				if (buffer.trim()) {
					try {
						const event = JSON.parse(buffer);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") textChunks.push(delta.delta || "");
						}
					} catch {}
				}

				clearInterval(lane.timer);
				lane.elapsed = Date.now() - startTime;
				lane.progress = 100;
				lane.status = code === 0 ? "done" : "error";

				const full = textChunks.join("");
				lane.lastWork = full.split("\n").filter((l: string) => l.trim()).pop() || "";
				updateWidget();

				ctx.ui.notify(
					`Lane ${lane.name} ${lane.status} in ${Math.round(lane.elapsed / 1000)}s`,
					lane.status === "done" ? "success" : "error",
				);

				resolve({
					output: full,
					exitCode: code ?? 1,
					elapsed: lane.elapsed,
				});
			});

			proc.on("error", (err) => {
				clearInterval(lane.timer);
				lane.status = "error";
				lane.lastWork = `Error: ${err.message}`;
				updateWidget();
				resolve({
					output: `Error spawning lane agent: ${err.message}`,
					exitCode: 1,
					elapsed: Date.now() - startTime,
				});
			});
		});
	}

	// ── Review lane ──────────────────────────────────────────────────

	async function reviewLane(
		lane: LaneState,
		_ctx: any,
	): Promise<{ passed: boolean; score: number; details: ReviewDetail[] }> {
		lane.status = "reviewing";
		updateWidget();

		// Get diff from worktree against its base commit
		let diff = "";
		try {
			diff = execSync(`git diff ${lane.baseCommit}..HEAD`, {
				cwd: lane.worktreePath,
				encoding: "utf-8",
				maxBuffer: 1024 * 1024 * 5,
			});
		} catch {}

		let log = "";
		try {
			log = execSync(`git log --oneline ${lane.baseCommit}..HEAD`, {
				cwd: lane.worktreePath,
				encoding: "utf-8",
			});
		} catch {}

		if (!diff && !log) {
			diff = "(No changes detected in worktree)";
		}

		const reviewPrompt = [
			`Review this code change and respond ONLY with a JSON object (no markdown fences, no explanation):`,
			``,
			`## Changes`,
			"```diff",
			diff.slice(0, 10000),
			"```",
			``,
			`## Commits`,
			log.slice(0, 2000),
			``,
			`## Task`,
			lane.task,
			``,
			`Respond with this exact JSON structure:`,
			`{"score": <number 0.0-1.0>, "recommendation": "approve" | "reject" | "needs_fixes", "issues": ["issue1"], "summary": "brief summary"}`,
			``,
			`Score criteria (weighted):`,
			`- Correctness (1.0): Does the code work as intended?`,
			`- Completeness (1.0): Does it fully implement the task?`,
			`- Quality (0.8): Clean, readable, maintainable code?`,
			`- Security (1.0): Any security issues?`,
			`- Performance (0.8): Any performance concerns?`,
			`- Test Coverage (1.0): Are there adequate tests?`,
			``,
			`Be strict but fair. Score 0.80+ means the code is production-ready.`,
		].join("\n");

		const reviewModels = config.reviewModels;

		const reviewPromises = reviewModels.map(model => {
			return new Promise<ReviewDetail>((resolve) => {
				const args = [
					"--mode", "json",
					"-p",
					"--no-extensions",
					"--model", model,
					"--tools", "read,grep,find,ls",
					"--thinking", "off",
				];
				args.push(reviewPrompt);

				const chunks: string[] = [];
				const proc = spawn("pi", args, {
					stdio: ["ignore", "pipe", "pipe"],
					cwd: lane.worktreePath,
					env: { ...process.env },
				});

				let buffer = "";

				proc.stdout!.setEncoding("utf-8");
				proc.stdout!.on("data", (chunk: string) => {
					buffer += chunk;
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							const event = JSON.parse(line);
							if (event.type === "message_update") {
								const delta = event.assistantMessageEvent;
								if (delta?.type === "text_delta") {
									chunks.push(delta.delta || "");
								}
							}
						} catch {}
					}
				});

				proc.stderr!.setEncoding("utf-8");
				proc.stderr!.on("data", () => {});

				proc.on("close", () => {
					const fullOutput = chunks.join("");
					try {
						const jsonMatch = fullOutput.match(/\{[\s\S]*\}/);
						if (jsonMatch) {
							const parsed = JSON.parse(jsonMatch[0]);
							resolve({
								model,
								score: typeof parsed.score === "number" ? parsed.score : 0.5,
								recommendation: parsed.recommendation || "needs_fixes",
								issues: Array.isArray(parsed.issues) ? parsed.issues : [],
							});
							return;
						}
					} catch {}
					resolve({
						model,
						score: 0.5,
						recommendation: "needs_fixes",
						issues: ["Failed to parse review output"],
					});
				});

				proc.on("error", () => {
					resolve({
						model,
						score: 0,
						recommendation: "reject",
						issues: [`Review model ${model} failed to spawn`],
					});
				});
			});
		});

		const details = await Promise.all(reviewPromises);

		const totalScore = details.reduce((sum, d) => sum + d.score, 0);
		const avgScore = details.length > 0 ? totalScore / details.length : 0;
		const approvals = details.filter(d => d.recommendation === "approve").length;
		const passed = avgScore >= config.passingScore && approvals >= config.minApprovals;

		lane.reviewScore = avgScore;
		lane.reviewDetails = details;
		lane.status = passed ? "approved" : "rejected";
		updateWidget();

		return { passed, score: avgScore, details };
	}

	// ── Tool 1: mic_tasks ─────────────────────────────────────────────

	pi.registerTool({
		name: "mic_tasks",
		label: "MIC Tasks",
		description:
			"Manage your task list. You MUST add tasks before using any other tools. " +
			"Actions: plan (text=title), add (text or texts[] for batch, optional lane=name to assign to a lane), " +
			"toggle (id) — cycles idle→inprogress→done, list, clear. " +
			"Tasks without a lane = you do them directly. Tasks with a lane = dispatch to subagent worktree. " +
			"Always toggle a task to inprogress before starting work on it.",
		parameters: Type.Object({
			action: StringEnum(["plan", "add", "toggle", "list", "clear"] as const),
			text: Type.Optional(Type.String({ description: "Task text (for add) or plan title (for plan)" })),
			texts: Type.Optional(Type.Array(Type.String(), { description: "Multiple tasks to batch-add" })),
			id: Type.Optional(Type.Number({ description: "Task ID (for toggle)" })),
			lane: Type.Optional(Type.String({ description: "Assign task to a lane (e.g., 'auth', 'api')" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			switch (params.action) {
				case "plan": {
					if (tasks.length > 0) {
						const confirmed = await ctx.ui.confirm(
							"Start new plan?",
							`This will replace ${tasks.length} existing task(s). Continue?`,
							{ timeout: 30000 },
						);
						if (!confirmed) {
							return {
								content: [{ type: "text" as const, text: "Plan cancelled by user." }],
								details: makeDetails("plan", "cancelled"),
							};
						}
					}
					tasks = [];
					nextId = 1;
					const result = {
						content: [{ type: "text" as const, text: `Plan started: ${params.text || "untitled"}. Now add tasks with 'add'.` }],
						details: makeDetails("plan"),
					};
					refreshUI(ctx);
					return result;
				}

				case "add": {
					const items = params.texts?.length ? params.texts : params.text ? [params.text] : [];
					if (items.length === 0) {
						return {
							content: [{ type: "text" as const, text: "Error: text or texts required for add" }],
							details: makeDetails("add", "text required"),
						};
					}
					const added: MicTask[] = [];
					for (const item of items) {
						const t: MicTask = { id: nextId++, text: item, status: "idle", lane: params.lane };
						tasks.push(t);
						added.push(t);
					}
					const msg = added.length === 1
						? `Added task #${added[0].id}: ${added[0].text}${added[0].lane ? ` (lane:${added[0].lane})` : " (self)"}`
						: `Added ${added.length} tasks: ${added.map(t => `#${t.id}`).join(", ")}${params.lane ? ` (lane:${params.lane})` : ""}`;
					const result = {
						content: [{ type: "text" as const, text: msg }],
						details: makeDetails("add"),
					};
					refreshUI(ctx);
					return result;
				}

				case "toggle": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text" as const, text: "Error: id required for toggle" }],
							details: makeDetails("toggle", "id required"),
						};
					}
					const task = tasks.find(t => t.id === params.id);
					if (!task) {
						return {
							content: [{ type: "text" as const, text: `Task #${params.id} not found` }],
							details: makeDetails("toggle", `#${params.id} not found`),
						};
					}
					task.status = NEXT_STATUS[task.status];
					const result = {
						content: [{ type: "text" as const, text: `Task #${task.id}: → ${task.status}` }],
						details: makeDetails("toggle"),
					};
					refreshUI(ctx);
					return result;
				}

				case "list": {
					const result = {
						content: [{
							type: "text" as const,
							text: tasks.length
								? tasks.map(t =>
									`[${STATUS_ICON[t.status]}] #${t.id} (${t.status}): ${t.text}${t.lane ? ` [lane:${t.lane}]` : " [self]"}`
								).join("\n")
								: "No tasks defined yet.",
						}],
						details: makeDetails("list"),
					};
					refreshUI(ctx);
					return result;
				}

				case "clear": {
					if (tasks.length > 0) {
						const confirmed = await ctx.ui.confirm(
							"Clear all MIC tasks?",
							`This will remove all ${tasks.length} task(s). Continue?`,
							{ timeout: 30000 },
						);
						if (!confirmed) {
							return {
								content: [{ type: "text" as const, text: "Clear cancelled." }],
								details: makeDetails("clear", "cancelled"),
							};
						}
					}
					const count = tasks.length;
					tasks = [];
					nextId = 1;
					const result = {
						content: [{ type: "text" as const, text: `Cleared ${count} task(s)` }],
						details: makeDetails("clear"),
					};
					refreshUI(ctx);
					return result;
				}

				default:
					return {
						content: [{ type: "text" as const, text: `Unknown action: ${params.action}` }],
						details: makeDetails("list", `unknown action: ${params.action}`),
					};
			}
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("mic_tasks ")) + theme.fg("muted", args.action);
			if (args.texts?.length) text += ` ${theme.fg("dim", `${args.texts.length} tasks`)}`;
			else if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
			if (args.lane) text += ` ${theme.fg("warning", `lane:${args.lane}`)}`;
			if (args.id !== undefined) text += ` ${theme.fg("accent", `#${args.id}`)}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as MicTaskDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}
			const text = result.content[0];
			const msg = text?.type === "text" ? text.text : "";
			return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
		},
	});

	// ── Tool 2: dispatch_lane ─────────────────────────────────────────

	pi.registerTool({
		name: "dispatch_lane",
		label: "Dispatch Lane",
		description:
			"Spawn a subagent in an isolated git worktree to work on a task. " +
			"The lane agent gets its own copy of the repo and works independently. " +
			"Use for complex, multi-file, or parallelizable work.",
		parameters: Type.Object({
			lane_name: Type.String({ description: "Lane identifier (e.g., 'auth', 'api', 'frontend')" }),
			task: Type.String({ description: "Detailed task description for the lane agent" }),
			files_owned: Type.Array(Type.String(), { description: "File patterns this lane exclusively owns" }),
			files_shared: Type.Optional(Type.Array(Type.String(), { description: "Shared file patterns (read-write with care)" })),
			model: Type.Optional(Type.String({ description: "Model for this lane (e.g., 'openrouter/anthropic/claude-3.5-sonnet'). Defaults to config lane_model or parent model." })),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { lane_name, task, files_owned, files_shared, model } = params;

			const running = Array.from(lanes.values()).filter(l => l.status === "running").length;
			if (running >= config.maxParallelLanes) {
				return {
					content: [{ type: "text" as const, text: `Max parallel lanes (${config.maxParallelLanes}) reached. Wait for a lane to finish.` }],
					details: { lane: lane_name, status: "blocked" },
				};
			}

			if (lanes.has(lane_name) && lanes.get(lane_name)!.status === "running") {
				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" is already running.` }],
					details: { lane: lane_name, status: "already_running" },
				};
			}

			let worktreePath: string;
			let branchName: string;
			let baseCommit: string;
			try {
				const wt = createWorktree(lane_name);
				worktreePath = wt.worktreePath;
				branchName = wt.branchName;
				baseCommit = wt.baseCommit;
			} catch (err: any) {
				return {
					content: [{ type: "text" as const, text: `Failed to create worktree for lane "${lane_name}": ${err.message}` }],
					details: { lane: lane_name, status: "error" },
				};
			}

			const lane: LaneState = {
				name: lane_name,
				task,
				model,
				filesOwned: files_owned,
				filesShared: files_shared || config.sharedFiles,
				worktreePath,
				branchName,
				baseCommit,
				status: "pending",
				progress: 0,
				elapsed: 0,
				lastWork: "",
				toolCount: 0,
				reviewScore: 0,
				reviewDetails: [],
			};
			lanes.set(lane_name, lane);

			if (onUpdate) {
				onUpdate({
					content: [{ type: "text" as const, text: `Dispatching lane ${lane_name}...` }],
					details: { lane: lane_name, status: "dispatching" },
				});
			}

			const result = await dispatchLane(lane, ctx);

			const truncated = result.output.length > 8000
				? result.output.slice(0, 8000) + "\n\n... [truncated]"
				: result.output;

			const status = result.exitCode === 0 ? "done" : "error";
			const summary = `[lane:${lane_name}] ${status} in ${Math.round(result.elapsed / 1000)}s (${lane.toolCount} tools)`;

			return {
				content: [{ type: "text" as const, text: `${summary}\n\n${truncated}` }],
				details: {
					lane: lane_name,
					status,
					elapsed: result.elapsed,
					exitCode: result.exitCode,
					toolCount: lane.toolCount,
				},
			};
		},

		renderCall(args, theme) {
			const lane = (args as any).lane_name || "?";
			const task = (args as any).task || "";
			const preview = task.length > 50 ? task.slice(0, 47) + "..." : task;
			return new Text(
				theme.fg("toolTitle", theme.bold("dispatch_lane ")) +
				theme.fg("accent", lane) +
				theme.fg("dim", " — ") +
				theme.fg("muted", preview),
				0, 0,
			);
		},

		renderResult(result, options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (options.isPartial || details.status === "dispatching") {
				return new Text(
					theme.fg("accent", `● ${details.lane || "?"}`) +
					theme.fg("dim", " working..."),
					0, 0,
				);
			}
			const icon = details.status === "done" ? "✓" : "✗";
			const color = details.status === "done" ? "success" : "error";
			const elapsed = typeof details.elapsed === "number" ? Math.round(details.elapsed / 1000) : 0;
			return new Text(
				theme.fg(color, `${icon} lane:${details.lane}`) +
				theme.fg("dim", ` ${elapsed}s ${details.toolCount || 0} tools`),
				0, 0,
			);
		},
	});

	// ── Tool 3: review_lane ───────────────────────────────────────────

	pi.registerTool({
		name: "review_lane",
		label: "Review Lane",
		description:
			"Run a multi-model review gate on a lane's output. " +
			"Multiple AI models score the lane's changes for correctness, completeness, quality, security, performance, and test coverage. " +
			"Requires consensus (score >= threshold and min approvals) to pass.",
		parameters: Type.Object({
			lane_name: Type.String({ description: "Name of the lane to review" }),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { lane_name } = params;
			const lane = lanes.get(lane_name);

			if (!lane) {
				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" not found.` }],
					details: { lane: lane_name, status: "not_found" },
				};
			}

			if (lane.status === "running") {
				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" is still running. Wait for it to finish.` }],
					details: { lane: lane_name, status: "still_running" },
				};
			}

			if (onUpdate) {
				onUpdate({
					content: [{ type: "text" as const, text: `Reviewing lane ${lane_name} with ${config.reviewModels.length} models...` }],
					details: { lane: lane_name, status: "reviewing" },
				});
			}

			const result = await reviewLane(lane, ctx);

			const reviewSummary = result.details.map(d =>
				`  ${d.recommendation === "approve" ? "✓" : "✗"} ${d.model}: ${d.score.toFixed(2)} (${d.recommendation})` +
				(d.issues.length ? "\n    Issues: " + d.issues.join(", ") : "")
			).join("\n");

			const verdict = result.passed ? "PASSED" : "FAILED";
			const summary = `Review ${verdict} — Score: ${result.score.toFixed(2)}\n\n${reviewSummary}`;

			return {
				content: [{ type: "text" as const, text: summary }],
				details: {
					lane: lane_name,
					passed: result.passed,
					score: result.score,
					reviews: result.details,
				},
			};
		},

		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold("review_lane ")) +
				theme.fg("accent", (args as any).lane_name || "?"),
				0, 0,
			);
		},

		renderResult(result, options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (options.isPartial || details.status === "reviewing") {
				return new Text(
					theme.fg("warning", `◎ ${details.lane || "?"}`) +
					theme.fg("dim", " reviewing..."),
					0, 0,
				);
			}
			const icon = details.passed ? "✓" : "✗";
			const color = details.passed ? "success" : "error";
			const score = typeof details.score === "number" ? details.score.toFixed(2) : "?";
			return new Text(
				theme.fg(color, `${icon} review:${details.lane}`) +
				theme.fg("dim", ` score:${score}`),
				0, 0,
			);
		},
	});

	// ── Tool 4: integrate_lane ────────────────────────────────────────

	pi.registerTool({
		name: "integrate_lane",
		label: "Integrate Lane",
		description:
			"Merge a lane's worktree back into the main branch. " +
			"The lane must have a passing review before integration.",
		parameters: Type.Object({
			lane_name: Type.String({ description: "Name of the lane to integrate" }),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const { lane_name } = params;
			const lane = lanes.get(lane_name);

			if (!lane) {
				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" not found.` }],
					details: { lane: lane_name, status: "not_found" },
				};
			}

			if (lane.status !== "approved") {
				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" must have a passing review before integration. Current status: ${lane.status}` }],
					details: { lane: lane_name, status: "not_approved" },
				};
			}

			try {
				execSync(
					`git merge --no-ff "${lane.branchName}" -m "Merge lane ${lane.name}: ${lane.task.slice(0, 50)}"`,
					{ cwd: projectRoot, stdio: "pipe" },
				);

				removeWorktree(lane.worktreePath, lane.branchName);
				lanes.delete(lane_name);
				updateWidget();

				return {
					content: [{ type: "text" as const, text: `Lane "${lane_name}" integrated successfully. Worktree cleaned up.` }],
					details: { lane: lane_name, status: "integrated" },
				};
			} catch (err: any) {
				return {
					content: [{ type: "text" as const, text: `Integration failed for lane "${lane_name}": ${err.message}` }],
					details: { lane: lane_name, status: "error", error: err.message },
				};
			}
		},

		renderCall(args, theme) {
			return new Text(
				theme.fg("toolTitle", theme.bold("integrate_lane ")) +
				theme.fg("accent", (args as any).lane_name || "?"),
				0, 0,
			);
		},

		renderResult(result, _options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			const icon = details.status === "integrated" ? "✓" : "✗";
			const color = details.status === "integrated" ? "success" : "error";
			return new Text(
				theme.fg(color, `${icon} ${details.lane}`) +
				theme.fg("dim", ` ${details.status}`),
				0, 0,
			);
		},
	});

	// ── Blocking gate ──────────────────────────────────────────────────

	pi.on("tool_call", async (event, _ctx) => {
		if (event.toolName === "mic_tasks") return { block: false };

		const pending = tasks.filter(t => t.status !== "done");
		const active = tasks.filter(t => t.status === "inprogress");

		if (tasks.length === 0) {
			return {
				block: true,
				reason: "No MIC tasks defined. You MUST use `mic_tasks plan` and `mic_tasks add` to define your tasks before using any other tools. Plan your work first!",
			};
		}
		if (pending.length === 0) {
			return {
				block: true,
				reason: "All MIC tasks are done. Use `mic_tasks add` for new tasks or `mic_tasks plan` to start fresh.",
			};
		}
		if (active.length === 0) {
			return {
				block: true,
				reason: "No task is in progress. Use `mic_tasks toggle` to mark a task as inprogress before doing any work.",
			};
		}

		return { block: false };
	});

	// ── Auto-nudge on agent_end ────────────────────────────────────────

	pi.on("agent_end", async (_event, _ctx) => {
		const incomplete = tasks.filter(t => t.status !== "done");
		if (incomplete.length === 0 || nudgedThisCycle) return;

		nudgedThisCycle = true;

		const taskList = incomplete
			.map(t => `  ${STATUS_ICON[t.status]} #${t.id} [${t.status}]: ${t.text}${t.lane ? ` (lane:${t.lane})` : ""}`)
			.join("\n");

		pi.sendMessage(
			{
				customType: "mic-nudge",
				content: `You still have ${incomplete.length} incomplete task(s):\n\n${taskList}\n\nEither continue working on them, dispatch to lanes, or mark them done.`,
				display: true,
			},
			{ triggerTurn: true },
		);
	});

	pi.on("input", async () => {
		nudgedThisCycle = false;
		return { action: "continue" as const };
	});

	// ── System prompt ──────────────────────────────────────────────────

	pi.on("before_agent_start", async (_event, _ctx) => {
		const taskSummary = tasks.length > 0
			? tasks.map(t =>
				`  ${STATUS_ICON[t.status]} #${t.id} (${t.status}): ${t.text}${t.lane ? ` [lane:${t.lane}]` : " [self]"}`
			).join("\n")
			: "  No tasks defined yet.";

		const laneSummary = lanes.size > 0
			? Array.from(lanes.values()).map(l =>
				`  ${LANE_ICON[l.status]} ${l.name}: ${l.status}${l.reviewScore ? ` score:${l.reviewScore.toFixed(2)}` : ""}`
			).join("\n")
			: "  No lanes active.";

		return {
			systemPrompt: [
				`You are a MIC (Multi Instance Claude) orchestrator — a hybrid agent that can work directly AND dispatch to lane subagents.`,
				``,
				`## How MIC Works`,
				`1. FIRST: Define tasks using mic_tasks (plan + add). This is MANDATORY before any work.`,
				`2. For each task, decide: work directly (simple) OR dispatch to a lane (complex/parallel)`,
				`3. Lane agents work in isolated git worktrees with file ownership`,
				`4. Review lane work with multi-model review gates before integration`,
				`5. Integrate approved lanes back to main`,
				``,
				`## When to Work Directly`,
				`- Simple changes, single-file edits, quick lookups`,
				`- Tasks that touch few files or are straightforward`,
				`- Reading, exploring, answering questions`,
				``,
				`## When to Dispatch to Lanes`,
				`- Multi-file changes across different domains`,
				`- Parallelizable tasks with disjoint file sets`,
				`- Large features that benefit from isolation`,
				`- Work that needs independent testing`,
				``,
				`## Conflict Risk Heuristic`,
				`- If multiple tasks need overlapping files: do them yourself sequentially`,
				`- If tasks touch disjoint file sets: dispatch as parallel lanes`,
				`- Shared files (package.json, tsconfig.json): assign to one lane or do yourself`,
				``,
				`## Workflow`,
				`1. mic_tasks plan → Define the plan`,
				`2. mic_tasks add → Add tasks (with optional lane assignment)`,
				`3. mic_tasks toggle → Mark task in-progress`,
				`4. Work directly OR dispatch_lane → Do the work`,
				`5. review_lane → Multi-model review gate for lane work`,
				`6. integrate_lane → Merge approved lane work`,
				`7. mic_tasks toggle → Mark task done`,
				`8. Repeat until all tasks complete`,
				``,
				`## Current State`,
				``,
				`### Tasks`,
				taskSummary,
				``,
				`### Lanes`,
				laneSummary,
				``,
				`## File Ownership Defaults`,
				`Shared files: ${config.sharedFiles.join(", ")}`,
				`Readonly files: ${config.readonlyFiles.join(", ")}`,
				``,
				`## Review Gate`,
				`Models: ${config.reviewModels.join(", ")}`,
				`Passing score: ${config.passingScore}`,
				`Min approvals: ${config.minApprovals}/${config.reviewModels.length}`,
			].join("\n"),
		};
	});

	// ── Commands ──────────────────────────────────────────────────────

	pi.registerCommand("mic", {
		description: "Show MIC dashboard — tasks, lanes, review scores",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/mic requires interactive mode", "error");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				return new MicOverlayComponent(tasks, lanes, theme, () => done());
			});
		},
	});

	pi.registerCommand("mic-reset", {
		description: "Clean all worktrees, reset MIC state",
		handler: async (_args, ctx) => {
			const confirmed = await ctx.ui.confirm(
				"Reset MIC?",
				`This will clean ${lanes.size} lane(s), remove worktrees, and reset tasks. Continue?`,
				{ timeout: 30000 },
			);
			if (!confirmed) {
				ctx.ui.notify("Reset cancelled", "info");
				return;
			}

			for (const [, lane] of lanes) {
				if (lane.timer) clearInterval(lane.timer);
			}

			cleanAllWorktrees();
			lanes.clear();
			tasks = [];
			nextId = 1;
			refreshUI(ctx);
			ctx.ui.notify("MIC reset complete. All lanes and tasks cleared.", "success");
		},
	});

	// ── Session events ────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
		projectRoot = ctx.cwd;
		config = loadConfig(ctx.cwd);
		widgetCtx = ctx;

		cleanAllWorktrees();
		lanes.clear();
		reconstructState(ctx);

		ctx.ui.notify(
			`MIC Orchestrator loaded\n` +
			`Review models: ${config.reviewModels.length}\n` +
			`Max parallel lanes: ${config.maxParallelLanes}\n\n` +
			`/mic             Dashboard overlay\n` +
			`/mic-reset       Reset everything`,
			"info",
		);
	});

	pi.on("session_switch", async (_event, ctx) => {
		widgetCtx = ctx;
		reconstructState(ctx);
	});
	pi.on("session_fork", async (_event, ctx) => {
		widgetCtx = ctx;
		reconstructState(ctx);
	});
	pi.on("session_tree", async (_event, ctx) => {
		widgetCtx = ctx;
		reconstructState(ctx);
	});
}
