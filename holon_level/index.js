// eoreader6 · holon_level — the two Born-null-gated tests, and the null each is owed.
//
// Whether X is above, below, or a peer of Y is earned, never assigned from a
// name for a scale. Two tests, combined by `holonLevelRelation`:
// existence-dependency ("cannot exist without") and possibility-constraint
// ("above constrains, below enables"). `peer` is a first-class result.
//
// WHY THE THRESHOLD IS A MAX AND NOT A PERCENTILE.
//
// Both nulls below used to end in
//
//     displacements.sort((a, b) => a - b)[Math.floor(displacements.length * 0.95)]
//
// which reads as a 95th percentile and is a hand-set constant of exactly the
// kind SEED.md refuses — draws, reseeds and window are the declared numbers and
// there is no fourth.
//
// It was also, at every call site in this repository, not a percentile at all.
// `Math.floor(L * 0.95) === L - 1` for every L <= 20 (it first diverges at 21),
// so the expression returned the LARGEST displacement whenever the sample was
// 20 or smaller — and every caller passes reseeds in {4, 8, 10, 12} or takes
// the default 16: conformance/holon_level.test.js, conformance/formation.test.js
// (via `sustain`), scripts/read.mjs, the golden-holon sweep under scripts,
// scripts/full-golden-layered.mjs, scripts/triad-independence.mjs,
// scripts/existence-structure-significance.mjs, goldens/cast/discover-cast.mjs.
// The literal changed the answer for no caller that exists, and would have
// changed it silently for the first one that passed 21 — in the wrong
// direction. Measured on the constraint threshold, same material throughout:
//
//   reseeds      16       20       21       32
//   threshold  0.2557   0.2557   0.2442   0.2443
//
// Flat while the expression is the max, then a DROP at 21 and flat again. So a
// caller who paid for more resolution got a LESS strict test at exactly the
// point the sample became rich enough to support a real quantile. That is the
// pathology `level`'s header records in its stronger form ("a caller who paid
// for more resolution got a threshold approaching zero"), and it was latent
// here behind a boundary nobody had crossed yet. Taking the max removes the
// discontinuity: the threshold is now weakly increasing in reseeds everywhere.
//
// That is the shallow reason. The deeper one is that a 95th percentile of 16
// draws is a resolution the sample cannot supply. The finest quantile sayable
// from `reseeds` draws is 1/reseeds, so "the 95th percentile" of 16 reseeds is
// a confidence float in SEED.md's sense — a number from nowhere wearing the
// clothes of a place in a support. The max IS the honest reading of that
// sample, and it is already the idiom the rest of the engine uses for this
// exact quantity: `pattern` takes `nullMax` = max over reseeds of the
// displacement, and `level` takes `reseedNull` = max over reseeds of the rank
// movement. These two tests are the same construction and now say so, with
// `censoredAt` reporting the resolution (SEED.md #8).
//
// WHY THIS IS NOT `extremeGround`, THOUGH IT LOOKS LIKE IT.
//
// `nul`'s `extremeGround` builds the nothing for the BEST OF N: n observations
// placed against one ground with the most extreme kept, where the maximum of n
// null draws clears a one-arrival support most of the time. `regimeNull`
// accumulates maxima and the resemblance is close enough to be worth refuting
// in writing rather than re-tried every few months. They do not unify, for
// three reasons, any one of which is sufficient.
//
//   1. THERE IS NO BEST OF N HERE. `existenceDependencyTest` places exactly ONE
//      observation against its null — `actualDisp`, the displacement of the one
//      regime it was handed. Nothing is selected, so n = 1, and `extremeGround`
//      at n = 1 is defined to be bit-identical to `ground`. The substitution is
//      a no-op by construction.
//
//   2. THE MULTIPLICITY IS ON THE WRONG SIDE. `extremeGround`'s `n` counts the
//      ARRIVALS; `reseeds` resolves the NULL. Passing reseeds in as n would let
//      a declared number choose n, and `extremeGround`'s own header forbids
//      precisely that: n "is counted, not chosen — a caller that has to *pick*
//      n has misunderstood the call." The maxima below are maxima OF the null,
//      not of the observation.
//
//   3. THE SAMPLES ARE NOT A STATISTIC OF PERTURBED MATERIAL. `ground` and
//      `extremeGround` both build samples by applying a STATISTICS entry to
//      perturbed material. Each sample below is |volume(gFull) - volume(gNull)|
//      — a functional of two whole grounds, which neither constructor can
//      produce. That is not a defect but a family: `pattern` and `level` both
//      compute their reseeding nulls inline for the same reason, because what
//      they null is a displacement BETWEEN grounds rather than a statistic of
//      material. These tests belong there, not to `ground`.
//
// So the correction `extremeGround` exists for is real and is not this one.
// Where it does bite is one level up, at the callers that sweep many candidate
// regimes and keep those returning `above` (the golden-holon sweep under scripts,
// goldens/cast/discover-cast.mjs). That is a genuine multiple-comparison
// exposure and it is NOT addressed here — nor is `extremeGround` its correction,
// since those callers keep every survivor rather than the most extreme.
// Recorded open, rather than closed by a substitution that only looked like one.
//
// TWO DEFECTS FOUND WHILE ESTABLISHING THE ABOVE. BOTH MEASURED, BOTH NOW FIXED.
// Together they made this an UNCONDITIONAL null — the lineage's most expensive
// dead end, which SEED.md #3 says "reappears constantly." Kept in full because
// a defect that reappears constantly is not documented by deleting it.
//
//   (a) `regimeNull`'s puncture never moves. `prng(r + 999)(series.length - L)`
//       passes an argument to a closure that takes none, so the result is a
//       float in [0,1) and `start` floors to 0 on every reseed. Every reseed
//       punctures [0, L). The null is therefore a reseeding null over ONE fixed
//       punctured material, not the null over random puncture placements the
//       random `start` was plainly written to draw. `regimeShuffled` below has
//       the correct idiom — `prng(r + 8888)() * Math.max(1, ...)` — which is
//       what makes this a slip rather than a design.
//
//   (b) The null and the observation are built over different extents, and the
//       matched material is already computed and then discarded. The observed
//       half compares gFull (extent n) against gDegraded, which REMOVES the
//       regime (extent n - L). Each null draw compares gFull against gNull,
//       which ZEROES a window and keeps the length (extent n). The local
//       `perturbed` — series with L removed at `start`, extent n - L — is
//       exactly the operation- and extent-matched null material, and the next
//       line pads it back to n with zeros. Ground volume is extent-dependent
//       (burstiness/shuffle, draws=128, window=5: mean IQR 0.069 at extent 50,
//       0.055 at 200, 0.050 at 400), so the two halves are not commensurable —
//       the mismatch `pattern` was given a conditional null for and that
//       `incommensurate_extent` refuses by type elsewhere.
//
//       Measured, 40 trials, draws=64, window=5, reseeds=16, L=24 over 200 iid
//       values. On material with NO regime present, every verdict should be
//       `peer`:
//
//         null as written (zero-pad, extent n)      exists 10/40
//         null matched (`perturbed`, extent n - L)  exists  3/40
//
//       and on material with a real burst planted at the regime, both return
//       exists 37/40. Same power, a third of the false positives — a correction
//       with a direction, not a wash.
//
// WHAT THE FIX COST, RECORDED BECAUSE A VERDICT CHANGE IS NOT A FREE ACTION.
// `conformance/formation.test.js`, "disagreeing gates are a typed gap", asserted
// `unstable` for regime 10-15 on homogeneous `quiet` material. Under the
// conditional null it returns `peer` — the same answer its sibling test asserts
// for regime 3-6 on the same material, and the honest one: no regime in flat
// material is a level. The old `unstable` was the unconditional null's artefact,
// and the test had been using that artefact as its fixture. The `unstable` path
// still needs honest coverage; see that file.
import { ground, admissible, isGap, gap, reZero, volume, level } from "../nul/index.js";

const prng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The Born null for existence-dependency: a CONDITIONAL null, in the sense this
 * lineage keeps having to relearn — it must vary along the axis the artefact
 * exploits, or it is only a change of units.
 *
 * The observation removes the regime, leaving extent n - L. So each null draw
 * removes an L-window somewhere ELSE, leaving the same extent n - L. Same
 * operation, same extent, one axis varying: WHERE the removal falls. That axis
 * is the whole question — "does this regime matter, or would any regime of its
 * size have done" — and a null that holds it fixed cannot answer it.
 *
 * Placement is uniform and is not made to avoid the regime. A draw that lands
 * on it contributes a large displacement and widens the null, which is
 * conservative in the safe direction; excluding it would be tuning the null
 * against the answer. `regimeShuffled` below draws the same way.
 *
 * `gFull` is built once. It does not depend on r, and rebuilding it inside the
 * loop was `reseeds` identical grounds thrown away.
 */
const regimeNull = (series, regime, spec, reseeds) => {
  const width = regime.end - regime.start;
  const gFull = ground({ material: series, draws: spec.draws, window: spec.window, seed: spec.seed });
  if (isGap(gFull)) return gFull;

  const displacements = [];
  for (let r = 0; r < reseeds; r++) {
    const start = Math.floor(prng(r + 999)() * Math.max(1, series.length - width));
    const removed = [...series.slice(0, start), ...series.slice(start + width)];
    const gNull = ground({ material: removed, draws: spec.draws, window: spec.window, seed: r + 99999 });
    if (isGap(gNull)) continue;
    displacements.push(Math.abs(volume(gFull) - volume(gNull)));
  }
  // The largest displacement a mere replacement produced — `pattern`'s
  // `nullMax` and `level`'s `reseedNull`, at this grain. See the header: not a
  // percentile, because 1/reseeds is the finest quantile this sample can say.
  return displacements.length > 0 ? Math.max(...displacements) : 0;
};

export const existenceDependencyTest = (series, regime, options = {}) => {
  const { draws = 128, window = 5, reseeds = 16 } = options;
  if (!Array.isArray(series) || series.length < 2) return gap("empty_material", { reason: "series too short" });
  if (regime.start < 0 || regime.end > series.length || regime.end <= regime.start)
    return gap("empty_material", { reason: "invalid regime range" });

  const spec = { perturbation: "shuffle", statistic: "burstiness", draws, window, seed: 0 };
  const gFull = ground({ material: series, ...spec });
  if (isGap(gFull)) return gFull;

  const degraded = [
    ...series.slice(0, regime.start),
    ...series.slice(regime.end),
  ];
  if (degraded.length < 2) return gap("empty_material", { reason: "regime covers too much of series" });
  const gDegraded = ground({ material: degraded, ...spec, seed: 1 });
  if (isGap(gDegraded)) return gDegraded;

  const nullMax = regimeNull(series, regime, spec, reseeds);
  if (isGap(nullMax)) return nullMax;
  const actualDisp = Math.abs(volume(gFull) - volume(gDegraded));
  const exists = actualDisp > nullMax;

  return Object.freeze({
    exists,
    statistic: actualDisp,
    nullThreshold: nullMax,
    censoredAt: 1 / reseeds,
    fullVolume: volume(gFull),
    degradedVolume: volume(gDegraded),
    regime,
  });
};

const regimeShuffled = (series, regime, spec, reseeds) => {
  const maxShifts = [];
  for (let r = 0; r < reseeds; r++) {
    const start = Math.floor(prng(r + 8888)() * Math.max(1, series.length - (regime.end - regime.start)));
    const window = { start, end: start + (regime.end - regime.start) };
    const inside = series.slice(regime.start, regime.end);
    const outside = [...series.slice(0, window.start), ...series.slice(window.end)];
    if (outside.length < 2) continue;
    const insideMean = inside.reduce((s, v) => s + v, 0) / inside.length;
    const outsideMean = outside.reduce((s, v) => s + v, 0) / outside.length;
    maxShifts.push(Math.abs(insideMean - outsideMean));
  }
  // Same construction, same reason as `regimeNull` above.
  return maxShifts.length > 0 ? Math.max(...maxShifts) : 0;
};

export const possibilityConstraintTest = (series, regime, options = {}) => {
  const { reseeds = 16 } = options;
  if (!Array.isArray(series) || series.length < 2) return gap("empty_material", { reason: "series too short" });
  if (regime.start < 0 || regime.end > series.length || regime.end <= regime.start)
    return gap("empty_material", { reason: "invalid regime range" });

  const inside = series.slice(regime.start, regime.end);
  if (inside.length < 2) return gap("empty_material", { reason: "regime too small" });

  const outside = [...series.slice(0, regime.start), ...series.slice(regime.end)];
  if (outside.length < 2) return gap("empty_material", { reason: "no outside data" });

  const insideMean = inside.reduce((s, v) => s + v, 0) / inside.length;
  const outsideMean = outside.reduce((s, v) => s + v, 0) / outside.length;
  const actualShift = Math.abs(insideMean - outsideMean);

  const nullMax = regimeShuffled(series, regime, {}, reseeds);

  return Object.freeze({
    constrains: actualShift > nullMax,
    insideMean,
    outsideMean,
    shift: actualShift,
    nullThreshold: nullMax,
    censoredAt: 1 / reseeds,
    regime,
  });
};

export const holonLevelRelation = (existence, constraint) => {
  if (isGap(existence) || isGap(constraint)) return "unstable";
  const e = existence.exists;
  const c = constraint.constrains;
  if (e && c) return "above";
  if (!e && !c) return "peer";
  return "unstable";
};
