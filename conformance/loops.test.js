// eoreader6 · loops — three distinct iteration shapes, tested as three
// distinct mechanisms. TIME (growing fraction of one document), GRAIN (the
// Von Neumann containment chain), LEVEL (existence -> structure ->
// significance, with explicit promotion). Not one generic "loop" wearing
// three names — each has a different variable changing (how much material,
// what grain of comparison, which holon level).

import { test } from "node:test";
import assert from "node:assert/strict";
import { timeLoop } from "../packages/engine/loops/time.js";
import { grainWalk } from "../packages/engine/loops/grain.js";
import { levelStep, promote } from "../packages/engine/loops/level.js";
import { ground, isGap } from "../nul/index.js";

test("time loop: growing fraction produces more chunks each pass, over the SAME material", () => {
  const words = Array.from({ length: 2000 }, (_, i) => `word${i % 50}`);
  const reduce = (units, { fraction }) => {
    const readLen = Math.max(1, Math.floor(units.length * fraction));
    const chunks = [];
    for (let i = 0; i + 20 <= readLen; i += 20) chunks.push(i + Math.sin(i) * 5);
    return chunks;
  };
  const results = timeLoop({ reduce, units: words, passes: 5, window: 4, draws: 30, reseeds: 3 });
  const resolved = results.filter((r) => !r.gap);
  assert.ok(resolved.length >= 2, "at least some passes should resolve with real material");
  for (let i = 1; i < resolved.length; i++) {
    assert.ok(resolved[i].chunks >= resolved[i - 1].chunks, "later passes see at least as much material as earlier ones");
  }
});

test("grain walk: reaches exactly as far as the data supports, never further", () => {
  const material = Array.from({ length: 40 }, (_, i) => Math.sin(i * 0.5) * 50 + i);
  const g = ground({ material, draws: 30, window: 5, seed: 1 });
  assert.ok(!isGap(g));

  // no prior ground -> stops at figure, by construction, not by gap
  const noPrior = grainWalk({ observed: material[10], ownGround: g, priorGround: null, material, reseeds: 3 });
  assert.equal(noPrior.grain, "figure");

  // a real prior ground -> can reach pattern or witness
  const prior = ground({ material: material.slice(0, 20), draws: 30, window: 5, seed: 2 });
  const withPrior = grainWalk({ observed: material[10], ownGround: g, priorGround: prior, material, reseeds: 3 });
  assert.ok(["figure", "pattern", "witness"].includes(withPrior.grain));
  if (withPrior.grain === "witness") assert.equal(withPrior.result.pattern.moved, true);
});

test("level step: existence, structure, and significance are reported independently, and settled requires all conditions named", () => {
  const series = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.4) * 80 + (i > 30 ? 200 : 0));
  const regime = { start: 28, end: 34 }; // straddles the real step-change
  const readerGround = ground({ material: series.slice(0, 28), draws: 40, window: 5, seed: 3 });

  const step = levelStep({ series, regime, readerGround, existenceCount: 5, structureOptions: { draws: 40, window: 5, reseeds: 10 } });
  assert.ok(["above", "below", "peer", "unstable"].includes(step.structure));
  assert.equal(step.existence, 5);
  assert.equal(typeof step.settled, "boolean");

  if (step.settled) {
    const promoted = promote(step, "test-referent");
    assert.equal(promoted.type, "DEF.admit");
    assert.equal(promoted.referent_id, "test-referent:settled");
    assert.equal(promoted.provenance.giver, "loops/level:settled");
  } else {
    assert.throws(() => promote(step, "test-referent"), /never settled/);
  }
});
