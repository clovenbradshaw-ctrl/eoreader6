// eoreader6 · reader — reading, as opposed to processing an array in order.
//
// Two invariants carry this file.
//
// ADMISSION-ORDER INVARIANCE: how the material was batched must be invisible
// in the output. A reader whose account of a text depends on whether it
// arrived a word at a time or a chapter at a time is reading its input
// schedule, not the text.
//
// REFUSAL BY CONTRACT: material that is not meant to be consumed sequentially
// is refused rather than read. A still image reduces to a perfectly good
// numeric series and reading it would produce regions, boundaries and an
// ananda trace, all of them artefacts of raster order.

import { test } from "node:test";
import assert from "node:assert/strict";
import { openReading, admit, close, read, soFar } from "../packages/engine/loops/reader.js";
import { runTurn } from "../packages/engine/loops/turn.js";
import { contract } from "../packages/engine/perceiver/consumption.js";
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

const threeRegimes = (seed) => {
  const next = rng(seed);
  const out = [];
  for (let i = 0; i < 120; i++) out.push(10 + gaussian(next) * 1);
  for (let i = 0; i < 120; i++) out.push(25 + gaussian(next) * 1);
  for (let i = 0; i < 120; i++) out.push(25 + gaussian(next) * 6);
  return out;
};

const SEQUENTIAL = contract({
  order: "sequential",
  unit: "synthetic sample",
  present: 12,
  basis: "a fixture: the present is declared here so the test is about admission, not about the number",
});

const OPTS = { consumption: SEQUENTIAL, draws: 200, reseeds: 5, tolerance: 3, hop: 4, seed: 17 };
// stationarity is included deliberately: the FIRST attempt at that diagnostic
// classified each censoring event against the material read so far, so it read
// its own input schedule and would have passed a strip() that left it out.
const strip = (result) => ({
  regions: result.regions,
  events: result.events,
  clearingsBy: result.clearingsBy,
  driftGaps: result.driftGaps,
  stationarity: result.stationarity,
});

test("ADMISSION-ORDER INVARIANCE — one at a time, in ragged batches, or all at once", () => {
  const material = threeRegimes(3);
  const oneShot = strip(read(material, OPTS));

  // one element at a time: the strictest possible drip
  const drip = openReading(OPTS);
  for (const v of material) admit(drip, [v]);
  assert.deepEqual(strip(close(drip)), oneShot, "reading one element at a time differed from reading it all at once");

  // ragged batches whose sizes share no factor with hop or window
  const ragged = openReading(OPTS);
  const next = rng(99);
  let at = 0;
  while (at < material.length) {
    const take = 1 + Math.floor(next() * 37);
    admit(ragged, material.slice(at, at + take));
    at += take;
  }
  assert.deepEqual(strip(close(ragged)), oneShot, "batch sizes were visible in the reading");
});

test("the streaming reader and runTurn are the same reader, not two that agree today", () => {
  // runTurn delegates. If these ever diverge it is because someone kept two
  // implementations, which is this repo's most reliable failure mode.
  const material = threeRegimes(11);
  const streamed = read(material, OPTS);
  const turned = runTurn({ material, window: SEQUENTIAL.present, draws: 200, reseeds: 5, tolerance: 3, hop: 4, seed: 17 });
  assert.deepEqual(strip(turned), strip(streamed));
});

test("a reading is available at every point, and its open region is reported as open", () => {
  const material = threeRegimes(3);
  const r = openReading(OPTS);

  // Before anything has been read at all: a real state, not an error.
  const nothing = soFar(r);
  assert.equal(nothing.read, 0);
  assert.equal(nothing.regions.length, 0);
  assert.equal(nothing.events.length, 0);

  admit(r, material.slice(0, 200));
  const partial = soFar(r);
  assert.equal(partial.read, 200);
  assert.ok(partial.events.length > 0, "200 samples in, the reader should have something to say");
  // The open region ends where reading has GOT TO. Calling that a boundary
  // would be the reader asserting a structure the material has not supplied.
  assert.equal(partial.open.readTo, 200);
  assert.ok(!("end" in partial.open));

  // ...and the events already emitted are never revised by what comes later.
  const emitted = [...partial.events];
  admit(r, material.slice(200));
  const full = soFar(r);
  assert.deepEqual(full.events.slice(0, emitted.length), emitted, "earlier events were rewritten by later material");
});

test("the field is cut as material arrives, never partitioned over an extent nobody has read", () => {
  const material = threeRegimes(3);
  const r = openReading(OPTS);
  admit(r, material.slice(0, 100));
  // A unit at i observes [i, i+window), so it cannot exist until its whole
  // present has arrived. Units beyond what has been read must not exist.
  for (const u of r.units) assert.ok(u.end <= 100, `a reach-unit reached to ${u.end} with only 100 elements read`);
});

test("a closed reading refuses more material rather than quietly reopening", () => {
  const r = openReading(OPTS);
  admit(r, threeRegimes(3));
  close(r);
  const again = admit(r, [1, 2, 3]);
  assert.ok(isGap(again));
  assert.equal(again.gap, "kept_ground");
});

// ── refusal by contract ─────────────────────────────────────────────────────

test("a still image is REFUSED, not read: its scanline order belongs to the raster", () => {
  const simultaneous = contract({
    order: "simultaneous",
    unit: "scanline mean luminance",
    present: 2,
    basis: "the whole field arrives together",
  });
  const r = openReading({ ...OPTS, consumption: simultaneous });
  assert.ok(isGap(r));
  assert.equal(r.gap, "unknown_spec");
  assert.match(r.why, /scan order/);
});

test("unordered material is refused too — a file order is not a sequence", () => {
  const unordered = contract({
    order: "unordered",
    unit: "row",
    present: 4,
    basis: "rows of measurements whose file order is an accident of writing",
  });
  const r = openReading({ ...OPTS, consumption: unordered });
  assert.ok(isGap(r));
  assert.match(r.why, /does not have/);
});

test("no contract at all is a refusal, not a default", () => {
  const r = openReading({ ...OPTS, consumption: undefined });
  assert.ok(isGap(r));
  assert.equal(r.gap, "undeclared");
  assert.equal(r.what, "consumption");
});

test("the reach of the present comes from the contract and cannot be passed in", () => {
  // The door the unjustified `window: 12` came through, closed. Handing one in
  // must not override what the perceiver declared about its own material.
  const material = threeRegimes(3);
  const declared = read(material, OPTS);
  const smuggled = read(material, { ...OPTS, window: 40 });
  assert.equal(declared.window, SEQUENTIAL.present);
  assert.equal(smuggled.window, SEQUENTIAL.present);
  assert.deepEqual(strip(smuggled), strip(declared));
});

// ── drift: is this reader a clock? ──────────────────────────────────────────

const ramp = (seed, slope) => {
  const next = rng(seed);
  return Array.from({ length: 600 }, (_, i) => 10 + i * slope + gaussian(next));
};

test("DRIFT — a monotone channel is reported as one, because reading it makes this a clock", () => {
  // The most expensive mistake in this project: material whose scale grows
  // with how much has been read drags the ground along under it, so the reader
  // re-zeros on a fixed period. Against evenly spaced chapters that scored
  // 18/20 at 15/15 precision and meant nothing. It must be visible in the
  // reading's own output, not discovered three retractions later.
  for (const seed of [5, 6, 7]) {
    const up = read(ramp(seed, 0.1), OPTS);
    const down = read(ramp(seed, -0.1), OPTS);
    assert.equal(up.stationarity.drift, 1, "a climbing channel must report drift +1");
    assert.equal(down.stationarity.drift, -1, "a falling channel must report drift -1");
  }
});

test("drift stays near zero for a genuine regime change, which is not a trend", () => {
  // A step change is exactly what the clearing is FOR, and must not be
  // confused with a ramp. Stationary either side of one boundary.
  const next = rng(9);
  const twoRegimes = Array.from({ length: 600 }, (_, i) => (i < 300 ? 10 : 30) + gaussian(next));
  const r = read(twoRegimes, OPTS);
  assert.ok(Math.abs(r.stationarity.drift) < 0.9, `a single step change reported drift ${r.stationarity.drift}`);
});

test("drift is reported with the count it was computed from, and gates nothing", () => {
  // A vital sign, like ananda — never a gate, and the moment it gates anything
  // it becomes a number to tune. It is noisy at small counts (a stationary run
  // with three regions can read high by chance), so the n travels with it
  // rather than being left for the reader to guess.
  const r = read(ramp(5, 0.1), OPTS);
  assert.equal(typeof r.stationarity.steps, "number");
  assert.ok(Array.isArray(r.stationarity.centres));
  assert.ok(r.stationarity.steps >= 1, "drift without a count behind it is not reportable");
});
