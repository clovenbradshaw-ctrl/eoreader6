// eoreader6 · declared-present — is the writer's own paragraphing a better
// reach-of-the-present than the number I made up?
//
// Every reading in this repo until now passed `window: 12`. Not derived, not
// justified, the same 12 for prose chunks and 512-byte blocks and 50ms audio
// frames. perceiver/text/material.js::consumption now derives it instead from
// the median paragraph — a paragraph break being the writer's own statement
// about what is contemporary with itself — and refuses outright when the chunk
// is coarser than half a paragraph, because then there is no present left to
// represent.
//
// This measures the swap directly. Same text, same grain, same everything: the
// declared present against a sweep of arbitrary ones, scored against
// Frankenstein's 24 chapters with the rotation null that decides.
//
// The comparison is held at constant PHYSICAL resolution — hop is in words,
// not units — so that changing the chunk size does not silently change how
// often the reader is asked to judge.
//
// Usage: node scripts/declared-present.mjs [path]

import { readFileSync } from "node:fs";
import { read } from "../packages/engine/loops/reader.js";
import { isGap } from "../nul/index.js";
import { causalSurprisalSeries, chunkWords, tokenize, consumption } from "../packages/engine/perceiver/text/material.js";
import { readForward, seriesOf } from "../packages/engine/emergence/activation.js";
import { causalWindow, tightWindow, hits, precision, chanceBaseline, rotationNull, shuffled, stats } from "./lib/surrogates.mjs";

const PATH = process.argv[2] || "/home/user/eoreader4.2/tests/fixtures/frankenstein.txt";
const HOP_WORDS = 400; // constant physical resolution across chunk sizes
const CONTROLS = Number(process.env.CONTROLS || 16);
const BASE = { draws: 200, reseeds: 5, tolerance: 3, seed: 17, clearOn: ["moved"] };

const text = readFileSync(PATH, "utf8").replace(/\r\n/g, "\n");
const words = tokenize(text);

const CHAPTER_RE = /^(?:CHAPTER|Chapter)\s+[IVXLC0-9]+/;
const lines = text.split("\n");
let charOffset = 0;
const markerWords = [];
for (const line of lines) {
  if (CHAPTER_RE.test(line)) markerWords.push(tokenize(text.slice(0, charOffset)).length);
  charOffset += line.length + 1;
}

const truthAt = (chunkSize) =>
  [...new Set(markerWords.map((w) => Math.floor(w / chunkSize)))].filter((c) => c > 0).sort((a, b) => a - b);

const scoreRun = (result, truth, spec, extent) => {
  const found = result.events.filter((e) => e.op === "REC").map((e) => e.at);
  const one = (w) => ({ h: hits(found, truth, w), prec: precision(found, truth, w), chance: chanceBaseline(found.length, truth, w, extent) });
  return { found: found.length, boundaries: found, causal: one(causalWindow(spec)), tight: one(tightWindow(spec)) };
};

console.log(`=== ${PATH}`);
console.log(`${words.length} tokens; ${markerWords.length} chapter markers; hop held at ${HOP_WORDS} words throughout\n`);

// What the perceiver says, and where it refuses.
console.log("what the text declares about itself:");
for (const cs of [10, 20, 40, 80, 100]) {
  try {
    const c = consumption(text, { chunkSize: cs });
    console.log(`  chunk ${String(cs).padStart(3)} words → present ${c.present} units (${c.present * cs} words)`);
  } catch (e) {
    console.log(`  chunk ${String(cs).padStart(3)} words → REFUSED: ${e.message.split(". ")[0].replace(/^consumption: /, "")}`);
  }
}

const run = (label, series, spec, truth) => {
  const result = read(series, { consumption: { order: "sequential", unit: "chunk", present: spec.window, basis: label, rate: null }, ...BASE, hop: spec.hop });
  if (isGap(result)) return console.log(`  ${label.padEnd(34)} GAP — ${result.gap}`);
  const r = scoreRun(result, truth, spec, series.length);

  const ctl = [];
  for (let c = 0; c < CONTROLS; c++) {
    const t = read(shuffled(series, 4243 + c * 7919), { consumption: { order: "sequential", unit: "chunk", present: spec.window, basis: "control", rate: null }, ...BASE, hop: spec.hop });
    if (!isGap(t)) ctl.push(scoreRun(t, truth, spec, series.length));
  }

  const out = [];
  for (const which of ["causal", "tight"]) {
    const w = which === "causal" ? causalWindow(spec) : tightWindow(spec);
    const excess = r[which].h - r[which].chance;
    const ce = stats(ctl.map((c) => c[which].h - c[which].chance));
    const z = ce.sd > 0 ? ((excess - ce.mean) / ce.sd).toFixed(1) : "—";
    const rot = rotationNull(r.boundaries, truth, w, series.length, 4);
    const p = (rot.filter((h) => h >= r[which].h).length / rot.length).toFixed(3);
    out.push(`${which} ${String(r[which].h).padStart(2)}/${truth.length} p≈${p} (z${String(z).padStart(5)})`);
  }
  console.log(`  ${label.padEnd(34)} ${String(r.found).padStart(2)} bounds  ${out.join("  |  ")}`);
};

for (const chunkSize of [20, 40]) {
  const chunks = chunkWords(words, chunkSize);
  const truth = truthAt(chunkSize);
  const hop = Math.max(1, Math.round(HOP_WORDS / chunkSize));
  let declared;
  try {
    declared = consumption(text, { chunkSize }).present;
  } catch {
    continue;
  }

  const surprisal = causalSurprisalSeries(chunks);
  const { records } = readForward(chunks.map((ws, order) => ({ order, offset: order * chunkSize, words: ws })));
  const recalled = seriesOf(records, "recalled", { missing: 0 });

  for (const [cname, series] of [["causal surprisal", surprisal], ["recalled", recalled]]) {
    console.log(`\n--- chunk ${chunkSize} words, hop ${hop} units, ${series.length} frames · ${cname}`);
    const windows = [...new Set([declared, 4, 8, 12, 24])].sort((a, b) => a - b);
    for (const w of windows) {
      const tag = w === declared ? `present ${w}  ← DECLARED (paragraph)` : `present ${w}`;
      run(tag, series, { window: w, hop, tolerance: BASE.tolerance }, truth);
    }
  }
}

console.log("\nThe declared present is not chosen to win. If an arbitrary window beats it,");
console.log("that is the finding, and the basis in the perceiver is what has to change.");
