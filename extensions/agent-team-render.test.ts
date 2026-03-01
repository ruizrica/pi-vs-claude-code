/**
 * ABOUTME: Tests for compact agent card renderer
 * ABOUTME: TDD tests for renderCompactCard used in agent-team grid alternate view
 */

import { describe, it, expect } from "bun:test";
import { renderCompactCard, type CardRenderState, type RenderTheme } from "./agent-team-render.ts";

const mockTheme: RenderTheme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

function makeCard(overrides: Partial<CardRenderState> = {}): CardRenderState {
	return {
		name: "scout",
		status: "idle",
		elapsed: 0,
		contextPct: 0,
		...overrides,
	};
}

describe("renderCompactCard", () => {
	const COL_WIDTH = 30;

	it("produces exactly 4 lines (top border, name, status, bottom border)", () => {
		const lines = renderCompactCard(makeCard(), COL_WIDTH, mockTheme);
		expect(lines.length).toBe(4);
	});

	it("first and last lines are box borders matching colWidth", () => {
		const lines = renderCompactCard(makeCard(), COL_WIDTH, mockTheme);
		expect(lines[0]).toContain("┌");
		expect(lines[0]).toContain("┐");
		expect(lines[3]).toContain("└");
		expect(lines[3]).toContain("┘");
	});

	it("displays agent name on second line, title-cased", () => {
		const lines = renderCompactCard(makeCard({ name: "code-builder" }), COL_WIDTH, mockTheme);
		expect(lines[1]).toContain("Code Builder");
	});

	it("displays percentage on the same line as agent name, right-aligned", () => {
		const lines = renderCompactCard(makeCard({ name: "scout", contextPct: 45 }), COL_WIDTH, mockTheme);
		const nameLine = lines[1];
		expect(nameLine).toContain("Scout");
		expect(nameLine).toContain("45%");
		// Percentage should appear after the name
		const nameIdx = nameLine.indexOf("Scout");
		const pctIdx = nameLine.indexOf("45%");
		expect(pctIdx).toBeGreaterThan(nameIdx);
	});

	it("displays status icon and status text on third line", () => {
		const lines = renderCompactCard(makeCard({ status: "running" }), COL_WIDTH, mockTheme);
		expect(lines[2]).toContain("●");
		expect(lines[2]).toContain("running");
	});

	it("shows elapsed time on status line when not idle", () => {
		const lines = renderCompactCard(makeCard({ status: "running", elapsed: 12000 }), COL_WIDTH, mockTheme);
		expect(lines[2]).toContain("12s");
	});

	it("does not show elapsed time when idle", () => {
		const lines = renderCompactCard(makeCard({ status: "idle", elapsed: 0 }), COL_WIDTH, mockTheme);
		expect(lines[2]).not.toMatch(/\d+s/);
	});

	it("uses correct status icons: idle=○, running=●, done=✓, error=✗", () => {
		const idle = renderCompactCard(makeCard({ status: "idle" }), COL_WIDTH, mockTheme);
		const running = renderCompactCard(makeCard({ status: "running" }), COL_WIDTH, mockTheme);
		const done = renderCompactCard(makeCard({ status: "done" }), COL_WIDTH, mockTheme);
		const error = renderCompactCard(makeCard({ status: "error" }), COL_WIDTH, mockTheme);

		expect(idle[2]).toContain("○");
		expect(running[2]).toContain("●");
		expect(done[2]).toContain("✓");
		expect(error[2]).toContain("✗");
	});

	it("truncates long names to fit within colWidth", () => {
		const lines = renderCompactCard(
			makeCard({ name: "very-long-agent-name-that-exceeds-width" }),
			20,
			mockTheme,
		);
		// No content line should exceed colWidth in visible chars
		for (const line of lines) {
			expect(line.length).toBeLessThanOrEqual(20);
		}
	});

	it("does not include context bar or description lines", () => {
		const lines = renderCompactCard(
			makeCard({ contextPct: 60 }),
			COL_WIDTH,
			mockTheme,
		);
		// Should NOT have the [###--] bar format anywhere
		expect(lines.join("\n")).not.toContain("[#");
		expect(lines.join("\n")).not.toContain("[-");
		// Exactly 4 lines — no extras
		expect(lines.length).toBe(4);
	});

	it("rounds contextPct up for display", () => {
		const lines = renderCompactCard(makeCard({ contextPct: 33.3 }), COL_WIDTH, mockTheme);
		expect(lines[1]).toContain("34%");
	});

	it("shows 0% when contextPct is 0", () => {
		const lines = renderCompactCard(makeCard({ contextPct: 0 }), COL_WIDTH, mockTheme);
		expect(lines[1]).toContain("0%");
	});
});
