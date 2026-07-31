// Death two: the ground closes. Nothing can differ from it, and the system
// becomes an oracle — fluent, sourced, correct, incapable of encounter.
//
// There is no prior art for this family anywhere in the lineage. Every organ was
// built against lying; the property that kills the other way was celebrated as a
// virtue ("it can only get less wrong, never more wrong").
//
// With pattern in place this death is largely self-announcing: a system where
// figures stop moving grounds cannot form information at all, and `witness`
// refuses. What still needs testing is that the instruments measuring it are not
// themselves artefacts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ground, difference, pattern, reZero, volume, burstiness, disagreement, level, isGap } from "../nul/index.js";

const W = 5;
const quiet = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2];
const bursty = [...quiet, 9, 9, 9, 9, 9];

test("the vital sign is not a measure of how many times we sampled", () => {
  // Range grows without bound in `draws`; interquartile does not. If ananda were
  // the range, a system could look healthier by sampling more.
  const vs = [64, 256, 1024, 4096].map((draws) => volume(ground({ material: quiet, draws, window: W })));
  for (const v of vs) assert.ok(Math.abs(v - vs[0]) < 0.05, `volume drifts with draws: ${vs.join(", ")}`);
  assert.ok(vs[0] > 0);
});

test("outside the support the rank is censored, not unmeasurable", () => {
  const g = ground({ material: quiet, draws: 256, window: W });
  const above = difference(g.samples[g.samples.length - 1] + 1, g);
  assert.equal(above.gap, "exceeds_witness");
  assert.equal(above.censoredAt, 1 / 256);
  assert.ok(Number.isFinite(above.observed), "the magnitude is reportable; only the place is not");
});

test("surfeit and regularity are opposite findings and only one is the breath", () => {
  const g = ground({ material: quiet, draws: 256, window: W });
  const above = difference(g.samples[g.samples.length - 1] + 1, g);
  const below = difference(g.samples[0] - 1, g);
  assert.equal(above.direction, "above");
  assert.equal(above.reZero, true);
  assert.equal(below.direction, "below");
  assert.notEqual(below.reZero, true, "a series less clustered than any shuffle is not surfeit");
});

test("re-zeroing yields a different nothing; the same seed replays exactly", () => {
  const a = ground({ material: quiet, draws: 256, window: W, seed: 3 });
  const b = reZero(a, { material: quiet });
  assert.notDeepEqual([...a.samples], [...b.samples]);
  const replay = ground({ ...a.spec, material: quiet });
  assert.deepEqual([...a.samples], [...replay.samples]);
});

test("more of the same makes no difference", () => {
  const before = ground({ material: quiet, draws: 256, window: W });
  const after = ground({ material: [...quiet, 1, 0, 2, 1, 0], draws: 256, window: W });
  const p = pattern({ before, after, material: quiet, reseeds: 16 });
  assert.equal(p.moved, false);
  assert.ok(p.reseedNull > 0, "a zero-width reseeding null would clear any displacement");
});

test("a burst does, and it opens the ground", () => {
  const before = ground({ material: quiet, draws: 256, window: W });
  const after = ground({ material: bursty, draws: 256, window: W });
  const p = pattern({ before, after, material: quiet, reseeds: 16 });
  assert.equal(p.moved, true);
  assert.equal(p.opened, true);
  assert.ok(p.displacement > p.reseedNull);
});

test("narrowing the ground is still a pattern — that one is extraction", () => {
  // Both make a difference. Only the sign says which kind. A system that
  // measured pattern without the sign would call this health.
  //
  // This case is saturation: enough of the exceptional value and the ground
  // stops being able to differ from it at all — volume falls to zero, which
  // is this file's death written out in one number. The ground moved a long
  // way and CLOSED, and only `opened` distinguishes that from encounter.
  //
  // The case that used to stand here — quiet + [2, 2] — no longer reads as a
  // pattern, and it should not: 2 is a value quiet already contains, so
  // continuing quiet by drawing from itself produces that displacement and
  // more. It only looked like a pattern while the null was held at before's
  // extent, which measured growth (see nul/index.js::pattern).
  const before = ground({ material: bursty, draws: 256, window: W });
  const after = ground({ material: [...bursty, ...Array(30).fill(9)], draws: 256, window: W });
  const p = pattern({ before, after, material: bursty, reseeds: 16 });
  assert.equal(p.moved, true);
  assert.equal(p.opened, false);
  assert.equal(volume(after), 0, "the ground closed: nothing can differ from it now");
});

test("a growth-matched null refuses what growth alone explains", () => {
  // The correction that cost the most to find. `after` is built over MORE
  // material than `before`, and burstiness is a max over windows, so its
  // expectation rises with extent for no reason but extent. Continuing the
  // material by drawing from itself is the counterfactual that isolates it.
  const before = ground({ material: quiet, draws: 256, window: W });
  const after = ground({ material: [...quiet, 2, 2], draws: 256, window: W });
  const p = pattern({ before, after, material: quiet, reseeds: 16 });
  assert.equal(p.grewBy, 2);
  assert.equal(p.moved, false, "two more values quiet already contains are not a difference that made a difference");

  // ...and it still says yes to material the old regime could not have produced.
  const burst = ground({ material: bursty, draws: 256, window: W });
  const q = pattern({ before, after: burst, material: quiet, reseeds: 16 });
  assert.equal(q.moved, true);
});

test("the null must be built over BEFORE's material, and handing in AFTER's is refused", () => {
  // Not a hypothetical: loops/time.js did exactly this. Every null draw was
  // then a same-material sibling of `after` differing only by seed, so
  // `moved` was a coin landing true about 1/(reseeds+1) of the time whatever
  // the material did. Type error before null (SEED.md #7).
  const before = ground({ material: quiet, draws: 256, window: W });
  const after = ground({ material: bursty, draws: 256, window: W });
  const p = pattern({ before, after, material: bursty, reseeds: 16 });
  assert.equal(p.gap, "incommensurate_extent");
  assert.equal(p.before, quiet.length);
  assert.equal(p.after, bursty.length);
});

test("censored differences are kept, not dropped — the split is the signal", () => {
  const shuffled = ground({ material: bursty, draws: 256, window: W, perturbation: "shuffle" });
  const resampled = ground({ material: bursty, draws: 256, window: W, perturbation: "resample" });
  const observed = burstiness(bursty, { window: W });
  const d = disagreement([difference(observed, shuffled), difference(observed, resampled)]);
  assert.equal(d.n, 2);
  // One perturbation calling something surfeit while the other places it is the
  // most informative thing this system can produce, and it used to be discarded.
  assert.ok(d.censored > 0 || typeof d.spread === "number");
});

test("one ground cannot disagree with itself", () => {
  const g = ground({ material: quiet, draws: 256, window: W });
  assert.ok(isGap(disagreement([difference(1.4, g)])));
});

// ── level: the direction of the growth rule ─────────────────────────────────
//
// These are constructed cases with a known right answer, because the sign of
// this comparison was wrong and nothing caught it. A growth-rule verdict is
// only as good as the direction of the operator that produces it, and a
// verdict that is confidently backwards is worse than no verdict at all.

const rng2 = (s) => {
  let a = (s | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const gauss2 = (n) => Math.sqrt(-2 * Math.log(Math.max(1e-12, n()))) * Math.cos(2 * Math.PI * n());
const series2 = (sd, seed, n = 400) => {
  const next = rng2(seed);
  return Array.from({ length: n }, () => 10 + gauss2(next) * sd);
};
const LW = 12, LD = 400, LS = "windowedMean";

test("level: a target that places the observation comfortably is BELOW, not above", () => {
  // Own ground tight, target ground wide. A moment that is extreme for its own
  // ground is ordinary for the target's — the target ANTICIPATES it — so the
  // target enables more and the relationship is `below`.
  const own = ground({ material: series2(1, 7), draws: LD, window: LW, seed: 1, statistic: LS });
  const target = ground({ material: series2(10, 8), draws: LD, window: LW, seed: 2, statistic: LS });
  const observed = own.samples[Math.floor(own.samples.length * 0.97)];

  const f = difference(observed, own);
  const c = difference(observed, target);
  assert.ok(!isGap(f) && !isGap(c), "test setup: the observation must resolve in both grounds");

  const lv = level(observed, own, target);
  assert.equal(lv.relationship, "below");
  assert.ok(lv.extremeness.own > lv.extremeness.target, "extreme for its own ground, ordinary for the target's");
});

test("level: a target that CANNOT place the observation is ABOVE — the growth rule's own direction", () => {
  // The mirror image. Own ground wide, target tight: a moment unremarkable in
  // its own ground is extreme against the target's, so the target cannot
  // anticipate what this figure perceives.
  const own = ground({ material: series2(10, 8), draws: LD, window: LW, seed: 1, statistic: LS });
  const target = ground({ material: series2(1, 7), draws: LD, window: LW, seed: 2, statistic: LS });
  const observed = own.samples[Math.floor(own.samples.length * 0.5)]; // ordinary in its own

  const lv = level(observed, own, target);
  if (isGap(lv)) {
    // Legitimate: if it is so far outside the tight ground that the rank is
    // censored, that is `unstable` and a gap is a result. It must not be
    // silently reported as a relationship.
    assert.equal(lv.gap, "unstable");
    return;
  }
  assert.equal(lv.relationship, "above");
  assert.ok(lv.extremeness.target > lv.extremeness.own);
});

test("level: two grounds built the same way are peers, and neither is a level above the other", () => {
  const own = ground({ material: series2(3, 21), draws: LD, window: LW, seed: 1, statistic: LS });
  const target = ground({ material: series2(3, 22), draws: LD, window: LW, seed: 2, statistic: LS });
  const observed = own.samples[Math.floor(own.samples.length * 0.5)];
  const lv = level(observed, own, target);
  assert.ok(!isGap(lv));
  assert.equal(lv.relationship, "peer", "same spec, same distribution: there is no level between them");
});

test("level: extremeness is two-sided — a low outlier is as unanticipated as a high one", () => {
  // A one-sided rank makes a ground that misses everything at the bottom look
  // like a ground that anticipates it. Direction is not the question; whether
  // the ground can place it at all is.
  const own = ground({ material: series2(10, 8), draws: LD, window: LW, seed: 1, statistic: LS });
  const target = ground({ material: series2(1, 7), draws: LD, window: LW, seed: 2, statistic: LS });
  const high = level(own.samples[own.samples.length - 2], own, target);
  const low = level(own.samples[1], own, target);
  for (const lv of [high, low]) {
    if (isGap(lv)) continue; // censored is a legitimate result at these extremes
    assert.ok(lv.extremeness.target >= lv.extremeness.own - lv.threshold, "a tight target must not look anticipating at either edge");
  }
});
