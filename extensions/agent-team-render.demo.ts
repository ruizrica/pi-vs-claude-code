/**
 * ABOUTME: Visual demo of compact card rendering
 * ABOUTME: Run with: bun extensions/agent-team-render.demo.ts
 */

import { renderCompactCard, type CardRenderState } from "./agent-team-render.ts";

// ANSI color helpers for terminal output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const colors: Record<string, string> = {
	accent: "\x1b[36m",   // cyan
	dim: "\x1b[90m",      // gray
	muted: "\x1b[37m",    // light gray
	success: "\x1b[32m",  // green
	error: "\x1b[31m",    // red
};

const theme = {
	fg: (color: string, text: string) => `${colors[color] || ""}${text}${RESET}`,
	bold: (text: string) => `${BOLD}${text}${RESET}`,
};

const agents: CardRenderState[] = [
	{ name: "scout", status: "idle", elapsed: 0, contextPct: 0 },
	{ name: "code-builder", status: "running", elapsed: 14000, contextPct: 45 },
	{ name: "reviewer", status: "done", elapsed: 8000, contextPct: 22 },
	{ name: "test-runner", status: "error", elapsed: 3000, contextPct: 67 },
	{ name: "architect", status: "running", elapsed: 42000, contextPct: 88 },
	{ name: "docs-writer", status: "idle", elapsed: 0, contextPct: 12 },
];

const COLS = 3;
const WIDTH = process.stdout.columns || 100;
const GAP = 1;
const colWidth = Math.floor((WIDTH - GAP * (COLS - 1)) / COLS);

console.log(`\n${DIM}── Compact Card View (${colWidth} col width, ${COLS} cols) ──${RESET}\n`);

for (let i = 0; i < agents.length; i += COLS) {
	const row = agents.slice(i, i + COLS);
	const cards = row.map(a => renderCompactCard(a, colWidth, theme));

	// Pad incomplete rows
	while (cards.length < COLS) {
		cards.push(Array(4).fill(" ".repeat(colWidth)));
	}

	for (let line = 0; line < cards[0].length; line++) {
		console.log(cards.map(c => c[line] || "").join(" ".repeat(GAP)));
	}
}

console.log();
