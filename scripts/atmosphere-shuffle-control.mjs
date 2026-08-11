// eoreader6 · atmosphere-shuffle-control — DOES THE TIER STACK NEED ORDER,
// OR IS IT READING ITS OWN ARITHMETIC?
//
// Exact precedent, this same codebase: the original loops/turn.js atmosphere
// clearing "recovered 23 of Frankenstein's 24 chapter boundaries" and
// recovered 21-23 of them from the SAME series SHUFFLED (nul/index.js's
// `pattern` docstring; scripts/two-clearings.mjs). Amendment XXIV reported
// large atmosphere/lens/paradigm shift counts on War and Peace using
// loops/tiers.js's createTierStack/foldThrough — a related but DIFFERENT
// mechanism than the one that failed — and never ran this control before
// reporting the numbers. This script runs it.
//
// ONE expensive SVO-extraction pass captures the real per-frame arrival maps
// (node:/edge: keyed counts, exactly what foldThrough already consumes) in
// their real reading order. Then MANY cheap re-folds test: does feeding the
// SAME maps to a fresh tier stack in SHUFFLED order produce a similar shift
// count? If yes, the shift count is a property of the arrival maps' volume
// alone, not of anything about WHEN they arrived — a clock reading its own
// arithmetic, the exact failure this codebase already found once.

import { readFileSync } from "node:fs";
import { splitSentences, stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { extractRelations, discoverRelationVocab } from "../packages/engine/perceiver/text/relations.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../packages/engine/perceiver/text/surfaces.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../packages/engine/perceiver/text/material.js";
import { projectReferents } from "../packages/engine/referents/index.js";
import { createGraph, readTriples, edgeKey } from "../packages/engine/emergence/graph.js";
import { createTierStack, foldThrough, gammaFor } from "../packages/engine/emergence/tiers.js";

const TEXT_PATH = process.argv[2];
if (!TEXT_PATH) throw new Error("usage: node scripts/atmosphere-shuffle-control.mjs <text> [shuffles] [maxArrivals]");
const SHUFFLES = process.argv[3] ? Number(process.argv[3]) : 30;
// tiers.js's own observe() decays EVERY key in the tier's prior on every
// single call (packages/engine/emergence/tiers.js:241, by design — "EVERY
// form decays, not only the arriving ones"). On War and Peace's full 4027
// arrival maps that is genuinely tens of millions of dictionary rewrites
// per shuffle draw; 30 draws at full scale did not finish in a reasonable
// wall-clock time. MAX_ARRIVALS caps the sequence length so the check
// completes — a bounded-size version of the same question, not a different
// question, and reported as such.
const MAX_ARRIVALS = process.argv[4] ? Number(process.argv[4]) : Infinity;

const LADDER = { sentencesPerFrame: 6, window: 12, draws: 200, seed: 20260803, minSurfaces: 1, pruneBelow: 1e-4, tierNames: ["atmosphere", "lens", "paradigm"] };

const { text: body } = stripContainer(readFileSync(TEXT_PATH, "utf8").replace(/\r\n/g, "\n"));
const sentences = splitSentences(body);
const frames = [];
for (let i = 0; i < sentences.length; i += LADDER.sentencesPerFrame) {
  const g = sentences.slice(i, i + LADDER.sentencesPerFrame);
  if (g.length) frames.push({ order: frames.length, offset: g[0].offset, text: g.map((s) => s.text).join(" ") });
}
console.error(`${frames.length} frames; discovering cast…`);

const table = buildFrequencyTable(tokenize(body));
const functionWords = functionWordSet(table);
const surfaces = extractSurfaces(sentences, { functionWords });
const cast = projectReferents(discoverReferents(surfaces).events).filter((r) => !r.mergedInto);
const surfaceToId = [];
for (const r of cast) for (const s of r.surfaces) {
  const n = diaNorm(s);
  if (n.length < 2) continue;
  surfaceToId.push([n, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u"), r.id]);
}
surfaceToId.sort((a, b) => b[0].length - a[0].length);
const resolve = (phrase) => { const p = diaNorm(phrase); for (const [, re, id] of surfaceToId) if (re.test(p)) return id; return null; };

console.error(`${cast.length} referents; reading frames (ONE pass, capturing arrival maps)…`);
const vocab = new Set();
const seenFollowing = new Map();
const arrivalSeq = []; // the real, ordered sequence of per-frame arrival Maps

for (const f of frames) {
  const raw = extractRelations(f.text, { verbs: vocab });
  if (raw.length) {
    const arrival = new Map();
    const bump = (k) => arrival.set(k, (arrival.get(k) ?? 0) + 1);
    for (const r of raw) {
      const subjectId = resolve(r.subject);
      const objectId = resolve(r.object);
      if (subjectId) bump(`node:${subjectId}`);
      if (objectId) bump(`node:${objectId}`);
      if (subjectId && objectId) bump(`edge:${edgeKey({ subjectId, objectId, verb: r.verb })}`);
    }
    if (arrival.size) arrivalSeq.push(arrival);
  }
  const frameVocab = discoverRelationVocab(f.text, { surfaces, functionWords, minSurfaces: LADDER.minSurfaces });
  for (const c of frameVocab.candidates) {
    let set = seenFollowing.get(c.verb);
    if (!set) seenFollowing.set(c.verb, (set = new Set()));
    for (const form of c.surfaceForms) set.add(form);
    if (set.size >= LADDER.minSurfaces) vocab.add(c.verb);
  }
  if (f.order % 1000 === 0) console.error(`  frame ${f.order}/${frames.length}`);
}
console.error(`captured ${arrivalSeq.length} non-empty arrival maps out of ${frames.length} frames`);
const capped = Number.isFinite(MAX_ARRIVALS) ? arrivalSeq.slice(0, MAX_ARRIVALS) : arrivalSeq;
if (capped.length < arrivalSeq.length) console.error(`capped to ${capped.length} arrival maps for tractability (see header)`);
console.error("");

const shiftsOf = (seq) => {
  const tiers = createTierStack(LADDER.tierNames, { window: LADDER.window, draws: LADDER.draws, seed: LADDER.seed });
  for (const arrival of seq) foldThrough(tiers, arrival);
  return Object.fromEntries(tiers.map((t) => [t.name, { shifts: t.shifts, observations: t.observations }]));
};

const t0 = performance.now();
console.error("REAL order:");
const real = shiftsOf(capped);
for (const [name, r] of Object.entries(real)) console.error(`  ${name}: ${r.shifts} shifted / ${r.observations} observed`);
console.error(`  (${((performance.now() - t0) / 1000).toFixed(1)}s for one fold — ${SHUFFLES} shuffles at this rate is ~${(((performance.now() - t0) / 1000) * SHUFFLES / 60).toFixed(1)} min)`);

const prng = (seed) => { let a = (seed | 0) + 0x6d2b79f5; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

console.error(`\n${SHUFFLES} shuffled-order draws (same arrival maps, order destroyed)…`);
const shuffledResults = { atmosphere: [], lens: [], paradigm: [] };
for (let s = 0; s < SHUFFLES; s++) {
  const ts = performance.now();
  const rnd = prng(20260812 + s);
  const shuffled = capped.slice();
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const r = shiftsOf(shuffled);
  for (const name of LADDER.tierNames) shuffledResults[name].push(r[name].shifts);
  console.error(`  draw ${s + 1}/${SHUFFLES} (${((performance.now() - ts) / 1000).toFixed(1)}s) — atmosphere=${r.atmosphere.shifts} lens=${r.lens.shifts} paradigm=${r.paradigm.shifts}`);
}

console.log(`\nCONTROL RESULT — ${TEXT_PATH.split("/").pop()}, ${capped.length} arrival maps${capped.length < arrivalSeq.length ? ` (capped from ${arrivalSeq.length})` : ""}, ${SHUFFLES} shuffled draws`);
for (const name of LADDER.tierNames) {
  const draws = shuffledResults[name];
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  const variance = draws.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, draws.length - 1);
  const std = Math.sqrt(variance);
  const realShifts = real[name].shifts;
  const rank = draws.filter((v) => v <= realShifts).length / draws.length;
  const z = std > 0 ? (realShifts - mean) / std : 0;
  // Three outcomes, not two: real order can produce MORE shifts than
  // shuffled (naively "more structure"), FEWER (real narrative coherence
  // suppresses local surprise relative to randomly-juxtaposed material —
  // the first thing this control actually found, on War and Peace), or be
  // indistinguishable (the turn.js failure mode this control exists to
  // catch). The original two-way check mislabeled the second case
  // "ambiguous" instead of naming it.
  const verdict =
    rank >= 0.95 ? "REAL exceeds shuffled — order matters, more local surprise in real reading order"
    : rank <= 0.05 ? `REAL is BELOW shuffled (z=${z.toFixed(1)}) — order matters, but real narrative coherence produces FEWER local surprises than randomly-juxtaposed material, not more`
    : Math.abs(z) < 2 ? "indistinguishable from shuffled — order does not appear to matter here"
    : "ambiguous";
  console.log(`  ${name.padEnd(11)} real=${String(realShifts).padStart(4)}  shuffled mean=${mean.toFixed(1)} std=${std.toFixed(1)} (range ${Math.min(...draws)}-${Math.max(...draws)})  rank=${rank.toFixed(2)}  ${verdict}`);
}
