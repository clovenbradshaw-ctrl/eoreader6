// eoreader6 · reading-regime-frankenstein — spec 11 Assembly B, acceptance
// B1/B2 at real scale: does an Atmosphere built from `recalled` (not the
// material's raw token statistics) correspond to real chapter boundaries,
// more than a shuffled reading of the same material does?
//
// Same corpus, same declared numbers, and the same scoring instruments
// (scripts/lib/surrogates.mjs) as scripts/activation-clearings.mjs, which
// already measured `recalled` itself (22/24 tight recall, p≈0.005 rotated).
// This script asks a different question with the same material: not "does
// the channel correlate with boundaries" (already answered) but "does the
// REGIME TRACKER, fed that channel, place its re-zero events at those
// boundaries" — the seam readingRegime.js wires, scored the way this repo
// already scores everything else it is not certain of.
//
// B1: regime starts vs. the 24 real chapter markers — agreement recorded,
//     not required. A regime is not defined as a chapter (spec 11 §4).
// B2: shuffled-frame control — regime count against the slack-run null's
//     own expectation, via scripts/lib/surrogates.mjs's shuffleControl,
//     the same "run the whole mechanism again on the series shuffled"
//     device activation-clearings.mjs already uses for the other channels.
//
// Usage: node scripts/reading-regime-frankenstein.mjs [path]

import { readFileSync } from "node:fs";
import { readingRegime } from "../packages/engine/loops/reading-regime.js";
import { tokenize, chunkWords } from "../packages/engine/perceiver/text/material.js";
import { tightWindow, hits, precision, chanceBaseline, rotationNull, shuffleControl, stats } from "./lib/surrogates.mjs";

const PATH = process.argv[2] || "scripts/adversarial/fixtures/pg84-frankenstein.txt";
const CHUNK = 100; // same unit activation-clearings.mjs already measured recalled in
const SPEC = { channel: "recalled", window: 12, draws: 200, tolerance: 3, reseeds: 5, seed: 17, statistic: "burstiness", findOn: ["regularity"] };
const CONTROLS = Number(process.env.CONTROLS || 30);

const text = readFileSync(PATH, "utf8").replace(/\r\n/g, "\n");
const words = tokenize(text);
const chunks = chunkWords(words, CHUNK);
const frames = chunks.map((ws, order) => ({ order, offset: order * CHUNK, words: ws }));

const CHAPTER_RE = /^(?:CHAPTER|Chapter)\s+[IVXLC0-9]+/;
const lines = text.split("\n");
let charOffset = 0;
const markerOffsets = [];
for (const line of lines) {
  if (CHAPTER_RE.test(line)) markerOffsets.push(charOffset);
  charOffset += line.length + 1;
}
const truth = [...new Set(markerOffsets.map((o) => Math.floor(tokenize(text.slice(0, o)).length / CHUNK)))]
  .filter((c) => c > 0)
  .sort((a, b) => a - b);

console.log(`=== ${PATH}`);
console.log(`${words.length} tokens -> ${chunks.length} frames of ${CHUNK}; ${truth.length} chapter markers`);
console.log(`spec=${JSON.stringify(SPEC)}\n`);

const t0 = Date.now();
const { records, regimes, gaps } = readingRegime(frames, SPEC);
const readMs = Date.now() - t0;

const rezeroFrames = () => records.filter((r) => r.rezeroed).map((r) => r.order);

const w = tightWindow(SPEC);
const found = rezeroFrames();
const h = hits(found, truth, w);
const prec = precision(found, truth, w);
const chance = chanceBaseline(found.length, truth, w, frames.length);

console.log(`read in ${(readMs / 1000).toFixed(1)}s — ${gaps.length} typed gaps (ramp-up), ${regimes.length} regimes, ${found.length} rezero(s)`);
console.log(`\n=== B1 — regime starts vs. the 24 real chapter markers (agreement recorded, not required) ===`);
console.log(`recall ${h}/${truth.length}  precision ${prec}/${found.length}  chance ${chance.toFixed(2)}`);
console.log(`rezero frames: ${found.join(", ") || "(none)"}`);

const rot = rotationNull(found, truth, w, frames.length, 4);
const rs = stats(rot);
const rotP = rot.length ? (rot.filter((x) => x >= h).length / rot.length).toFixed(3) : "—";
console.log(`ROTATED chapters: ${rs.mean.toFixed(1)}±${rs.sd.toFixed(1)}  p≈${rotP}`);

console.log(`\n=== B2 — shuffled-frame control ===`);
const shuffledCounts = shuffleControl(
  frames,
  (shuffledFrames) => {
    const reordered = shuffledFrames.map((f, i) => ({ ...f, order: i, offset: i * CHUNK }));
    return readingRegime(reordered, SPEC).records.filter((r) => r.rezeroed).length;
  },
  CONTROLS,
);
const ss = stats(shuffledCounts);
console.log(`real rezero count: ${found.length}`);
console.log(`shuffled (${CONTROLS} trials): mean ${ss.mean.toFixed(2)} ± ${ss.sd.toFixed(2)}, range [${ss.min}, ${ss.max}]`);
const geReal = shuffledCounts.filter((c) => c >= found.length).length;
console.log(`p(shuffled >= real) ≈ ${(geReal / CONTROLS).toFixed(3)} (${geReal}/${CONTROLS})`);
console.log(`\nWhat would refuse this assembly (spec 11 §4): if regime boundaries from`);
console.log(`recalled land at the rate the shuffled/slack-run population predicts, the`);
console.log(`channel is a boundary detector and not an Atmosphere — record that and stop.`);
