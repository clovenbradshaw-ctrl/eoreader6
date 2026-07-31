// eoreader6 · speak-from-here — read three quarters of a book, then say what
// comes next FROM WHERE YOU ARE.
//
// Usage: node scripts/speak-from-here.mjs [text] [fraction]
//
// The whole apparatus of this session, end to end:
//
//   1. read the material, keeping the causal surprisal it cost
//   2. let `loops/atmosphere` find where the ground was conceded — DETECTED
//      boundaries, never a schedule
//   3. the last boundary before `here` is where the present begins
//   4. everything behind it is PERISHED: settled once, hashed once
//   5. speak from the live wave, reaching back only where it falls silent
//
// WHY THE BOUNDARY COMES FROM ATMOSPHERE. A fixed window would make this a
// sliding-window generator with doctrine written on it, which II.8's second
// consequence refuses — the index is measured by perturbing, never added as an
// inductive bias. Atmosphere's re-zero PLACEMENT is the one boundary detector
// in this repo that has cleared a permutation null on real prose
// (prediction/RESULTS.md: +3,700,838 against a null max of -438,711, holding
// the re-zero COUNT fixed and destroying only where they fell).
//
// It is also structurally blind to a falling level — the same RESULTS.md pins
// that as a MEASURED LIMIT — so the boundaries it finds are real and are not
// all of them. Stated here rather than discovered later.
//
// ── THE GRAIN IS DECLARED, AND THE FIRST CHOICE OF IT DID NOT FINISH ──────
//
// Atmosphere is fed ONE SURPRISAL PER SENTENCE, not per token, and that is a
// claim rather than a convenience.
//
// `createRegimeTracker.push` rebuilds its ground on EVERY push — a full
// `ground()` over `seen.slice(regimeStart, t - window)` at `draws`
// perturbations. That is O(n^2 * draws) in the length of a regime, and
// prediction/RESULTS.md ran the whole battery at n = 320. Handed one value per
// token, Heidi is n = 46,725 before `here` and the pass does not complete.
//
// The grain is the real answer, not a faster tracker. `window` is THE REACH OF
// THE PRESENT, and a present six TOKENS wide is not the scale at which a
// book's atmosphere turns — six sentences is a defensible present and six
// words is not. So the series is per-sentence mean surprisal, `window` reads
// in sentences, and boundaries come back as sentence indices converted to form
// positions. Changing the tracker instead would have been changing an organ's
// measured behaviour to make a script finish.
//
// ── EVERY DECLARED NUMBER ─────────────────────────────────────────────────
const ORDER = 4;
const ALPHA = 0.7;
const HORIZON = 20;
const WINDOW = 6; // atmosphere: the reach of the present, IN SENTENCES (see header)
const DRAWS = 96; // atmosphere: the resolution of testimony
const TOLERANCE = 2; // atmosphere: the resolution of refusal
const SEED = 20260731;
const SHOW = 5;

import { readFileSync, existsSync } from "node:fs";
import { createLayer, createBelief } from "../packages/engine/generation/belief.js";
import { settleGround } from "../packages/engine/generation/settled.js";
import { emitScoped, scopeReport } from "../packages/engine/generation/standpoint.js";
import { emitSequence } from "../packages/engine/generation/emit.js";
import { createRegimeTracker } from "../packages/engine/loops/atmosphere.js";
import { stripContainer, splitSentences } from "../packages/engine/perceiver/text/spans.js";
import { isGap } from "../nul/index.js";

const TEXT = process.argv[2] ?? "scripts/corpus/pg20781.txt";
const FRACTION = Number(process.argv[3] ?? 0.75);
const W = /[\p{L}\p{N}']+|[.,;:!?—"()]/gu;
const tok = (t) => (t.toLowerCase().match(W) ?? []);
const say = (fs) => fs.filter(Boolean).join(" ").replace(/ ([.,;:!?])/g, "$1").replace(/ ?— ?/g, " — ");

if (!existsSync(TEXT)) { console.error(`no text at ${TEXT}`); process.exit(1); }
const text = stripContainer(readFileSync(TEXT, "utf8").replace(/\r\n/g, "\n")).text;
const sentences = splitSentences(text).map((s) => tok(s.text)).filter((s) => s.length > 0);
const tokens = sentences.flat();
const HERE = Math.floor(tokens.length * FRACTION);

console.log(`\nread      ${TEXT} — ${tokens.length.toLocaleString()} forms, ${sentences.length.toLocaleString()} sentences`);
console.log(`here      form ${HERE.toLocaleString()} (${(FRACTION * 100).toFixed(0)}% in)`);
console.log(`declared  order=${ORDER} alpha=${ALPHA} horizon=${HORIZON} window=${WINDOW} draws=${DRAWS} tolerance=${TOLERANCE} seed=${SEED}\n`);

// ── 1-2. Read, and let atmosphere find where the ground was conceded ───────
// The surprisal handed to the tracker is causal by construction: what the
// token cost a belief that had not yet met it.
const reader = createLayer({ id: "read", tier: "read", order: ORDER, gamma: 1, alpha: ALPHA });
const readBelief = createBelief({ layers: [reader] });
const tracker = createRegimeTracker({ window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, seed: SEED });
const boundaries = [];
const seen = [];

let t = Date.now();
let sentenceIdx = 0;
let inSentence = 0;
let sentenceSum = 0;
// Sentence starts, in form positions, so a boundary at sentence s converts
// back to the form where that sentence began.
const sentenceStart = [0];
for (let i = 0; i < HERE; i++) {
  const ctx = seen.slice(Math.max(0, seen.length - ORDER));
  const { p, reserve } = readBelief.probabilityOf(ctx, tokens[i]);
  const mass = p > 0 ? p : reserve;
  sentenceSum += mass > 0 ? -Math.log(mass) : -Math.log(Number.MIN_VALUE);
  inSentence++;
  seen.push(tokens[i]);
  reader.observe(seen, seen.length - 1);

  // One value per sentence: the grain at which this reader concedes ground.
  if (inSentence === sentences[sentenceIdx]?.length) {
    if (tracker.push(sentenceSum / inSentence).rezeroed) boundaries.push(sentenceStart[sentenceIdx]);
    sentenceIdx++;
    sentenceStart.push(seen.length);
    inSentence = 0;
    sentenceSum = 0;
  }
}
console.log(`atmosphere conceded its ground ${boundaries.length} times in ${((Date.now() - t) / 1000).toFixed(1)}s`);
console.log(`  boundaries at forms: ${boundaries.slice(-8).map((b) => b.toLocaleString()).join(", ")}${boundaries.length > 8 ? " (last 8)" : ""}`);

// ── 3. The present begins at the last detected boundary ───────────────────
if (boundaries.length === 0) {
  console.error("\nno boundary was detected before here — the present has no start, and inventing one would be the injected order II.8 refuses.");
  process.exit(1);
}
const FROM = boundaries[boundaries.length - 1];
const scope = scopeReport({ tokens, here: HERE, from: FROM });
console.log(`\nthe present begins at form ${FROM.toLocaleString()} — detected by loops/atmosphere, not scheduled`);
console.log(`  live      ${scope.live_forms.toLocaleString()} forms, ${scope.live_vocabulary.toLocaleString()} distinct`);
console.log(`  perished  ${scope.past_forms.toLocaleString()} forms, ${scope.whole_vocabulary.toLocaleString()} distinct in all`);
console.log(`  the reader speaks from ${(scope.narrowed_to * 100).toFixed(1)}% of the vocabulary it has met\n`);

// ── 4. Settle the past once ───────────────────────────────────────────────
const live = createLayer({ id: "live", tier: "read", order: ORDER, gamma: 1, alpha: ALPHA });
live.train(tokens.slice(FROM, HERE));
const pastLayer = createLayer({
  id: "perished", tier: "received", world: "this", order: ORDER, gamma: 1, alpha: ALPHA,
  giver: `this same reader, at the standpoint ending at form ${FROM}`,
});
pastLayer.train(tokens.slice(0, FROM));
t = Date.now();
const settled = settleGround({ layer: pastLayer, at: FROM, giver: `this same reader, at the standpoint ending at form ${FROM}` });
console.log(`settled once: ${settled.hash.slice(0, 20)}…  (${Date.now() - t}ms, ${settled.vocabulary.toLocaleString()} forms) — perished, so it cannot go stale\n`);

// ── 5. Speak, and compare against what the book actually says ─────────────
// Sentences the reader has not reached, taken at intervals so the examples are
// not all from one stretch.
let offset = 0, firstAfter = 0;
for (let s = 0; s < sentences.length; s++) { if (offset >= HERE) { firstAfter = s; break; } offset += sentences[s].length; }

console.log("═".repeat(76));
const scopedT = [], fullT = [];
const whole = createBelief({ layers: [createLayer({ id: "read", tier: "read", order: ORDER, gamma: 1, alpha: ALPHA })] });
// The unscoped reader, for the side-by-side.
whole.readLayer.train(tokens.slice(0, HERE));

let pos = offset;
for (let k = 0; k < SHOW; k++) {
  const idx = firstAfter + k * Math.max(1, Math.floor((sentences.length - firstAfter) / SHOW));
  if (idx >= sentences.length) break;
  let at = 0;
  for (let s = 0; s < idx; s++) at += sentences[s].length;
  const truth = sentences[idx].slice(0, HORIZON);
  const context = tokens.slice(Math.max(0, at - ORDER), at);

  t = Date.now();
  const scoped = emitScoped({ live, settled, context, horizon: HORIZON, selection: "sampled", seed: SEED + at, order: ORDER });
  scopedT.push(Date.now() - t);
  t = Date.now();
  const full = emitSequence({ belief: whole, context, horizon: HORIZON, conditioning: "free-running", selection: "sampled", seed: SEED + at });
  fullT.push(Date.now() - t);

  console.log(`\nat form ${at.toLocaleString()} (${((at / tokens.length) * 100).toFixed(1)}%)`);
  if (!isGap(scoped)) {
    console.log(`  from here     ${say([...scoped.emitted])}`);
    console.log(`                reached back ${scoped.reached_back}/${HORIZON} times`);
  } else console.log(`  from here     [refused: ${scoped.gap}]`);
  if (!isGap(full)) console.log(`  from all      ${say([...full.emitted])}`);
  console.log(`  the book      ${say([...truth])}${sentences[idx].length > HORIZON ? " …" : ""}`);
}

const mean = (x) => x.reduce((a, b) => a + b, 0) / x.length;
console.log(`\n${"═".repeat(76)}`);
console.log(`per continuation: from here ${mean(scopedT).toFixed(0)}ms   from all ${mean(fullT).toFixed(0)}ms   (${(mean(fullT) / Math.max(1, mean(scopedT))).toFixed(1)}x)`);
console.log("");
