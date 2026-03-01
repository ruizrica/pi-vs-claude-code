/**
 * ABOUTME: Pure rendering functions for agent-team card views
 * ABOUTME: Extracted for testability — compact card renderer for alternate grid view
 */

export interface CardRenderState {
	name: string;
	status: "idle" | "running" | "done" | "error";
	elapsed: number;
	contextPct: number;
}

export interface RenderTheme {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
}

function displayName(name: string): string {
	return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function renderCompactCard(state: CardRenderState, colWidth: number, theme: RenderTheme): string[] {
	const w = colWidth - 2; // inner width (between │ borders)
	const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 3) + "..." : s;

	const statusIcon = state.status === "idle" ? "○"
		: state.status === "running" ? "●"
		: state.status === "done" ? "✓" : "✗";
	const statusColor = state.status === "idle" ? "dim"
		: state.status === "running" ? "accent"
		: state.status === "done" ? "success" : "error";

	// Line 1: Name (left) + percentage (right)
	const name = displayName(state.name);
	const pctStr = `${Math.ceil(state.contextPct)}%`;
	const nameMax = w - 2 - pctStr.length - 1; // 1 pad left, 1 pad right, 1 gap before pct
	const nameText = truncate(name, Math.max(3, nameMax));
	const nameStyled = theme.fg("accent", theme.bold(nameText));
	const pctStyled = theme.fg("dim", pctStr);
	const nameGap = Math.max(1, w - 1 - nameText.length - pctStr.length - 1);
	const nameLine = " " + nameStyled + " ".repeat(nameGap) + pctStyled + " ";
	const nameVisible = 1 + nameText.length + nameGap + pctStr.length + 1;

	// Line 2: Status icon + status text (left) + elapsed time (right)
	const statusStr = `${statusIcon} ${state.status}`;
	const timeStr = state.status !== "idle" ? `${Math.round(state.elapsed / 1000)}s` : "";
	const statusStyled = theme.fg(statusColor, statusStr);
	const timeStyled = timeStr ? theme.fg("dim", timeStr) : "";
	const statusGap = Math.max(1, w - 1 - statusStr.length - timeStr.length - 1);
	const statusLine = " " + statusStyled + " ".repeat(statusGap) + timeStyled + " ";
	const statusVisible = 1 + statusStr.length + statusGap + timeStr.length + 1;

	// Borders
	const top = "┌" + "─".repeat(w) + "┐";
	const bot = "└" + "─".repeat(w) + "┘";
	const border = (content: string, visLen: number) =>
		theme.fg("dim", "│") + content + " ".repeat(Math.max(0, w - visLen)) + theme.fg("dim", "│");

	return [
		theme.fg("dim", top),
		border(nameLine, nameVisible),
		border(statusLine, statusVisible),
		theme.fg("dim", bot),
	];
}
