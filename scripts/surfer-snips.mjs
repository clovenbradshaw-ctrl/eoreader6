// eoreader6 · surfer-snips — the no-model NL-prompt surfer, on the real corpus.
//
// A reader says what they want in words; the surfer addresses the prompt to
// the corpus mechanically and snips the segment — with no model anywhere in
// the path. The address ladder, re-earned from eoreader-chat's
// engineReadSegment and the mcp snip tool:
//
//   1. SOURCE   — one document is the corpus; several need the prompt to say
//                which, and an unsaid one is a typed gap.
//   2. HEADING  — "chapter 2", "letter 1", "chapter 18": the boundary the
//                prompt addresses by form. Arabic and roman are one count, so
//                CHAPTER XVIII answers to eighteen.
//   3. CONTENT  — no heading addressed: the prompt's substantive tokens find
//                the best line, and the structural segment around it is the
//                snip — the cluster around the passage the reader described.
//   4. WINDOW   — a passage with no structural boundary in reach comes back
//                as a labelled context window, never an invented chapter.
//
// Every snip is registered in provenance (refId) so a later reader can cite
// it. Every failure is a typed gap, never a guessed answer.

import { readFileSync } from "node:fs";
import { createSession, admitChunked } from "../packages/host/corpus.js";
import { executePrompt } from "../packages/host/surfer.js";
import { stripContainer } from "../packages/engine/perceiver/text/spans.js";

const DEFAULT_PATHS = [
  "/Users/mlacy/Documents/Default Project/pg84.txt",
  "/Users/mlacy/Downloads/pg2600.txt",
];
const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const only = process.argv.includes("--only");

const session = createSession();
for (const p of (paths.length ? paths : DEFAULT_PATHS)) {
  const { text } = stripContainer(
    readFileSync(p, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
  );
  const { chunks } = admitChunked(session, { text, sourceId: `source:${p}` });
  console.log(`ingested ${chunks} chunks from ${p.split("/").pop()}`);
}
console.log("");

const prompts = [
  "letter 1 of pg84",
  "chapter 2 of pg84",
  "the scene about the creature waking in pg84",
  "chapter 18 of pg84",
  "the very start of pg84",
];

const show = (out, i) => {
  console.log(`[${i + 1}] ${out.prompt}`);
  if (out.gap) {
    console.log(`    gap: ${out.gap} — ${out.reason}`);
    return;
  }
  const head = out.text.trim().slice(0, 90).replace(/\s+/g, " ");
  console.log(`    ${out.segment}  (addressed by ${out.addressed_by})`);
  console.log(`    bytes ${out.byte_start}–${out.byte_end} · refId ${out.refId}${out.windowed ? " · WINDOW" : ""}`);
  console.log(`    "${head}${out.text.length > 90 ? "…" : ""}"`);
};

const run = (session, prompts) => {
  for (const p of prompts) show(executePrompt(session, p), prompts.indexOf(p));
  console.log("");
};

run(session, prompts);
if (!only && paths.length === 0) {
  // War and Peace — ask by chapter number across numeral forms, plus a
  // content address, so the ladder is demonstrated on both corpora.
  run(session, [
    "War and Peace — chapter 2 of pg2600",
    "the salon soirée in pg2600",
  ]);
}
