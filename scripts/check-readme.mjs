#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const targetFile = process.argv[2] ?? "README.md";
const filePath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(filePath)) {
  console.error(`ERROR: File not found: ${targetFile}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
const lines = content.split("\n");
const baseDir = path.dirname(filePath);

/**
 * @typedef {{
 *   file: string;
 *   line: number;
 *   severity: "error" | "warning";
 *   type: string;
 *   message: string;
 *   hint: string;
 * }} Issue
 */

/** @type {Issue[]} */
const issues = [];

function addIssue({
  file = targetFile,
  line,
  type,
  message,
  hint,
  severity = "error",
}) {
  issues.push({ file, line, severity, type, message, hint });
}

function isCheckableUrl(value) {
  if (!value || value.startsWith("#")) return false;
  if (/^([a-z][a-z0-9+.-]*:)/i.test(value)) return false; // mailto:, javascript:, data:
  if (value.startsWith("//")) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  return true;
}

function validateRelativeTarget(raw, lineNo, type) {
  if (!isCheckableUrl(raw)) return;

  const plain = raw.split(/[?#]/)[0].trim();
  if (!plain) return;

  let localPath = plain;
  try {
    localPath = decodeURIComponent(plain);
  } catch {
    // keep encoded path on decode failures
  }

  if (!localPath || localPath.startsWith("/")) return;

  const resolved = path.resolve(baseDir, localPath);
  if (!fs.existsSync(resolved)) {
    addIssue({
      file: targetFile,
      line: lineNo,
      type,
      message: `Referenced path does not exist: ${localPath}`,
      hint: "Verify the relative path is correct and exists in the repo.",
    });
  }
}

function checkFrontmatter() {
  if ((lines[0] ?? "").trim() !== "---") return;

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    addIssue({
      line: 1,
      type: "frontmatter",
      message: "YAML frontmatter start marker found but closing `---` is missing",
      hint: "Add a closing `---` line after frontmatter.",
    });
    return;
  }

  const frontmatter = lines.slice(1, closingIndex).join("\n");
  if (!frontmatter.trim()) return;

  try {
    parseYaml(frontmatter);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YAML parse error";
    const lineMatch = message.match(/(?:line|Line)\s+(\d+)/);
    const issueLine = lineMatch ? Number.parseInt(lineMatch[1], 10) + 1 : 2;

    addIssue({
      line: issueLine,
      type: "frontmatter",
      message: "Malformed YAML in frontmatter",
      hint: "Fix YAML syntax (quotes, indentation, separators).",
    });
  }
}

function checkMarkdownLinks(line, lineNo) {
  const malformedStart = /!\[|\[/g;
  let malformedMatch;

  while ((malformedMatch = malformedStart.exec(line)) !== null) {
    const isImage = malformedMatch[0] === "![";
    const start = malformedMatch.index + (isImage ? 2 : 1);
    const openParen = line.indexOf("(", start);
    if (openParen === -1) continue;

    const closeBracket = line.indexOf("]", start);
    if (closeBracket === -1 || closeBracket > openParen) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: isImage ? "markdown-image" : "markdown-link",
        message: `${isImage ? "Image" : "Link"} is missing a closing ] before (`,
        hint: "Use the full Markdown pattern: `![alt](url)` or `[text](url)`.",
      });
    }
  }

  const linkPattern = /!?\[[^\]]*\]\(/g;
  let linkMatch;

  while ((linkMatch = linkPattern.exec(line)) !== null) {
    const token = linkMatch[0];
    const isImage = token.startsWith("!");
    const openParenIndex = linkMatch.index + token.length;
    const closeParenIndex = line.indexOf(")", openParenIndex);

    if (closeParenIndex === -1) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: isImage ? "markdown-image" : "markdown-link",
        message: `${isImage ? "Image" : "Link"} is missing a closing )`,
        hint: "Close each markdown link/image URL with `)`.",
      });
      continue;
    }

    const rawUrl = line.slice(openParenIndex, closeParenIndex).trim();
    if (!rawUrl) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: isImage ? "markdown-image" : "markdown-link",
        message: `${isImage ? "Image" : "Link"} has an empty URL`,
        hint: "Provide a non-empty URL/path inside `(...)`.",
      });
      continue;
    }

    validateRelativeTarget(rawUrl, lineNo, isImage ? "markdown-image" : "markdown-link");
  }
}

function checkHtmlImages(line, lineNo) {
  const imgOpen = /<img\b/gi;
  let tagMatch;

  while ((tagMatch = imgOpen.exec(line)) !== null) {
    const start = tagMatch.index;
    const close = line.indexOf(">", start);
    if (close === -1) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: "html-image",
        message: "`<img>` tag is missing a closing `>`",
        hint: "Close the `<img>` element properly on the same line or rewrite as `<img ... />`.",
      });
      continue;
    }

    const tag = line.slice(start, close + 1);
    const srcMatch = tag.match(/\bsrc\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))/i);
    if (!srcMatch) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: "html-image",
        message: "`<img>` tag is missing `src` attribute",
        hint: "Add `src` with a local path or remote URL, e.g. `<img src=\"./images/foo.png\">`.",
      });
      continue;
    }

    const src = (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? "").trim();
    if (!src) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: "html-image",
        message: "`<img>` tag has an empty `src`",
        hint: "Set `src` to a valid URL/path value.",
      });
      continue;
    }

    validateRelativeTarget(src, lineNo, "html-image");
  }
}

checkFrontmatter();

const headingPattern = /^(#{1,6})\s+(.*)$/;
let firstHeadingSeen = false;
let previousHeadingLevel = 0;
let inCodeFence = false;
let openFenceMarker = "";
let openFenceLine = -1;

for (let index = 0; index < lines.length; index += 1) {
  const lineNo = index + 1;
  const line = lines[index];

  const fenceMatch = line.match(/^\s*([`~]{3,})(.*)$/);
  if (fenceMatch) {
    const marker = fenceMatch[1];
    const trailing = (fenceMatch[2] ?? "").trim();
    const isCloseCandidate = trailing === "";

    if (!inCodeFence) {
      inCodeFence = true;
      openFenceMarker = marker;
      openFenceLine = lineNo;
      continue;
    }

    if (
      isCloseCandidate &&
      marker[0] === openFenceMarker[0] &&
      marker.length >= openFenceMarker.length
    ) {
      inCodeFence = false;
      openFenceMarker = "";
      openFenceLine = -1;
      continue;
    }

    // keep as block content if this line doesn't close the current fence
    continue;
  }

  if (inCodeFence) continue;

  const headingMatch = line.match(headingPattern);
  if (headingMatch) {
    const level = headingMatch[1].length;

    if (!firstHeadingSeen) {
      firstHeadingSeen = true;
      if (level !== 1) {
        addIssue({
          file: targetFile,
          line: lineNo,
          type: "heading",
          severity: "warning",
          message: `First heading uses level ${level} (should usually be level 1)`,
          hint: "Start README with a single `#` top-level heading for consistency.",
        });
      }
      previousHeadingLevel = level;
    } else if (level > previousHeadingLevel + 1) {
      addIssue({
        file: targetFile,
        line: lineNo,
        type: "heading",
        message: `Heading level jumps from ${previousHeadingLevel} to ${level}`,
        hint: "Avoid skipping heading levels (for example, use ## -> ### before ####).",
      });
      previousHeadingLevel = level;
    } else {
      previousHeadingLevel = level;
    }
  }

  checkMarkdownLinks(line, lineNo);
  checkHtmlImages(line, lineNo);
}

if (inCodeFence && openFenceLine !== -1) {
  addIssue({
    file: targetFile,
    line: openFenceLine,
    type: "code-fence",
    message: "Unclosed code fence at end of file",
    hint: "Add a matching closing code fence line (``` or ~~~).",
  });
}

if (issues.length === 0) {
  console.log(`✅ ${targetFile}: no obvious markdown syntax issues found.`);
  process.exit(0);
}

const byType = new Map();
for (const issue of issues) {
  const list = byType.get(issue.type) ?? [];
  list.push(issue);
  byType.set(issue.type, list);
}

console.log(`\n${targetFile}: Found ${issues.length} issue(s):`);
for (const [type, list] of byType.entries()) {
  console.log(`\n- ${type} (${list.length})`);
  list
    .sort((a, b) => a.line - b.line)
    .forEach((issue) => {
      const sev = issue.severity === "warning" ? "[warning] " : "";
      console.log(`  - line ${issue.line}: ${sev}${issue.message}`);
      console.log(`    hint: ${issue.hint}`);
    });
}

process.exit(1);
