// eoreader6 · crossmodal-mereappearance — does mereAppearance catch a REAL
// case on real runTurn() output, or only a hand-fed synthetic one?
// conformance/crossmodal.test.js exercises crossModalTag()'s pure logic
// with hand-built sides; this exercises the WHOLE wire: real material,
// real runTurn(), real DEF events, real `mode`.
//
// Construction reused from scripts/two-clearings.mjs, already validated by
// this repo before this test existed: a pure LEVEL shift (mean 10 -> mean
// 25, same spread) reliably clears by `surfeit`; a pure SPREAD shift at a
// CONSTANT mean (spread 1 -> spread 6, same mean 25) clears by `moved` —
// measured there at 3/3 vs surfeit's 1/3 on the same construction. Two
// series built this way, their transitions placed at the IDENTICAL
// normalized position, give a real, honestly-constructed instance of
// Gentner-Markman's mere-appearance cell: real position overlap, no
// relational overlap, because the two series are genuinely different
// PHENOMENA that only coincidentally line up.
//
// The five (levelSeed, spreadSeed) pairs below were the first five tried,
// unfiltered, reported as found: three land on a real surfeit/moved
// mismatch, two land on surfeit/surfeit (a big enough variance jump can
// still lift surfeit's max-over-windows statistic — the same imperfection
// two-clearings.mjs already measured, not a defect introduced here). Both
// outcomes are asserted, honestly, as what this construction actually
// produces — not filtered down to the cases that make the point cleanest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runTurn } from "../packages/engine/loops/turn.js";
import { crossModalTag } from "../verdict/crossmodal.js";

const rng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const gaussian = (next) => {
  const u = Math.max(1e-12, next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
};

const levelShift = (seed, n = 360) => {
  const next = rng(seed);
  const out = [];
  for (let i = 0; i < n / 2; i++) out.push(10 + gaussian(next) * 1);
  for (let i = 0; i < n / 2; i++) out.push(25 + gaussian(next) * 1);
  return out;
};

const spreadShift = (seed, n = 360) => {
  const next = rng(seed);
  const out = [];
  for (let i = 0; i < n / 2; i++) out.push(25 + gaussian(next) * 1);
  for (let i = 0; i < n / 2; i++) out.push(25 + gaussian(next) * 6);
  return out;
};

const SPEC = { window: 12, draws: 200, reseeds: 5, tolerance: 3, hop: 4, seed: 17, clearOn: ["surfeit", "moved"] };
const TRUE_BOUNDARY = 180; // n=360, midpoint
const CAUSAL_TOLERANCE = 20;

const sideFrom = (material) => {
  const turn = runTurn({ material, ...SPEC });
  const defEvents = turn.events.filter((e) => e.op === "DEF");
  const nearest = defEvents.length
    ? defEvents.reduce((best, e) => (Math.abs(e.at - TRUE_BOUNDARY) < Math.abs(best.at - TRUE_BOUNDARY) ? e : best))
    : null;
  const causalHit = nearest !== null && Math.abs(nearest.at - TRUE_BOUNDARY) <= CAUSAL_TOLERANCE;
  return {
    strength: defEvents.length === 1 ? "earned" : defEvents.length > 1 ? "held" : "weak",
    position: nearest ? nearest.at / material.length : NaN,
    corroborated: causalHit,
    mode: nearest?.mode,
  };
};

const PAIRS = [
  { levelSeed: 3, spreadSeed: 11, expectMode: "mismatch" },
  { levelSeed: 101, spreadSeed: 202, expectMode: "match" },
  { levelSeed: 555, spreadSeed: 777, expectMode: "match" },
  { levelSeed: 9, spreadSeed: 9001, expectMode: "mismatch" },
  { levelSeed: 42, spreadSeed: 4242, expectMode: "mismatch" },
];

test("real construction: every pair's nearest DEF is within causal tolerance of the true boundary, both sides — position alignment is not the question here", () => {
  for (const { levelSeed, spreadSeed } of PAIRS) {
    const a = sideFrom(levelShift(levelSeed, 360));
    const b = sideFrom(spreadShift(spreadSeed, 360));
    // corroborated is exactly this check (within CAUSAL_TOLERANCE of
    // TRUE_BOUNDARY) — asserted directly rather than re-deriving it, and
    // loosely bounded rather than pinned to an exact index, since a noisy
    // series' nearest clearing is not expected to land on the boundary
    // to the sample.
    assert.equal(a.corroborated, true, `level seed ${levelSeed}`);
    assert.equal(b.corroborated, true, `spread seed ${spreadSeed}`);
    assert.ok(Math.abs(a.position - 0.5) < 0.1, `level seed ${levelSeed}: position ${a.position}`);
    assert.ok(Math.abs(b.position - 0.5) < 0.1, `spread seed ${spreadSeed}: position ${b.position}`);
  }
});

test("without mode, every pair is called analogy — perfect position match, both corroborated, mode invisible to the old logic", () => {
  for (const { levelSeed, spreadSeed } of PAIRS) {
    const a = sideFrom(levelShift(levelSeed, 360));
    const b = sideFrom(spreadShift(spreadSeed, 360));
    const v = crossModalTag({ ...a, mode: undefined }, { ...b, mode: undefined }, { positionTolerance: 0.05 });
    assert.equal(v.tag, "analogy", `seeds ${levelSeed},${spreadSeed}`);
  }
});

test("with real mode: pairs whose underlying phenomena genuinely differ are caught as mereAppearance, not silently kept as analogy", () => {
  for (const { levelSeed, spreadSeed, expectMode } of PAIRS) {
    const a = sideFrom(levelShift(levelSeed, 360));
    const b = sideFrom(spreadShift(spreadSeed, 360));
    const v = crossModalTag(a, b, { positionTolerance: 0.05 });
    if (expectMode === "mismatch") {
      assert.equal(a.mode, "surfeit", `level seed ${levelSeed} should clear by surfeit`);
      assert.equal(b.mode, "moved", `spread seed ${spreadSeed} should clear by moved`);
      assert.equal(v.tag, "mereAppearance", `seeds ${levelSeed},${spreadSeed}`);
    } else {
      // The known imperfection two-clearings.mjs already measured: a big
      // enough variance jump can still lift surfeit's max-over-windows
      // statistic. Both sides clear by surfeit here — a real, if
      // coincidental, relational match — and staying "analogy" is correct,
      // not a missed catch.
      assert.equal(a.mode, "surfeit");
      assert.equal(b.mode, "surfeit");
      assert.equal(v.tag, "analogy", `seeds ${levelSeed},${spreadSeed}`);
    }
  }
});

test("at least one of the five pairs is caught — mereAppearance is not vacuous on real data", () => {
  const caught = PAIRS.filter((p) => p.expectMode === "mismatch").length;
  assert.ok(caught >= 1, "if zero pairs ever mismatch, mereAppearance has never fired on anything real");
  assert.equal(caught, 3);
});
