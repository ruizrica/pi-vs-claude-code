/**
 * ABOUTME: Tests for vertical timeline pipeline renderer
 * ABOUTME: TDD tests for renderVerticalTimeline and renderCollapsedTimeline
 */

import { describe, it, expect } from "bun:test";
import {
	renderVerticalTimeline,
	renderCollapsedTimeline,
	type PhaseRenderState,
	type RenderTheme,
} from "./pipeline-render.ts";

const mockTheme: RenderTheme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

function makePhase(overrides: Partial<PhaseRenderState> & { name: string }): PhaseRenderState {
	return {
		status: "pending",
		summary: "",
		agents: [],
		...overrides,
	};
}

function makeAgent(overrides: Partial<PhaseRenderState["agents"][0]> = {}): PhaseRenderState["agents"][0] {
	return {
		role: "scout",
		index: 0,
		status: "idle",
		lastWork: "",
		task: "",
		elapsed: 0,
		...overrides,
	};
}

describe("renderVerticalTimeline", () => {
	const WIDTH = 60;

	it("renders all phases pending — each gets 1 dim line with ○", () => {
		const phases = [
			makePhase({ name: "understand" }),
			makePhase({ name: "gather" }),
			makePhase({ name: "plan" }),
		];

		const lines = renderVerticalTimeline(phases, -1, WIDTH, mockTheme);

		// Each pending phase should have its own line with ○ icon
		const phaseLines = lines.filter(l => l.includes("○"));
		expect(phaseLines.length).toBe(3);
		expect(lines.some(l => l.includes("UNDERSTAND"))).toBe(true);
		expect(lines.some(l => l.includes("GATHER"))).toBe(true);
		expect(lines.some(l => l.includes("PLAN"))).toBe(true);
	});

	it("renders first phase active with 0 agents — shows ● with separator line", () => {
		const phases = [
			makePhase({ name: "understand", status: "active" }),
			makePhase({ name: "gather" }),
			makePhase({ name: "plan" }),
		];

		const lines = renderVerticalTimeline(phases, 0, WIDTH, mockTheme);

		// Active phase uses ● icon
		const activeLine = lines.find(l => l.includes("●") && l.includes("UNDERSTAND"));
		expect(activeLine).toBeDefined();
		// Should have separator (─) on the active line
		expect(activeLine!).toContain("─");
		// Pending phases still use ○
		expect(lines.some(l => l.includes("○") && l.includes("GATHER"))).toBe(true);
		expect(lines.some(l => l.includes("○") && l.includes("PLAN"))).toBe(true);
	});

	it("renders first phase active with 3 agents — expands with agent sub-lines", () => {
		const phases = [
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0, status: "running", lastWork: "reading src/parser.ts...", elapsed: 14000 }),
					makeAgent({ role: "scout", index: 1, status: "done", lastWork: "found 3 relevant files", elapsed: 12000 }),
					makeAgent({ role: "scout", index: 2, status: "idle" }),
				],
			}),
			makePhase({ name: "plan" }),
		];

		const lines = renderVerticalTimeline(phases, 0, WIDTH, mockTheme);

		// Active phase header
		expect(lines.some(l => l.includes("●") && l.includes("GATHER"))).toBe(true);

		// Agent sub-lines under │
		const agentLines = lines.filter(l => l.trimStart().startsWith("│"));
		expect(agentLines.length).toBeGreaterThanOrEqual(3);

		// Agent #1 running with time
		expect(lines.some(l => l.includes("Scout #1") && l.includes("14s"))).toBe(true);
		// Agent #2 done with time
		expect(lines.some(l => l.includes("Scout #2") && l.includes("12s"))).toBe(true);
		// Agent #3 idle — no time
		const agent3Line = lines.find(l => l.includes("Scout #3"));
		expect(agent3Line).toBeDefined();
		expect(agent3Line!).not.toMatch(/\d+s/);
	});

	it("renders phase 1 done + phase 2 active — ✓ on phase 1, ● on phase 2", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "task clarified in 12s" }),
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0, status: "running", lastWork: "scanning...", elapsed: 5000 }),
				],
			}),
			makePhase({ name: "plan" }),
		];

		const lines = renderVerticalTimeline(phases, 1, WIDTH, mockTheme);

		// Phase 1 done with ✓ and summary
		const doneLine = lines.find(l => l.includes("✓") && l.includes("UNDERSTAND"));
		expect(doneLine).toBeDefined();
		expect(doneLine!).toContain("task clarified in 12s");

		// Phase 2 active with ●
		expect(lines.some(l => l.includes("●") && l.includes("GATHER"))).toBe(true);

		// Phase 3 pending with ○
		expect(lines.some(l => l.includes("○") && l.includes("PLAN"))).toBe(true);
	});

	it("renders all phases done — all show ✓ with summaries", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "task clarified" }),
			makePhase({ name: "gather", status: "done", summary: "found 5 files" }),
			makePhase({ name: "plan", status: "done", summary: "plan created" }),
		];

		const lines = renderVerticalTimeline(phases, 2, WIDTH, mockTheme);

		const doneLines = lines.filter(l => l.includes("✓"));
		expect(doneLines.length).toBe(3);
		expect(lines.some(l => l.includes("task clarified"))).toBe(true);
		expect(lines.some(l => l.includes("found 5 files"))).toBe(true);
		expect(lines.some(l => l.includes("plan created"))).toBe(true);
	});

	it("no line exceeds width", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "A very long summary that should be truncated when the width is small to avoid overflowing the terminal" }),
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0, status: "running", lastWork: "reading a very long file path that definitely exceeds the available width for display", elapsed: 999000 }),
				],
			}),
			makePhase({ name: "plan" }),
		];

		const testWidth = 50;
		const lines = renderVerticalTimeline(phases, 1, testWidth, mockTheme);

		for (const line of lines) {
			// With mock theme (no ANSI), visible width === string length
			expect(line.length).toBeLessThanOrEqual(testWidth);
		}
	});

	it("agent time display: running shows Xs, idle shows nothing", () => {
		const phases = [
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0, status: "running", elapsed: 7000 }),
					makeAgent({ role: "scout", index: 1, status: "idle", elapsed: 0 }),
				],
			}),
		];

		const lines = renderVerticalTimeline(phases, 0, WIDTH, mockTheme);

		// Running agent shows time
		const runningLine = lines.find(l => l.includes("Scout #1"));
		expect(runningLine).toBeDefined();
		expect(runningLine!).toContain("7s");

		// Idle agent shows no time
		const idleLine = lines.find(l => l.includes("Scout #2"));
		expect(idleLine).toBeDefined();
		expect(idleLine!).not.toMatch(/\d+s/);
	});

	it("agent status icons: idle=○, running=●, done=✓, error=✗", () => {
		const phases = [
			makePhase({
				name: "execute",
				status: "active",
				agents: [
					makeAgent({ role: "builder", index: 0, status: "idle" }),
					makeAgent({ role: "builder", index: 1, status: "running", elapsed: 1000 }),
					makeAgent({ role: "builder", index: 2, status: "done", elapsed: 5000 }),
					makeAgent({ role: "builder", index: 3, status: "error", elapsed: 3000 }),
				],
			}),
		];

		const lines = renderVerticalTimeline(phases, 0, WIDTH, mockTheme);

		// Find each agent's line and check the icon
		const idleLine = lines.find(l => l.includes("Builder #1"));
		const runningLine = lines.find(l => l.includes("Builder #2"));
		const doneLine = lines.find(l => l.includes("Builder #3"));
		const errorLine = lines.find(l => l.includes("Builder #4"));

		expect(idleLine).toBeDefined();
		expect(idleLine!).toContain("○");
		expect(runningLine).toBeDefined();
		expect(runningLine!).toContain("●");
		expect(doneLine).toBeDefined();
		expect(doneLine!).toContain("✓");
		expect(errorLine).toBeDefined();
		expect(errorLine!).toContain("✗");
	});

	it("renders connector │ between phases", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "done" }),
			makePhase({ name: "gather", status: "active" }),
			makePhase({ name: "plan" }),
		];

		const lines = renderVerticalTimeline(phases, 1, WIDTH, mockTheme);

		// There should be connector lines (│ only, no agent text) between phases
		const connectorLines = lines.filter(l => l.trim() === "│");
		expect(connectorLines.length).toBeGreaterThanOrEqual(1);
	});
});

describe("renderCollapsedTimeline", () => {
	const WIDTH = 60;

	it("active phase with agents — shows ● name → PHASE (N agents)", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "done" }),
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0, status: "running" }),
					makeAgent({ role: "scout", index: 1, status: "done" }),
					makeAgent({ role: "scout", index: 2, status: "running" }),
				],
			}),
			makePhase({ name: "plan" }),
		];

		const lines = renderCollapsedTimeline(phases, 1, "feature-scout", WIDTH, mockTheme);

		expect(lines.length).toBe(1);
		expect(lines[0]).toContain("●");
		expect(lines[0]).toContain("feature-scout");
		expect(lines[0]).toContain("→");
		expect(lines[0]).toContain("GATHER");
		expect(lines[0]).toContain("(3 agents)");
	});

	it("active phase with 0 agents — shows ● name → PHASE without agent count", () => {
		const phases = [
			makePhase({ name: "understand", status: "active" }),
			makePhase({ name: "gather" }),
		];

		const lines = renderCollapsedTimeline(phases, 0, "my-pipeline", WIDTH, mockTheme);

		expect(lines.length).toBe(1);
		expect(lines[0]).toContain("●");
		expect(lines[0]).toContain("my-pipeline");
		expect(lines[0]).toContain("UNDERSTAND");
		expect(lines[0]).not.toContain("agents");
	});

	it("no active pipeline (empty phases) — shows dim placeholder", () => {
		const lines = renderCollapsedTimeline([], -1, "test", WIDTH, mockTheme);

		expect(lines.length).toBe(1);
		expect(lines[0]).toContain("○");
	});

	it("all done — shows ✓ name complete", () => {
		const phases = [
			makePhase({ name: "understand", status: "done", summary: "done" }),
			makePhase({ name: "gather", status: "done", summary: "done" }),
			makePhase({ name: "plan", status: "done", summary: "done" }),
		];

		const lines = renderCollapsedTimeline(phases, 2, "feature-scout", WIDTH, mockTheme);

		expect(lines.length).toBe(1);
		expect(lines[0]).toContain("✓");
		expect(lines[0]).toContain("feature-scout");
		expect(lines[0]).toContain("complete");
		expect(lines[0]).not.toContain("●");
	});

	it("line respects width limit", () => {
		const phases = [
			makePhase({
				name: "gather",
				status: "active",
				agents: [
					makeAgent({ role: "scout", index: 0 }),
					makeAgent({ role: "scout", index: 1 }),
				],
			}),
		];

		const narrowWidth = 30;
		const lines = renderCollapsedTimeline(phases, 0, "a-very-long-pipeline-name-that-should-be-truncated", narrowWidth, mockTheme);

		expect(lines.length).toBe(1);
		expect(lines[0].length).toBeLessThanOrEqual(narrowWidth);
	});
});
