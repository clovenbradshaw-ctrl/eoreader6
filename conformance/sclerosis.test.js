// Death two: sclerosis. Metabolic failure — the ground absorbs everything,
// nothing can differ from it, and it becomes an oracle: fluent, sourced,
// correct, and incapable of encounter.
//
// There is no prior art for this family anywhere in the lineage. The tradition
// armored itself against lying and then celebrated the property that kills it
// the other way: "it can only get less wrong, never more wrong." An append-only
// record that cannot forget is a ground that can only tighten.
//
// Same input, same output is health over a frozen record and rigor mortis over a
// lived one. E. coli would call it saturation, and would be right.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  burstiness,
  constructGround,
  perceive,
  reZero,
  volume,
  volumeTrend,
  disagreement,
  isGap,
} from "../nul/index.js";

const flat = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
const bursty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10];

test("the ground has volume — the statistic is not vacuous under its own perturbation", () => {
  // A mean would be shuffle-invariant: 64 identical samples, a null of width
  // zero that clears anything. That is an unconditional null in disguise.
  const g = constructGround({ material: bursty, seed: 7 });
  assert.ok(volume(g) > 0, "a ground of width zero is not a ground");
});

test("a monotonically tightening ground series is sclerosis", () => {
  const closing = [{ samples: [0, 10] }, { samples: [2, 8] }, { samples: [4, 6] }, { samples: [5, 5] }];
  assert.equal(volumeTrend(closing), "closing");
});

test("a ground that reopens is alive", () => {
  const open = [{ samples: [0, 10] }, { samples: [2, 8] }, { samples: [0, 20] }];
  assert.equal(volumeTrend(open), "open");
});

test("surfeit is a gap, and the gap is the trigger to re-zero", () => {
  // The real series' burst clears the entire support of its own null. That reads
  // as the strongest possible finding and is deliberately not reported as one:
  // no retained sample can carry it, so quantifying it would be fabrication.
  const out = perceive({ material: bursty, observed: burstiness(bursty), seed: 11 });
  assert.ok(isGap(out));
  assert.equal(out.gap, "exceeds_witness");
  assert.equal(out.reZero, true);
});

test("re-zeroing yields a different nothing — the second reading is not the first", () => {
  const first = constructGround({ material: bursty, seed: 3 });
  const second = reZero(first, { material: bursty });
  assert.notDeepEqual([...first.samples], [...second.samples]);
  assert.notEqual(first.perturbation.seed, second.perturbation.seed);
});

test("but testimony replays exactly — a kept ground is auditable", () => {
  const a = constructGround({ material: bursty, seed: 3 });
  const b = constructGround({ material: bursty, seed: 3 });
  assert.deepEqual([...a.samples], [...b.samples]);
});

test("flat material still earns a ground, and it is a narrow one", () => {
  const g = constructGround({ material: flat, seed: 5 });
  assert.equal(volume(g), 0, "nothing can differ from a perfectly flat world");
  const out = perceive({ material: flat, seed: 5 });
  // Observed equals the entire support, so there is nothing to say. Not a
  // finding, not an error: a boundary the system reports rather than crosses.
  assert.ok(!isGap(out) || out.gap === "exceeds_witness");
});

test("plural grounds disagree, and disagreement is the only self-check there is", () => {
  const shuffled = constructGround({ material: bursty, perturbation: "shuffle", seed: 2 });
  const resampled = constructGround({ material: bursty, perturbation: "resample", seed: 2 });
  const observed = (volume(shuffled) > 0 ? Math.min(...shuffled.samples) : 0) + 0.01;
  const figure = perceive({ material: bursty, observed, grounds: [shuffled, resampled] });
  const d = isGap(figure) ? figure : disagreement(figure);
  // Either the two perturbations disagree measurably, or one of them refuses.
  // What is forbidden is silent agreement between a single ground and itself.
  assert.ok(isGap(d) || typeof d.spread === "number");
});

test("one ground cannot disagree with itself", () => {
  const g = constructGround({ material: bursty, seed: 1 });
  const figure = perceive({ material: bursty, observed: Math.min(...g.samples), grounds: [g] });
  const d = disagreement(figure);
  assert.ok(isGap(d));
  assert.equal(d.gap, "unresolved_pattern");
});
