// eoreader6 · predictor-reshape — the high tier sets the probability of the
// low. Not a swapped model: a REVISED CONTROL PARAMETER.
//
// Usage: node scripts/predictor-reshape.mjs
//
// predictor-atmosphere.mjs established the signal: a predictor's own per-form
// loss stream, read through the SAME ground()/pattern() machinery loops/turn.js
// uses on content, produces a correctly-timed `moved` event at a genuine regime
// change. This script is what a predictor-Atmosphere's REC does with that event
// — and the design is deliberately NOT "swap to a different candidate model."
//
// The two defects already on record in this codebase (belief.js's ungated lone
// gift, the abstraction-as-backoff pathology, and now the slot-gated refutation
// in predictor-scientist.mjs) are the same category error: a higher-order signal
// given a LIKELIHOOD role, a vote sized by its own evidence, competing with what
// is already there. `slotExpectation`'s beta is the one place that gets this
// right instead — a PRIOR role, reshaping what the existing terms mean without
// itself appearing as a term.
//
// So here: the reigning predictor's TABLES never change. Only `alpha` — the
// control parameter that decides how much a context's own evidence is trusted
// versus backed off — is revised, and only on a WITNESSED correction:
//
//   DEF   nominate candidate alphas CHEAPLY: score each on the window that just
//         triggered the moved event (no null — that is the cheap step).
//   EVA   witness the best candidate against the SAME reseedNull `pattern()`
//         already computed to detect the regime change in the first place — no
//         second null invented. The improvement must beat the noise floor this
//         exact ground already measured, or the swap is refused, not applied.
//   REC   if witnessed, alpha is revised going forward. If not, the event is
//         logged as a moved-but-unwitnessed reparameterization and alpha holds.
//
// Compared against: a FIXED alpha throughout (what every prior script used),
// and a HARD MODEL SWAP at the same events (train a second predictor on the
// chrome-adjacent material and switch to it wholesale) — the thing this design
// explicitly is NOT, kept as a comparison rather than a strawman.
//
// ── EVERY DECLARED NUMBER ─────────────────────────────────────────────────
const ORDER = 4;
const FIXED_ALPHA = 0.7; // what every earlier script held constant
const ALPHA_CANDIDATES = [0.1, 0.3, 0.7, 1.5, 3.0];
const TRAIN_SIZE = 30000;
const HELDOUT_GAP = 15000;
const HELDOUT_SPAN = 4000;
const LOSS_WINDOW = 40;
const DRAWS = 32;
const RESEEDS = 16;
const STEP = 150;
const SEED = 20260731;

import { readFileSync } from "node:fs";
import { stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { ground, pattern } from "../nul/index.js";

const WORD = /[\p{L}\p{N}']+|[.,;:!?—"()]/gu;
const tokenize = (raw) => stripContainer(raw).text.toLowerCase().match(WORD) ?? [];

const raw = readFileSync("scripts/corpus/pg84.txt", "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
const startMark = "*** START OF THE PROJECT GUTENBERG EBOOK";
const endMark = "*** END OF THE PROJECT GUTENBERG EBOOK";
const startIdx = raw.indexOf(startMark);
const endIdx = raw.indexOf(endMark);
const proseRaw = raw.slice(startIdx + startMark.length, endIdx);
const chromeRaw = raw.slice(endIdx);
const prose = tokenize(proseRaw);
const chrome = chromeRaw.toLowerCase().match(WORD) ?? [];

const CTX_SEP = "";
class Candidate {
  constructor({ order, continuation = false }) {
    this.order = order;
    this.alpha = FIXED_ALPHA;
    this.continuation = continuation;
    this.tables = Array.from({ length: order + 1 }, () => new Map());
    this.continuationOf = new Map();
    this.continuationTotal = 0;
  }
  train(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j <= this.order; j++) {
        if (i - j < 0) break;
        const key = j === 0 ? "" : tokens.slice(i - j, i).join(CTX_SEP);
        let entry = this.tables[j].get(key);
        if (!entry) { entry = { succ: new Map(), total: 0 }; this.tables[j].set(key, entry); }
        entry.succ.set(tokens[i], (entry.succ.get(tokens[i]) ?? 0) + 1);
        entry.total++;
      }
      if (this.continuation) {
        const prev = i >= 1 ? tokens[i - 1] : " START";
        let set = this.continuationOf.get(tokens[i]);
        if (!set) { set = new Set(); this.continuationOf.set(tokens[i], set); }
        if (!set.has(prev)) { set.add(prev); this.continuationTotal++; }
      }
    }
    return this;
  }
  massOf(ctx, form, alphaOverride) {
    const alpha = alphaOverride ?? this.alpha;
    let mass = 0, remaining = 1;
    const reach = Math.min(this.order, ctx.length);
    for (let j = reach; j >= 1; j--) {
      const key = ctx.slice(ctx.length - j).join(CTX_SEP);
      const entry = this.tables[j].get(key);
      if (!entry || !(entry.total > 0)) continue;
      const share = remaining * (entry.total / (entry.total + alpha));
      const c = entry.succ.get(form);
      if (c) mass += (share * c) / entry.total;
      remaining -= share;
      if (remaining <= 0) return { mass, reserve: 0 };
    }
    const entry0 = this.tables[0].get("");
    if (entry0 && entry0.total > 0) {
      const share = remaining * (entry0.total / (entry0.total + alpha));
      let p0 = 0;
      if (this.continuation && this.continuationTotal > 0) {
        p0 = (this.continuationOf.get(form)?.size ?? 0) / this.continuationTotal;
      } else {
        const c = entry0.succ.get(form);
        p0 = c ? c / entry0.total : 0;
      }
      mass += share * p0;
      remaining -= share;
    }
    return { mass, reserve: Math.max(0, remaining) };
  }
}

const reigning = new Candidate({ order: ORDER }).train(prose.slice(0, TRAIN_SIZE));

/** per-form -log(mass or reserve) at a GIVEN alpha, causal, context reaching into `before`. */
const lossAt = (before, span, alpha) => {
  const out = new Array(span.length);
  for (let i = 0; i < span.length; i++) {
    const history = i === 0 ? before : [...before.slice(Math.max(0, before.length - ORDER + i)), ...span.slice(0, i)];
    const ctx = history.slice(Math.max(0, history.length - ORDER));
    const { mass, reserve } = reigning.massOf(ctx, span[i], alpha);
    const p = mass > 0 ? mass : reserve;
    out[i] = p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE);
  }
  return out;
};
const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const heldoutStart = TRAIN_SIZE + HELDOUT_GAP;
const before0 = prose.slice(0, heldoutStart);
const spliceSpan = [...prose.slice(heldoutStart, heldoutStart + HELDOUT_SPAN), ...chrome];
const spliceBoundary = HELDOUT_SPAN;

console.log(`declared   order=${ORDER} fixed_alpha=${FIXED_ALPHA} candidates=[${ALPHA_CANDIDATES}] loss_window=${LOSS_WINDOW} draws=${DRAWS} reseeds=${RESEEDS} step=${STEP}`);
console.log(`splice stream: ${spliceSpan.length} forms, chrome begins at index ${spliceBoundary}\n`);

// ── ARM A: fixed alpha throughout, exactly as every earlier script ─────────
const fixedLoss = lossAt(before0, spliceSpan, FIXED_ALPHA);
console.log(`ARM A — fixed alpha=${FIXED_ALPHA} throughout:`);
console.log(`  prose region (0..${spliceBoundary}):   mean ${meanOf(fixedLoss.slice(0, spliceBoundary)).toFixed(3)} nats/form`);
console.log(`  chrome region (${spliceBoundary}..end): mean ${meanOf(fixedLoss.slice(spliceBoundary)).toFixed(3)} nats/form`);

// ── ARM B: hard swap — retrain a SEPARATE model on chrome-adjacent material at
// the detected boundary and switch wholesale. This is the thing the design is
// deliberately NOT; kept only as the comparison it earns. ─────────────────
const chromeModel = new Candidate({ order: ORDER }).train(chrome.length > 200 ? chrome.slice(0, Math.floor(chrome.length / 2)) : chrome);

// ── ARM C: same reigning model, tables untouched, alpha reshaped on witnessed
// REC events using the identical ground/pattern machinery already validated. ──
let reshapeLog = [];
let liveAlpha = FIXED_ALPHA;
const reshapedLoss = new Array(spliceSpan.length);
let cursor = 0;
let lossHistory = []; // the running loss series under whatever alpha was live at each point
let b = LOSS_WINDOW * 2;
// score the first stretch under the fixed starting alpha
for (; cursor < Math.min(b, spliceSpan.length); cursor++) {
  const history = cursor === 0 ? before0 : [...before0.slice(Math.max(0, before0.length - ORDER + cursor)), ...spliceSpan.slice(0, cursor)];
  const ctx = history.slice(Math.max(0, history.length - ORDER));
  const { mass, reserve } = reigning.massOf(ctx, spliceSpan[cursor], liveAlpha);
  const p = mass > 0 ? mass : reserve;
  reshapedLoss[cursor] = p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE);
  lossHistory.push(reshapedLoss[cursor]);
}

while (b + STEP <= spliceSpan.length) {
  const beforeMat = lossHistory.slice(0, b);
  // score the next STEP forms under the CURRENTLY live alpha first (this is what "reigning" means)
  const stepLoss = [];
  for (let k = 0; k < STEP && cursor < spliceSpan.length; k++, cursor++) {
    const history = [...before0.slice(Math.max(0, before0.length - ORDER + cursor)), ...spliceSpan.slice(0, cursor)];
    const ctx = history.slice(Math.max(0, history.length - ORDER));
    const { mass, reserve } = reigning.massOf(ctx, spliceSpan[cursor], liveAlpha);
    const p = mass > 0 ? mass : reserve;
    const loss = p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE);
    reshapedLoss[cursor] = loss;
    stepLoss.push(loss);
  }
  lossHistory.push(...stepLoss);
  const afterMat = lossHistory.slice(0, b + STEP);

  const gBefore = ground({ material: beforeMat, draws: DRAWS, window: LOSS_WINDOW, statistic: "windowMean", perturbation: "shuffle", seed: SEED });
  const gAfter = ground({ material: afterMat, draws: DRAWS, window: LOSS_WINDOW, statistic: "windowMean", perturbation: "shuffle", seed: SEED });
  if (!gBefore.gap && !gAfter.gap) {
    const pat = pattern({ before: gBefore, after: gAfter, material: beforeMat, reseeds: RESEEDS });
    if (!pat.gap && pat.moved) {
      // DEF: nominate candidate alphas cheaply on the window that just triggered this.
      const recentSpan = spliceSpan.slice(Math.max(0, b - STEP), b + STEP);
      const recentCtxBefore = [...before0, ...spliceSpan.slice(0, Math.max(0, b - STEP))];
      const candidateLoss = ALPHA_CANDIDATES.map((a) => meanOf(lossAt(recentCtxBefore, recentSpan, a)));
      const bestIdx = candidateLoss.reduce((best, v, i) => (v < candidateLoss[best] ? i : best), 0);
      const oldLoss = meanOf(lossAt(recentCtxBefore, recentSpan, liveAlpha));
      const improvement = oldLoss - candidateLoss[bestIdx];
      // EVA: the improvement must beat the SAME reseedNull pattern() already computed for this ground.
      const witnessed = improvement > pat.reseedNull;
      reshapeLog.push({ at: b, from: liveAlpha, proposed: ALPHA_CANDIDATES[bestIdx], improvement, threshold: pat.reseedNull, witnessed });
      if (witnessed) liveAlpha = ALPHA_CANDIDATES[bestIdx];
    }
  }
  b += STEP;
}

console.log(`\nARM C — reshaped alpha, REC events:`);
reshapeLog.forEach((e) =>
  console.log(`  at ${e.at}: alpha ${e.from} -> proposed ${e.proposed}, improvement ${e.improvement.toFixed(4)} vs threshold ${e.threshold.toFixed(4)} — ${e.witnessed ? "WITNESSED, applied" : "refused, held"}`),
);
console.log(`  prose region (0..${spliceBoundary}):   mean ${meanOf(reshapedLoss.slice(0, spliceBoundary)).toFixed(3)} nats/form`);
console.log(`  chrome region (${spliceBoundary}..end): mean ${meanOf(reshapedLoss.slice(spliceBoundary)).toFixed(3)} nats/form`);

// ARM B scored properly now that we know where witnessed events (if any) landed:
const swapPoint = reshapeLog.find((e) => e.witnessed)?.at ?? spliceBoundary;
const bLossPre = lossAt(before0, spliceSpan.slice(0, swapPoint), FIXED_ALPHA);
const chromeBefore = [...before0, ...spliceSpan.slice(0, swapPoint)];
const bLossPost = lossAt(chromeBefore, spliceSpan.slice(swapPoint), FIXED_ALPHA).map((_, i) => {
  const ctx = [...chromeBefore, ...spliceSpan.slice(swapPoint, swapPoint + i)].slice(-ORDER);
  const { mass, reserve } = chromeModel.massOf(ctx, spliceSpan[swapPoint + i], FIXED_ALPHA);
  const p = mass > 0 ? mass : reserve;
  return p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE);
});
console.log(`\nARM B — hard swap to a chrome-trained model at ${swapPoint}:`);
console.log(`  prose region:  mean ${meanOf(bLossPre).toFixed(3)} nats/form`);
console.log(`  chrome region: mean ${meanOf(bLossPost).toFixed(3)} nats/form`);

// ── ARM D: the null hypothesis this whole apparatus has to beat — does any of
// it earn its complexity over simply using the ALREADY-ESTABLISHED champion
// (predictor-scientist.mjs, Experiment 3: order=2 alpha=1.5 continuation-count),
// fixed, no machinery, for the entire run? Trained fresh here since it needs a
// different order and continuation counting the reigning model above was never
// built with. ─────────────────────────────────────────────────────────────
const champion = new Candidate({ order: 2, continuation: true }).train(prose.slice(0, TRAIN_SIZE));
const championLoss = new Array(spliceSpan.length);
for (let i = 0; i < spliceSpan.length; i++) {
  const history = i === 0 ? before0 : [...before0.slice(Math.max(0, before0.length - champion.order + i)), ...spliceSpan.slice(0, i)];
  const ctx = history.slice(Math.max(0, history.length - champion.order));
  const { mass, reserve } = champion.massOf(ctx, spliceSpan[i], 1.5);
  const p = mass > 0 ? mass : reserve;
  championLoss[i] = p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE);
}
console.log(`\nARM D — the null hypothesis: order=2 alpha=1.5 continuation-count, fixed, no machinery:`);
console.log(`  prose region (0..${spliceBoundary}):   mean ${meanOf(championLoss.slice(0, spliceBoundary)).toFixed(3)} nats/form`);
console.log(`  chrome region (${spliceBoundary}..end): mean ${meanOf(championLoss.slice(spliceBoundary)).toFixed(3)} nats/form`);

console.log(`\n── overall mean nats/form, whole splice stream ──`);
console.log(`  fixed alpha=0.7, order=4 (no machinery):        ${meanOf(fixedLoss).toFixed(3)}`);
console.log(`  hard model swap:                                ${meanOf([...bLossPre, ...bLossPost]).toFixed(3)}`);
console.log(`  witnessed alpha reshaping (order=4):            ${meanOf(reshapedLoss).toFixed(3)}`);
console.log(`  order=2 alpha=1.5 cont, fixed (the champion):   ${meanOf(championLoss).toFixed(3)}`);
console.log(`\nthe reshaping apparatus only earns its complexity if it beats the champion, not just the arm it was built to improve on.`);
