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
import { ground, difference, pattern, reZero, volume, burstiness, disagreement, isGap } from "../nul/index.js";

const W = 5;
const quiet = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2];
const bursty = [...quiet, 9, 9, 9, 9, 9];
// A ground whose ananda clears its own reseeding null, so the sign has both
// halves available. `quiet` has only the widening half.
const roomy = Array.from({ length: 40 }, (_, i) => i % 7);

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
  // This used to be asserted on [...quiet, 2, 2], where volume(after) equals
  // volume(before) exactly: an exact tie, read as "extraction" only because the
  // sign was a bare `>`. The case had to be rebuilt on a ground with room to
  // lose — quiet's ananda (0.2) does not exceed its own reseeding null (0.2),
  // so narrowing is not sayable from it at all. See intensity.test.js.
  const before = ground({ material: roomy, draws: 256, window: W });
  const after = ground({ material: [...roomy, ...Array(40).fill(3)], draws: 256, window: W });
  const p = pattern({ before, after, material: roomy, reseeds: 16 });
  assert.equal(p.moved, true);
  assert.equal(p.opened, false);
  assert.ok(Math.abs(p.volumeDelta) > p.volumeNull, "extraction must clear the null it is measured against");
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
