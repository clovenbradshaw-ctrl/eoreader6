// eoreader6 · conformance/reading-regime — loops/reading-regime::readingRegime
// held to the same discipline as every other terrain organ in this repo:
// causal, refuses to guess its channel, and its documented trigger condition
// actually fires and actually refuses to fire.
//
// WHAT THIS FILE DOES NOT CLAIM. An earlier version of the MEANINGFUL test
// asserted a rezero landed at or after a specific hand-picked frame index —
// a hardcoded position standing in for evidence, not evidence itself. A
// follow-up "shuffled control" compared one arbitrary shuffle against the
// real reading. Both were removed after checking them honestly: a proper
// multi-trial shuffle-population comparison (K=30-40 seeded shuffles,
// scripts/lib/surrogates.mjs's own `shuffled`) does NOT cleanly separate the
// real reading from the shuffled population at conformance-test scale —
// checked directly, both on a hand-built fixture and on a 400-sentence
// excerpt of real pg84-frankenstein.txt prose, p in the 0.17-1.0 range, no
// clean signal. That is consistent with, not contrary to, what RESULTS.md
// already established: `recalled`'s discriminating power is a large-sample,
// whole-book measurement (22/24 chapter boundaries over 3392 sentences),
// not something a fast unit-scale fixture can be expected to reproduce.
// Manufacturing a low p-value here by continuing to tune the fixture until
// one happened to appear would be the same failure in a new shape. The
// actual statistical claim belongs in scripts/reading-regime-frankenstein.mjs
// (spec 11 Assembly B's B1/B2), at full scale, against the real 24 chapter
// boundaries, the same division of labor activation.js's own
// conformance/activation.test.js (deterministic, mechanistic) already keeps
// against scripts/activation-clearings.mjs (statistical, empirical).
//
// What THIS file checks instead: the mechanism's own documented trigger
// condition (sustained clearings >= tolerance against an established ground)
// actually fires when by-construction satisfied, and actually never fires
// when nothing ever recurs — properties of the plumbing, not claims about
// real text.

import { test } from "node:test";
import assert from "node:assert/strict";

import { readingRegime } from "../packages/engine/loops/reading-regime.js";

const mk = (lines) => lines.map((text, i) => ({ text, order: i, offset: i * 1000 }));

const SPEC = { channel: "recalled", window: 3, draws: 100, tolerance: 2, reseeds: 20, seed: 7, statistic: "burstiness", findOn: [] };

// A long unique-vocabulary establishing stretch (nothing recurs, so
// `recalled` sits at 0 throughout and the ground is built on a low
// baseline — comfortably past atmosphere.js's own groundFrom minimum of
// 10*window, 30 frames at window=3), followed by a sustained run of frames
// that each echo several already-planted motifs: a surfeit against the low
// ground, sustained long enough to clear `tolerance` consecutive times.
const filler = (n) => `frame ${n} the ordinary business of the afternoon continued with quiet errands and small unremarkable talk`;

const MOTIFS = [
  "the lantern swung above the harbour wall and the water answered",
  "gulls turned over the counting house while the ledgers were stacked",
  "the columns of careful ink were ruled again beside the bridge",
];

function buildStructuredCorpus() {
  const lines = [];
  let f = 0;
  for (let i = 0; i < 40; i++) lines.push(filler(f++));
  for (const m of MOTIFS) lines.push(`${filler(f++)} ${m}`); // each motif seeded once
  for (let i = 0; i < 6; i++) lines.push(filler(f++)); // let df catch up (a motif is a key only once it recurred)
  for (let i = 0; i < 14; i++) {
    lines.push(`${filler(f++)} ${MOTIFS[i % MOTIFS.length]} ${MOTIFS[(i + 1) % MOTIFS.length]}`);
  }
  return lines;
}

test("channel is declared — readingRegime refuses to guess which measurement feeds the tracker", () => {
  assert.throws(() => readingRegime(mk(["one", "two"]), { window: 4, draws: 50, tolerance: 2, reseeds: 10, seed: 1 }), /channel is declared/);
});

test("CAUSALITY (I1): reading the first k frames gives exactly the first k records reading all of it gave", () => {
  const frames = mk(buildStructuredCorpus());
  const whole = readingRegime(frames, SPEC).records;

  for (const k of [1, 5, 20, 30, whole.length]) {
    const prefix = readingRegime(frames.slice(0, k), SPEC).records;
    assert.equal(prefix.length, k);
    for (let i = 0; i < k; i++) {
      assert.deepEqual(prefix[i], whole[i], `record ${i} read differently once only ${k} frames were available — the future is leaking backwards`);
    }
  }
});

test("the documented trigger condition fires: sustained clearings against an established ground produce a rezero", () => {
  const frames = mk(buildStructuredCorpus());
  const { records, regimes, gaps } = readingRegime(frames, SPEC);

  assert.equal(records.length, frames.length);
  assert.ok(gaps.length > 0, "the ramp-up before one window of material has arrived must be a typed gap, not silently skipped");
  assert.ok(regimes.length >= 2, `expected at least one re-zero (>=2 regimes), got ${regimes.length} — a by-construction surfeit never registered as one`);
  assert.ok(records.some((r) => r.rezeroed), "no rezero fired at all");
});

test("the documented trigger condition refuses to fire: nothing ever recurs, so no ground can be exceeded", () => {
  const lines = Array.from({ length: 40 }, (_, i) => filler(i)); // pure filler, nothing ever recurs
  const { records, regimes } = readingRegime(mk(lines), SPEC);
  assert.ok(!records.some((r) => r.rezeroed), "no motif ever recurred; there is nothing here for a surfeit to be measured against");
  assert.equal(regimes.length, 1, "one open regime, never closed");
});

test("declares its own cell, EVA · Figure — checked against the roster by conformance/coverage.test.js", async () => {
  const mod = await import("../packages/engine/loops/reading-regime.js");
  assert.deepEqual(mod.CELL, { op: "EVA", grain: "Figure" });
});
