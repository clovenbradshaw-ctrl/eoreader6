// eoreader6 · formation — the becoming of a thing, in phases.
//
// The suite plants the three rows and the two refusals that hold them apart:
//
//   a burst peak, read against its own settled past   CENSORED ABOVE  surfeit,
//                                                     and the seed's named
//                                                     trigger to re-zero
//   a burst, collapsed against a received ground      PROTOGON → HOLON  the
//                                                     origin is received, then
//                                                     the level test earns it
//   an ordinary regime                                PROTOGON → PROTOGON  peer
//                                                     means it waits
//   two gates in disagreement                          UNSTABLE — a typed gap,
//                                                     a result and not an error
//
// Plus the type discipline (SEED.md #7): a diffuse thing cannot be asked
// where it is, a cut cannot be cut again, and a holon cannot be re-sustained.

import { test } from "node:test";
import assert from "node:assert/strict";
import { received, ground, reZero, burstiness, isGap } from "../nul/index.js";
import { emanon, collapse, sustain, PHASES } from "../formation/index.js";

const D = 256;
const W = 5;
const quiet = [1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2];
const bursty = [...quiet.slice(0, 10), 9, 9, 9, 9, 9, ...quiet.slice(5)];

// Received grounds — gifts that name their giver. The burst's spans 3..9 and
// places the peak; the plain's spans 0.2..2.2 and places an ordinary value.
const recBurst = received({
  samples: Array.from({ length: 64 }, (_, i) => 3 + (6 * i) / 63),
  provenance: { giver: "the-text" },
});
const recPlain = received({
  samples: Array.from({ length: 64 }, (_, i) => 0.2 + (2 * i) / 63),
  provenance: { giver: "the-text" },
});

// ── the phases ───────────────────────────────────────────────────────────────

test("emanon is diffuse — no boundary, no figure, no where", () => {
  const e = emanon({ material: bursty, window: W, draws: D });
  assert.equal(e.phase, "emanon");
  assert.equal(e.figure, null);
  assert.equal(e.boundary, null);
  assert.deepEqual([...e.material], bursty);
  assert.deepEqual({ ...e.spec }, { window: W, draws: D, perturbation: "shuffle" });
  assert.equal(e.extent, bursty.length);
});

test("the phases are the arc: diffuse, collapsed, self-sustaining", () => {
  assert.deepEqual([...PHASES], ["emanon", "protogon", "holon"]);
});

test("the declared numbers are never defaulted", () => {
  for (const args of [
    { material: bursty, draws: D },
    { material: bursty, window: W },
    { material: bursty },
    { material: [], window: W, draws: D },
  ]) {
    const e = emanon(args);
    assert.ok(isGap(e), `${JSON.stringify(args)} must refuse`);
  }
});

// ── type discipline (SEED.md #7) ─────────────────────────────────────────────

test("a diffuse thing is a type error for every figure question", () => {
  const e = emanon({ material: bursty, window: W, draws: D });
  const s = sustain({ protogon: e, reseeds: 8 });
  assert.ok(isGap(s));
  assert.match(s.reason, /not been cut/);
});

test("a cut cannot be cut again, and a holon cannot be re-sustained", () => {
  const e = emanon({ material: bursty, window: W, draws: D, firstGround: recBurst });
  const c = collapse({ emanon: e, observed: 9, regime: { start: 10, end: 15 } });
  assert.equal(c.phase, "protogon");
  assert.ok(isGap(collapse({ emanon: c, observed: 9 })), "protogon is already cut");

  const h = sustain({ protogon: c, reseeds: 8 });
  assert.equal(h.phase, "holon");
  assert.ok(isGap(sustain({ protogon: h, reseeds: 8 })), "holon has already sustained");
});

test("a received first ground must name its giver (SEED.md #1)", () => {
  const e = emanon({ material: quiet, window: W, draws: D, firstGround: { samples: [1, 2, 3, 4, 5] } });
  assert.equal(e.gap, "unreceived_origin");
});

// ── the refusals, both censored directions ───────────────────────────────────

test("a peak beyond its own settled past is surfeit, and names the re-zero trigger", () => {
  const e = emanon({ material: bursty, window: W, draws: D });
  const c = collapse({ emanon: e, observed: 9, regime: { start: 10, end: 15 } });
  assert.equal(c.gap, "exceeds_witness");
  assert.equal(c.direction, "above");
  assert.equal(c.reZero, true);
  assert.ok(c.ground, "the ground is returned so it can be re-zeroed");
});

test("the floor is regularity, not a figure", () => {
  const e = emanon({ material: quiet, window: W, draws: D });
  const observed = burstiness(quiet.slice(10, 15), { window: W });
  const c = collapse({ emanon: e, observed, regime: { start: 10, end: 15 } });
  assert.equal(c.gap, "exceeds_witness");
  assert.equal(c.direction, "below");
  assert.equal(c.reZero, undefined);
});

test("a cut with nothing settled behind it refuses — the first ground is received", () => {
  const e = emanon({ material: bursty, window: W, draws: D });
  const c = collapse({ emanon: e, observed: 1, regime: { start: 0, end: 5 } });
  assert.equal(c.gap, "no_ground");
  assert.match(c.reason, /received/);
});

test("regime bounds and shapes are refused before any measurement", () => {
  const e = emanon({ material: quiet, window: W, draws: D });
  assert.ok(isGap(collapse({ emanon: e, observed: 1, regime: { start: -1, end: 3 } })));
  assert.ok(isGap(collapse({ emanon: e, observed: 1, regime: { start: 18, end: 21 } })));
  assert.ok(isGap(collapse({ emanon: e, observed: 1, regime: { start: 5, end: 5 } })));
  assert.ok(isGap(collapse({ emanon: e, observed: 1, regime: { start: 5.5, end: 9 } })));
});

test("a handed-in ground over the wrong extent is refused", () => {
  // Seven cells: three distinct windows, so the ground is not degenerate —
  // but its extent (7) matches neither the emanon's (20) nor the cut's regime
  // start (3), so it must be refused as incommensurate before any measurement.
  const g = ground({ material: quiet.slice(0, 7), draws: D, window: W });
  const e = emanon({ material: quiet, window: W, draws: D });
  const c = collapse({ emanon: e, observed: 1.0, regime: { start: 3, end: 6 }, ground: g });
  assert.equal(c.gap, "incommensurate_extent");
});

// ── the arc ──────────────────────────────────────────────────────────────────

test("the origin is received: a burst collapses against a ground that names its giver", () => {
  const e = emanon({ material: bursty, window: W, draws: D, firstGround: recBurst });
  const c = collapse({ emanon: e, observed: 9, regime: { start: 10, end: 15 } });
  assert.equal(c.phase, "protogon");
  assert.ok(c.figure.rank > 0 && c.figure.rank <= 1);
});

test("the level test earns the holon: a self-sustaining burst is above", () => {
  const e = emanon({ material: bursty, window: W, draws: D, firstGround: recBurst });
  const c = collapse({ emanon: e, observed: 9, regime: { start: 10, end: 15 } });
  const h = sustain({ protogon: c, reseeds: 8 });
  assert.equal(h.phase, "holon");
  assert.equal(h.level, "above");
  assert.equal(h.sustained, true);
});

test("an ordinary regime stays a protogon — peer means it waits", () => {
  const e = emanon({ material: quiet, window: W, draws: D, firstGround: recPlain });
  const c = collapse({ emanon: e, observed: 1.0, regime: { start: 3, end: 6 } });
  assert.equal(c.phase, "protogon");
  const p = sustain({ protogon: c, reseeds: 8 });
  assert.equal(p.phase, "protogon");
  assert.equal(p.sustained, false);
  assert.equal(p.level, "peer");
});

// A short, locally-distinct patch in a long quiet field. The mean inside it
// genuinely differs from the mean outside, so possibility-constraint fires; and
// removing four values out of sixty genuinely does not move the ground, so
// existence-dependency does not. The gates disagree for a reason — distinct in
// level, inessential in structure — and `unstable` is the honest reading.
//
// THIS FIXTURE REPLACED ONE THAT WAS USING A DEFECT. The previous material was
// `quiet` at regime 10-15, which returned `unstable` only because `regimeNull`
// was an UNCONDITIONAL null: it zeroed a fixed window and compared a ground over
// extent n against one over extent n-L. Under the conditional null that material
// returns `peer` — which is what the sibling test above asserts for regime 3-6
// on the same material, and is the right answer, because no regime in flat
// material is a level. A test whose fixture depends on a bug passes for the
// wrong reason and fails the moment the bug is fixed. See `holon_level/index.js`.
const speckled = [...quiet, ...quiet, ...quiet];
for (let i = 20; i < 24; i++) speckled[i] = 3;

test("disagreeing gates are a typed gap, a result and not an error", () => {
  const e = emanon({ material: speckled, window: W, draws: D, firstGround: recPlain });
  const c = collapse({ emanon: e, observed: 1.0, regime: { start: 20, end: 24 } });
  assert.equal(c.phase, "protogon");
  const s = sustain({ protogon: c, reseeds: 8 });
  assert.equal(s.gap, "unstable");
  // The disagreement is the finding (SEED.md #6), so assert its DIRECTION —
  // otherwise any two gates failing for any two reasons would pass this test.
  assert.equal(s.existence.exists, false);
  assert.equal(s.constraint.constrains, true);
});

test("the full arc: diffuse, surfeit, re-zero, cut, sustain", () => {
  const e = emanon({ material: bursty, window: W, draws: D });
  const c1 = collapse({ emanon: e, observed: 9, regime: { start: 10, end: 15 } });
  assert.equal(c1.gap, "exceeds_witness");
  assert.equal(c1.direction, "above");

  const g1 = reZero(c1.ground, { material: bursty, seed: 1 });
  assert.ok(!isGap(g1));
  const observed = (g1.samples[0] + g1.samples[g1.samples.length - 1]) / 2;
  const c2 = collapse({ emanon: e, observed, regime: { start: 10, end: 15 }, ground: g1 });
  assert.equal(c2.phase, "protogon");

  const h = sustain({ protogon: c2, reseeds: 8 });
  assert.equal(h.phase, "holon");
  assert.equal(h.level, "above");
});

test("a cut with no place has no self-sustaining claim", () => {
  const e = emanon({ material: quiet, window: W, draws: D, firstGround: recPlain });
  const c = collapse({ emanon: e, observed: 1.0 });
  assert.equal(c.phase, "protogon");
  assert.equal(c.figure.regime, null);
  const s = sustain({ protogon: c, reseeds: 8 });
  assert.ok(isGap(s));
  assert.match(s.reason, /no place/);
});

// ── the growth rule, measured ────────────────────────────────────────────────

test("the core's rank is not phase — the level test decides what difference() cannot", () => {
  // Both figures PLACE against their grounds: rank inside (0,1). Yet one
  // sustains and one waits. The core's difference() returns only this rank —
  // it has no cut, no regime, and no way to form the question "is this thing
  // self-sustaining" at all. The organ's verdict is not carried by the rank.
  const eB = emanon({ material: bursty, window: W, draws: D, firstGround: recBurst });
  const cB = collapse({ emanon: eB, observed: 9, regime: { start: 10, end: 15 } });
  const eP = emanon({ material: quiet, window: W, draws: D, firstGround: recPlain });
  const cP = collapse({ emanon: eP, observed: 1.0, regime: { start: 3, end: 6 } });

  assert.ok(cB.figure.rank > 0 && cB.figure.rank < 1, "the burst figure places");
  assert.ok(cP.figure.rank > 0 && cP.figure.rank < 1, "the plain figure places");

  const h = sustain({ protogon: cB, reseeds: 8 });
  const p = sustain({ protogon: cP, reseeds: 8 });
  assert.equal(h.phase, "holon");
  assert.equal(p.phase, "protogon");

  // The more extreme rank (the burst's) sustains; the middling one waits.
  // Neither "high rank" nor "low rank" carries the phase — the regime's role
  // in the material does, and that is what existence-dependency and
  // possibility-constraint measure against their Born nulls.
  assert.ok(cB.figure.rank < cP.figure.rank);
});
