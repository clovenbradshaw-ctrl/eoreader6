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
import { causalSurprisalSeries, chunkWords, tokenize, consumption, paragraphWords } from "../packages/engine/perceiver/text/material.js";
import { readForward, seriesOf } from "../packages/engine/emergence/activation.js";
import { causalWindow, tightWindow, hits, precision, chanceBaseline, rotationNull, shuffled, stats } from "./lib/surrogates.mjs";

const PATH = process.argv[2] || "/home/user/eoreader4.2/tests/fixtures/frankenstein.txt";
const HOP_WORDS = 400; // constant physical resolution across chunk sizes
// The shuffled-series control re-runs the whole reading N times and is by far
// the most expensive thing here; the rotation null is free and is the one that
// decides. Default off, available with CONTROLS=n.
const CONTROLS = Number(process.env.CONTROLS || 0);
const BASE = { draws: 200, reseeds: 5, tolerance: 3, seed: 17, clearOn: ["moved"] };

const text = readFileSync(PATH, "utf8").replace(/\r\n/g, "\n");
const words = tokenize(text);
const __paras = paragraphWords(text).sort((a, b) => a - b);
const medianPara = __paras[Math.floor((__paras.length - 1) * 0.5)];

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
    const c = consumption(text, { chunkSize: cs, present: Math.round(medianPara / cs), basis: "paragraph median (REFUTED — kept here as the thing under test)" });
    console.log(`  chunk ${String(cs).padStart(3)} words → present ${c.present} units (${c.present * cs} words)`);
  } catch (e) {
    console.log(`  chunk ${String(cs).padStart(3)} words → REFUSED: ${e.message.split(". ")[0].replace(/^consumption: /, "")}`);
  }
}

const run = (label, series, spec, truth) => {
  const result = read(series, { consumption: { order: "sequential", unit: "chunk", present: spec.window, basis: label, rate: null }, ...BASE, hop: spec.hop });
  if (isGap(result)) { console.log(`  ${label.padEnd(34)} GAP — ${result.gap}`); return null; }
  const r = scoreRun(result, truth, spec, series.length);

  const ctl = [];
  for (let c = 0; c < CONTROLS; c++) {
    const t = read(shuffled(series, 4243 + c * 7919), { consumption: { order: "sequential", unit: "chunk", present: spec.window, basis: "control", rate: null }, ...BASE, hop: spec.hop });
    if (!isGap(t)) ctl.push(scoreRun(t, truth, spec, series.length));
  }

  const out = [];
  const ps = [];
  for (const which of ["causal", "tight"]) {
    const w = which === "causal" ? causalWindow(spec) : tightWindow(spec);
    const rot = rotationNull(r.boundaries, truth, w, series.length, 4);
    const rs = stats(rot);
    const p = (rot.filter((h) => h >= r[which].h).length / rot.length).toFixed(3);
    // The match window in WORDS, because the whole point of this sweep is that
    // the same number of units means different things at different chunk
    // sizes, and a p-value next to an unstated window is not comparable.
    const words = (w.back + w.fwd) * spec.chunkSize;
    let cell = `${which} ${String(r[which].h).padStart(2)}/${truth.length} vs rot ${rs.mean.toFixed(1)} p≈${p} [±${words}w]`;
    if (ctl.length) {
      const ce = stats(ctl.map((c) => c[which].h - c[which].chance));
      const z = ce.sd > 0 ? ((r[which].h - r[which].chance - ce.mean) / ce.sd).toFixed(1) : "—";
      cell += ` (z${z})`;
    }
    ps.push(Number(p));
    out.push(cell);
  }
  console.log(`  ${label.padEnd(32)} ${String(r.found).padStart(2)}b  ${out.join("  |  ")}`);
  return ps;
};

let cells = 0;
let under05 = 0;

for (const chunkSize of [20, 40, 100]) {
  const chunks = chunkWords(words, chunkSize);
  const truth = truthAt(chunkSize);
  const hop = Math.max(1, Math.round(HOP_WORDS / chunkSize));
  let declared = null;
  let refused = null;
  try {
    declared = Math.round(medianPara / chunkSize);
    if (declared < 2) throw new Error("present below the floor at this grain");
  } catch (e) {
    // Kept in the sweep ANYWAY, and labelled. Every prior Frankenstein number
    // in scripts/RESULTS.md was taken at 100-word chunks, which the contract
    // now refuses — so it has to stay in the table, or the question "did the
    // grain change the answer, or did the reader refactor change it?" cannot
    // be told apart. This row is the reproduction check, not a result.
    refused = e.message;
  }

  const surprisal = causalSurprisalSeries(chunks);
  const { records } = readForward(chunks.map((ws, order) => ({ order, offset: order * chunkSize, words: ws })));
  const recalled = seriesOf(records, "recalled", { missing: 0 });

  for (const [cname, series] of [["causal surprisal", surprisal], ["recalled", recalled]]) {
    const note = refused ? "  [CONTRACT REFUSES THIS GRAIN — reproduction check only]" : "";
    console.log(`\n--- chunk ${chunkSize} words, hop ${hop} units, ${series.length} frames · ${cname}${note}`);
    const windows = [...new Set([declared, 4, 8, 12, 24].filter((w) => w != null))].sort((a, b) => a - b);
    for (const w of windows) {
      const tag = w === declared ? `present ${w}  <- DECLARED (paragraph)` : `present ${w}`;
      const got = run(tag, series, { window: w, hop, tolerance: BASE.tolerance, chunkSize }, truth);
      if (got && !refused) { cells += got.length; under05 += got.filter((p) => p < 0.05).length; }
    }
  }
}

console.log(`\n=== how many comparisons were made: ${cells} cells at legal grains, ${under05} below p=0.05.`);
console.log(`At p=0.05 chance alone delivers ${(cells * 0.05).toFixed(1)} of them. A sweep is not a test;`);
console.log(`counting the sweep is what turns it back into one.`);

console.log("\nThe declared present is not chosen to win. If an arbitrary window beats it,");
console.log("that is the finding, and the basis in the perceiver is what has to change.");
