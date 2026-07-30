// eoreader6 · turn — the nine operators at one grain, and specifically the
// two ways ⑦ DEF · Atmosphere · Clearing can fire.
//
// runTurn had no conformance file at all until now, which by SEED.md's own
// growth rule ("unwired is failing — a module nothing depends on is not early,
// it is refuted") meant the turn was refuted the whole time it was shipping.
//
// The load-bearing test in here is `a growing ground is not a moving one`. It
// is the one that would have caught the failure this file was written after:
// wired with a null held at before's extent, the moved-clearing fired at
// almost exactly even spacing on homogeneous noise — a clock reading its own
// arithmetic — and then recovered 23 of Frankenstein's 24 chapter boundaries
// while recovering 21–23 of them from the same series SHUFFLED. Every headline
// number looked like a triumph. Only the control said otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runTurn } from "../packages/engine/loops/turn.js";
import { isGap } from "../nul/index.js";

const rng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const gaussian = (next) => Math.sqrt(-2 * Math.log(Math.max(1e-12, next()))) * Math.cos(2 * Math.PI * next());

const homogeneous = (seed, n = 360) => {
  const next = rng(seed);
  return Array.from({ length: n }, () => 10 + gaussian(next));
};

// calm → elevated → turbulent. The first transition is a LEVEL shift; the
// second is a SPREAD shift at the SAME level. The second one is the case that
// matters: the ground the reader has accumulated by then is already wide
// enough to absorb a lot, which is exactly when a max-over-windows statistic
// stops noticing.
const threeRegimes = (seed) => {
  const next = rng(seed);
  const out = [];
  for (let i = 0; i < 120; i++) out.push(10 + gaussian(next) * 1); // calm
  for (let i = 0; i < 120; i++) out.push(25 + gaussian(next) * 1); // elevated  — LEVEL shift at 120
  for (let i = 0; i < 120; i++) out.push(25 + gaussian(next) * 6); // turbulent — SPREAD shift at 240
  return out;
};

const SPEC = { window: 12, draws: 200, reseeds: 5, tolerance: 3, hop: 4, seed: 17 };
const recs = (turn) => turn.events.filter((e) => e.op === "REC").map((e) => e.at);

test("the resolution of pattern is declared, never defaulted — and only when it is needed", () => {
  const material = homogeneous(1);
  const g = runTurn({ material, ...SPEC, reseeds: undefined });
  assert.equal(g.gap, "undeclared");
  assert.equal(g.what, "reseeds");
  // ...but a reading that never asks about movement owes no such number.
  const surfeitOnly = runTurn({ material, ...SPEC, reseeds: undefined, clearOn: ["surfeit"] });
  assert.ok(!isGap(surfeitOnly));
});

test("a ground that cannot fail is not a ground, and an invented failure mode is a type error", () => {
  const material = homogeneous(1);
  assert.equal(runTurn({ material, ...SPEC, clearOn: [] }).gap, "undeclared");
  assert.equal(runTurn({ material, ...SPEC, clearOn: ["vibes"] }).gap, "unknown_spec");
});

test("both clearings are the same operator and are reported apart", () => {
  const turn = runTurn({ material: threeRegimes(3), ...SPEC });
  assert.ok(!isGap(turn));
  for (const e of turn.events.filter((e) => e.op === "DEF")) {
    assert.equal(e.stance, "Clearing");
    assert.equal(e.terrain, "Atmosphere");
    assert.ok(e.mode === "surfeit" || e.mode === "moved", `DEF event must name which failure: ${JSON.stringify(e)}`);
  }
  assert.equal(
    turn.clearingsBy.surfeit + turn.clearingsBy.moved,
    turn.clearings,
    "every clearing is one failure mode or the other, and the tally must close"
  );
});

test("A GROWING GROUND IS NOT A MOVING ONE — the null must not be readable as a clock", () => {
  // Homogeneous noise has no regime change anywhere in it. A correct null puts
  // the false-clearing rate at roughly the null's own censoring resolution,
  // 1/(reseeds+1) — `moved` asks the displacement to exceed ALL `reseeds`
  // draws, so it lands true about one time in six by construction. The bound
  // below is that rate with generous room, and it is nowhere near the rate the
  // broken version produced, which was effectively every step it could fire.
  const material = homogeneous(5);
  const turn = runTurn({ material, ...SPEC, clearOn: ["moved"] });
  assert.ok(!isGap(turn));

  const steps = turn.events.length;
  const rate = turn.clearingsBy.moved / steps;
  assert.ok(rate < 0.4, `moved fired on ${(rate * 100).toFixed(0)}% of steps of pure noise — the null is reading growth`);

  // And the shape, not just the count: a mechanism keyed to extent re-zeros on
  // a fixed period, because it takes the same amount of new material to trip
  // `tolerance` every time. Evenly spaced boundaries on structureless material
  // are the signature, and they survive any amount of rate-tuning.
  const at = recs(turn);
  if (at.length >= 4) {
    const gaps = at.slice(1).map((v, i) => v - at[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    assert.ok(sd / mean > 0.15, `boundaries on pure noise are evenly spaced (cv=${(sd / mean).toFixed(3)}): this is a clock`);
  }
});

test("the moved clearing finds a SPREAD shift that surfeit finds only sometimes", () => {
  // The claim here was originally stronger — "surfeit is blind to spread
  // shifts, by construction" — and it is wrong, which this test caught before
  // it got written down as a law. Burstiness is a MAX, so it responds to
  // whatever lifts the max, and a large enough variance increase does lift it.
  // What is actually true is narrower and seed-dependent: against a ground
  // already wide enough to absorb the change, surfeit misses it more often
  // than not. Measured over these three fixed seeds: moved 3/3, surfeit 1/3.
  //
  // Scored with the causal match window — a clearing cannot be declared until
  // `tolerance` failures have arrived, so the earliest honest detection sits
  // window + tolerance*hop after the change.
  const fwd = SPEC.window + SPEC.tolerance * SPEC.hop;
  const near = (at) => at.some((f) => f - 240 >= -SPEC.window && f - 240 <= fwd);

  let movedFound = 0;
  let surfeitFound = 0;
  for (const seed of [3, 11, 29]) {
    const material = threeRegimes(seed);
    const surfeit = runTurn({ material, ...SPEC, clearOn: ["surfeit"] });
    const moved = runTurn({ material, ...SPEC, clearOn: ["moved"] });
    assert.ok(!isGap(surfeit) && !isGap(moved));
    if (near(recs(surfeit))) surfeitFound++;
    if (near(recs(moved))) movedFound++;
  }

  assert.equal(movedFound, 3, "the moved clearing must find what ananda could already see");
  assert.ok(movedFound > surfeitFound, `moved ${movedFound}/3 vs surfeit ${surfeitFound}/3 — the second clearing has to earn its place`);
});

test("regions carry the vital sign and which failure ended them", () => {
  const turn = runTurn({ material: threeRegimes(3), ...SPEC });
  assert.ok(turn.regions.length >= 2);
  for (const r of turn.regions) {
    assert.ok(Number.isInteger(r.start) && Number.isInteger(r.end) && r.end > r.start);
    // opened is the SIGN of the pattern: widening is encounter, narrowing is
    // extraction. Never a gate, never a score — but never silently absent.
    assert.ok(r.opened === true || r.opened === false || r.opened === null);
  }
  // The last region is ended by the material running out, not by a failure,
  // and says so rather than borrowing the previous region's reason.
  assert.equal(turn.regions[turn.regions.length - 1].clearedBy, null);
  for (const r of turn.regions.slice(0, -1)) assert.ok(r.clearedBy === "surfeit" || r.clearedBy === "moved");
});

test("the field is established before anything is interpreted in it, and covers the whole extent", () => {
  const material = homogeneous(9);
  const turn = runTurn({ material, ...SPEC, hop: 1 });
  assert.ok(!isGap(turn));
  assert.equal(turn.field.coverage.extent, material.length);
  assert.equal(turn.field.coverage.uncovered, 0, "material no reach-unit touches cannot bear a relation");
});

test("grains other than Ground are refused, not faked", () => {
  const g = runTurn({ material: homogeneous(1), ...SPEC, grain: "Figure" });
  assert.equal(g.gap, "unknown_spec");
  assert.equal(g.grain, "Figure");
});
