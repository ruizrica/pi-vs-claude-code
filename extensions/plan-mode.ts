/**
 * Plan Mode UI
 *
 * Shift+Tab toggles plan mode.
 * - Highlights the editor input when active
 * - Generates a numbered multi-step plan from assistant responses
 * - Tracks execution with [DONE:n] markers
 * - Optional dispatch of each plan step via /sub
 *
 * Usage:
 *   pi -e extensions/plan-mode.ts
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { CustomEditor } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { applyExtensionDefaults } from "./themeMap.ts";

interface PlanStep {
	id: number;
	text: string;
	done: boolean;
	dispatched?: boolean;
}

interface PlanModeState {
	enabled: boolean;
	execution: boolean;
	steps: PlanStep[];
	planText: string;
}

interface CustomEntry {
	id: string;
	type: string;
	customType?: string;
	data?: PlanModeState;
}

const DONE_RE = /\[DONE:(\d+)\]/gi;
const PLAN_HEADER_RE = /^\s*plan\s*:?[\s-]*$/im;

// ── Plan-aware editor with a glow-style highlight ──────────────────────

class PlanModeEditor extends CustomEditor {
	private readonly themeObj: Theme;
	private readonly isActive: () => boolean;

	constructor(tui: any, theme: Theme, keybindings: any, isActive: () => boolean) {
		super(tui, theme, keybindings);
		this.themeObj = theme;
		this.isActive = isActive;
	}

	render(width: number): string[] {
		const lines = super.render(width);
		if (!this.isActive()) {
			return lines;
		}

		const label = typeof this.themeObj.fg === "function" ? this.themeObj.fg("warning", " PLAN ") : " PLAN ";
		return lines.map((line, idx) => {
			const prefixed = idx === 0 ? `${label} ` : "";
			return truncateToWidth(typeof this.themeObj.fg === "function" ? this.themeObj.fg("warning", prefixed + line) : prefixed + line, width);
		});
	}
}

// ── Message/plan parsing helpers ─────────────────────────────────────

function isAssistantMessage(msg: any): boolean {
	return !!msg && msg.role === "assistant";
}

function messageText(msg: any): string {
	if (!msg) return "";
	const content = msg.content;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((chunk) => {
				if (!chunk) return "";
				if (typeof chunk === "string") return chunk;
				if (chunk.type === "text") return chunk.text || "";
				if (chunk.type === "toolCall") return `ToolCall:${chunk.name || ""}`;
				return "";
			})
			.join("\n");
	}
	return "";
}

function cleanStep(raw: string): string {
	return raw
		.replace(/`+/g, "")
		.replace(/\*+/g, "")
		.replace(/\s+/g, " ")
		.replace(/^[\s-•*]+/, "")
		.trim();
}

function extractPlanSteps(raw: string): PlanStep[] {
	if (!raw) return [];

	const match = raw.match(PLAN_HEADER_RE);
	const source = match?.index !== undefined ? raw.slice(match.index + (match[0]?.length || 0)) : raw;
	const steps: PlanStep[] = [];
	const linePattern = /^\s*(\d+)\s*[.)]\s+(.+)$/gm;

	for (const m of source.matchAll(linePattern)) {
		const txt = cleanStep(m[2] || "");
		if (!txt || txt.length < 3) continue;
		steps.push({ id: Number.parseInt(m[1] || `${steps.length + 1}`, 10), text: txt, done: false });
	}

	if (!steps.length) return [];
	return steps.slice(0, Math.min(steps.length, 12)).map((s, i) => ({ ...s, id: i + 1 }));
}

function markDoneFromText(raw: string, steps: PlanStep[]): number {
	let changed = 0;
	for (const match of raw.matchAll(DONE_RE)) {
		const id = Number.parseInt(match[1] || "0", 10);
		const step = steps.find((s) => s.id === id);
		if (step && !step.done) {
			step.done = true;
			changed += 1;
		}
	}
	return changed;
}

function doneSummary(steps: PlanStep[]): string {
	if (!steps.length) return "0/0";
	return `${steps.filter((s) => s.done).length}/${steps.length}`;
}

function lineForStep(step: PlanStep, theme: Theme, maxWidth: number): string {
	const marker = step.done
		? typeof theme.fg === "function"
			? theme.fg("success", "✓")
			: "✓"
		: typeof theme.fg === "function"
			? theme.fg("warning", "○")
			: "○";
	const suffix = step.dispatched ? (typeof theme.fg === "function" ? theme.fg("muted", " [sub]") : " [sub]") : "";
	const text =
		visibleWidth(step.text) > Math.max(20, maxWidth - 20)
			? truncateToWidth(step.text, Math.max(20, maxWidth - 20), "…")
			: step.text;
	const idText = typeof theme.fg === "function" ? theme.fg("accent", `#${step.id}`) : `#${step.id}`;
	const contentText = typeof theme.fg === "function" ? theme.fg(step.done ? "dim" : "muted", text) : text;
	return `${marker} ${idText} ${contentText}${suffix}`;
}

// ── Extension ───────────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
	let planModeEnabled = false;
	let executionMode = false;
	let planSteps: PlanStep[] = [];
	let planPrompt = "";
	let editorInstalled = false;

	function applyEditor(ctx: ExtensionContext): void {
		const currentText = ctx.ui.getEditorText();
		ctx.ui.setEditorComponent((tui, theme, keybindings) => new PlanModeEditor(tui, theme, keybindings, () => planModeEnabled));
		editorInstalled = true;
		if (currentText) ctx.ui.setEditorText(currentText);
	}

	function restoreEditor(ctx: ExtensionContext): void {
		if (!editorInstalled) return;
		const currentText = ctx.ui.getEditorText();
		ctx.ui.setEditorComponent(undefined);
		editorInstalled = false;
		if (currentText) ctx.ui.setEditorText(currentText);
	}

	function persistState(): void {
		pi.appendEntry("ui-plan-mode", {
			enabled: planModeEnabled,
			execution: executionMode,
			steps: planSteps,
			planText: planPrompt,
		} as PlanModeState);
	}

	function setPlanMode(ctx: ExtensionContext, enabled: boolean): void {
		planModeEnabled = enabled;

		if (planModeEnabled) {
			applyEditor(ctx);
			ctx.ui.notify("Plan mode ON. Send a request to build a multi-step plan.", "info");
		} else {
			restoreEditor(ctx);
			executionMode = false;
			ctx.ui.notify("Plan mode OFF", "info");
		}
		persistState();
		updatePlanUi(ctx);
	}

	function togglePlanMode(ctx: ExtensionContext): void {
		setPlanMode(ctx, !planModeEnabled);
	}

	function hasSub(): boolean {
		return pi.getCommands().some((c) => c.name === "sub");
	}

	function hasTilldone(): boolean {
		return pi.getAllTools().some((t) => t.name === "tilldone");
	}

	function dispatchToSubagents(): void {
		if (!planSteps.length) return;
		if (!hasSub()) {
			throw new Error("/sub unavailable. Load extensions/subagent-widget.ts first.");
		}
		for (const step of planSteps) {
			step.dispatched = true;
			pi.sendUserMessage(`/sub Execute plan step #${step.id}: ${step.text}`, { deliverAs: "followUp" });
		}
	}

	function updatePlanUi(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;

		if (planModeEnabled) {
			const status = executionMode
				? `🧭 Plan execution ${doneSummary(planSteps)}`
				: planSteps.length
					? `🧭 Plan ready (${doneSummary(planSteps)})`
					: "🧭 Plan mode enabled";
			ctx.ui.setStatus("plan-mode", status);

			ctx.ui.setWidget("plan-mode", (_tui, theme) => ({
				render(width: number): string[] {
					const lines: string[] = [];
					if (!planSteps.length) {
						lines.push(
							truncateToWidth(
								typeof theme.fg === "function" ? theme.fg("warning", " 🧭 PLAN MODE ") : " 🧭 PLAN MODE ",
								width,
							),
						);
						lines.push(
							truncateToWidth(
								typeof theme.fg === "function"
									? theme.fg("muted", "Ask for a plan, then execute with /plan-run")
									: "Ask for a plan, then execute with /plan-run",
								width,
							),
						);
						lines.push(
							truncateToWidth(
								typeof theme.fg === "function" ? theme.fg("muted", "Shift+Tab again to exit mode") : "Shift+Tab again to exit mode",
								width,
							),
						);
						return lines;
					}

					const heading = executionMode ? "⚙️" : "🧭";
					lines.push(
						truncateToWidth(
							typeof theme.fg === "function"
								? theme.fg("accent", ` ${heading} Plan (${doneSummary(planSteps)}) `)
								: ` ${heading} Plan (${doneSummary(planSteps)}) `,
							width,
						),
					);
					for (const step of planSteps) {
						lines.push(lineForStep(step, theme, width));
					}
					if (executionMode) {
						lines.push(
							truncateToWidth(
								typeof theme.fg === "function"
									? theme.fg("dim", "Tip: mark each done step with [DONE:<id>]")
									: "Tip: mark each done step with [DONE:<id>]",
								width,
							),
						);
					}
					return lines;
				},
				invalidate() {},
			}));
		} else {
			ctx.ui.setStatus("plan-mode", undefined);
			ctx.ui.setWidget("plan-mode", undefined);
		}
	}

	function restoreState(ctx: ExtensionContext): void {
		planModeEnabled = false;
		executionMode = false;
		planSteps = [];
		planPrompt = "";

		for (const raw of ctx.sessionManager.getEntries()) {
			if (raw.type !== "custom") continue;
			const entry = raw as unknown as CustomEntry;
			if (entry.customType !== "ui-plan-mode" || !entry.data) continue;
			if (typeof entry.data.enabled === "boolean") planModeEnabled = entry.data.enabled;
			if (typeof entry.data.execution === "boolean") executionMode = entry.data.execution;
			if (typeof entry.data.planText === "string") planPrompt = entry.data.planText;
			if (Array.isArray(entry.data.steps)) planSteps = [...entry.data.steps];
		}

		if (planModeEnabled && ctx.hasUI) {
			applyEditor(ctx);
		}
		updatePlanUi(ctx);
	}

	pi.on("session_start", async (_event, ctx) => {
		applyExtensionDefaults(import.meta.url, ctx);
		restoreState(ctx);
	});

	pi.on("session_switch", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("session_fork", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.registerShortcut("shift+tab", {
		description: "Toggle plan mode",
		handler: async (ctx) => {
			togglePlanMode(ctx);
		},
	});

	pi.registerCommand("plan", {
		description: "Toggle plan mode + plan input highlight",
		handler: async (_args, ctx) => {
			setPlanMode(ctx, !planModeEnabled);
		},
	});

	pi.registerCommand("plan-clear", {
		description: "Clear current plan and completion state",
		handler: async (_args, ctx) => {
			planSteps = [];
			executionMode = false;
			planPrompt = "";
			persistState();
			updatePlanUi(ctx);
			ctx.ui.notify("Plan cleared", "info");
		},
	});

	pi.registerCommand("plan-run", {
		description: "Run current plan with [DONE:n] tracking",
		handler: async (_args, ctx) => {
			if (!planSteps.length) {
				ctx.ui.notify("No plan loaded yet.", "warning");
				return;
			}
			executionMode = true;
			persistState();
			updatePlanUi(ctx);
			pi.sendUserMessage("Execute the current plan now. After each completed step, include [DONE:n].", { deliverAs: "followUp" });
		},
	});

	pi.registerCommand("plan-dispatch", {
		description: "Dispatch plan steps as /sub tasks",
		handler: async (_args, ctx) => {
			try {
				dispatchToSubagents();
				persistState();
				updatePlanUi(ctx);
				ctx.ui.notify(`Dispatched ${planSteps.length} /sub tasks.`, "success");
			} catch (err: any) {
				ctx.ui.notify(err?.message || "Unable to dispatch /sub tasks", "warning");
			}
		},
	});

	pi.registerCommand("plan-help", {
		description: "Show plan mode / subagent / tilldone integration hints",
		handler: async (_args, ctx) => {
			ctx.ui.notify(
				"Plan workflow:\n" +
					(hasTilldone() ? "• tilldone tool available: keep a separate strict task board there." : "• Load extensions/tilldone.ts for strict task tracking.") +
				"\n" +
				(hasSub() ? "• /sub command available for parallel execution." : "• Load extensions/subagent-widget.ts for /sub dispatching."),
			"info",
		);
		},
	});

	pi.on("context", async (event) => {
		if (!planModeEnabled) return;
		if (!event.messages?.length) return;
		return {
			messages: event.messages.filter((msg: any) => msg.customType !== "plan-mode-context"),
		};
	});

	pi.on("input", async (event, ctx) => {
		if (!planModeEnabled) return { action: "continue" as const };
		if (event.source === "extension") return { action: "continue" as const };
		if (typeof event.text !== "string" || !event.text.trim() || event.text.trim().startsWith("/")) {
			return { action: "continue" as const };
		}

		if (!executionMode && planSteps.length > 0) {
			planSteps = [];
			executionMode = false;
			persistState();
			updatePlanUi(ctx);
		}

		planPrompt = event.text;
		return { action: "continue" as const };
	});

	pi.on("before_agent_start", async () => {
		if (!planModeEnabled) return;

		if (executionMode && planSteps.length > 0) {
			const remaining = planSteps.filter((s) => !s.done);
			const remainingText = remaining
				.map((s) => `${s.id}. ${s.text}`)
				.join("\n");
			return {
				message: {
					customType: "plan-mode-context",
					display: false,
					content: `[PLAN EXECUTION]\nExecute steps in order. After each step, append [DONE:<id>].\n\n${remainingText || "No remaining steps."}`,
				},
			};
		}

		if (planModeEnabled && planSteps.length === 0 && planPrompt) {
			return {
				message: {
					customType: "plan-mode-context",
					display: false,
					content:
						`[PLAN MODE]\nGenerate a concrete implementation plan for the user request.\n` +
						"Output only this format:\n\nPlan:\n1. <step>\n2. <step>\n...\n\n" +
						"No prose. Keep steps actionable and testable.",
				},
			};
		}
		return;
	});

	pi.on("turn_end", async (event, ctx) => {
		if (!planModeEnabled) return;
		if (!executionMode || !planSteps.length) return;

		const assistantText = messageText(event.message as any);
		const changed = markDoneFromText(assistantText, planSteps);
		if (changed > 0) {
			persistState();
			updatePlanUi(ctx);
		}

		if (planSteps.every((s) => s.done)) {
			executionMode = false;
			persistState();
			updatePlanUi(ctx);
			ctx.ui.notify("Plan execution complete.", "success");
		}
	});

	pi.on("agent_end", async (event, ctx) => {
		if (!planModeEnabled) return;
		if (executionMode) return;
		if (planSteps.length > 0) return;

		const lastAssistant = [...event.messages].reverse().find(isAssistantMessage);
		const text = messageText(lastAssistant);
		const steps = extractPlanSteps(text);
		if (!steps.length) return;

		planSteps = steps;
		persistState();
		updatePlanUi(ctx);

		const options = [
			"Execute this plan in main agent",
			hasSub() ? "Dispatch steps to /sub" : "Install /sub and dispatch steps later",
			"Keep as reference",
		] as const;

		const action = await ctx.ui.select("Plan generated. How do you want to continue?", options);
		if (!action) return;

		if (action === options[0]) {
			executionMode = true;
			persistState();
			updatePlanUi(ctx);
			pi.sendUserMessage("Execute the current plan now. Mark each completed step with [DONE:n].", { deliverAs: "followUp" });
		} else if (action === options[1] && hasSub()) {
			dispatchToSubagents();
			persistState();
			updatePlanUi(ctx);
			ctx.ui.notify("Dispatched plan steps via /sub.", "success");
		}
	});
}
