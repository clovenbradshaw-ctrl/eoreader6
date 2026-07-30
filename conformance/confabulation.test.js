// Death one: confabulation. Boundary breach — it speaks without witness.
//
// This family is the tradition's strength and it is inherited on purpose. Each
// test names a way a claim could arrive unearned, and asserts the schema has no
// shape for it. Nothing here is a policy; every refusal is structural, and every
// refusal is free — no null is spent to catch any of it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  constructGround,
  receiveGround,
  seal,
  perceive,
  witness,
  isGap,
  validateFigure,
  validateGround,
} from "../nul/index.js";

const material = [1, 1, 2, 1, 8, 9, 8, 1, 2, 1, 1, 2];

test("no figure without a ground", () => {
  const bad = validateFigure({ grounds: [] });
  assert.ok(isGap(bad));
  assert.equal(bad.gap, "no_ground");
});

test("a constructed ground must cite the material it perturbed", () => {
  const forged = { kind: "constructed", perturbation: { id: "shuffle" }, samples: [1, 2], from: null };
  const bad = validateGround(forged);
  assert.ok(isGap(bad));
  assert.equal(bad.gap, "unreceived_origin");
});

test("a received ground must name its giver — the origin cannot be derived", () => {
  const bad = receiveGround({ samples: [1, 2, 3] });
  assert.ok(isGap(bad));
  assert.equal(bad.gap, "unreceived_origin");

  const good = receiveGround({ samples: [1, 2, 3], provenance: "priors/coref/war-and-peace.json" });
  assert.equal(good.kind, "received");
  assert.equal(good.sealed, false);
});

test("a kept ground cannot be perceived through, and is refused before any measurement", () => {
  const kept = seal(constructGround({ material }));
  // material is garbage and `observed` is absent: if the structural check did not
  // run first, this would fail arithmetically instead of being refused.
  const out = perceive({ material: "not a series", grounds: [kept] });
  assert.ok(isGap(out));
  assert.equal(out.gap, "sealed_ground");
});

test("a ground with no samples is a claim about nothing-in-general", () => {
  const bad = validateGround({ kind: "constructed", perturbation: { id: "shuffle" }, from: "x", samples: [] });
  assert.ok(isGap(bad));
  assert.equal(bad.gap, "no_ground");
});

test("witness and zeroing cannot happen in the same act", () => {
  const figure = perceive({ material });
  assert.ok(!isGap(figure));

  const tooEarly = witness({ figure, phase: "zeroing" });
  assert.ok(isGap(tooEarly));
  assert.equal(tooEarly.gap, "wrong_phase");

  const tooLate = constructGround({ material, phase: "witnessing" });
  assert.ok(isGap(tooLate));
  assert.equal(tooLate.gap, "wrong_phase");
});

test("an unestablished pattern is reported, never filled", () => {
  const figure = perceive({ material });
  const record = witness({ figure });
  assert.equal(record.pattern, null);
  assert.equal(record.gaps[0].gap, "unresolved_pattern");
});

test("testimony seals its grounds, so a record can never be perceived through", () => {
  const figure = perceive({ material });
  const record = witness({ figure, pattern: { id: "recurrence:0" } });
  assert.ok(record.figure.grounds.every((g) => g.sealed));
  const reused = perceive({ material, grounds: record.figure.grounds });
  assert.equal(reused.gap, "sealed_ground");
});

test("gaps are returned, never thrown — absence is the normal case", () => {
  assert.doesNotThrow(() => constructGround({ material: [] }));
  assert.doesNotThrow(() => constructGround({ material, perturbation: "nope" }));
  assert.equal(constructGround({ material: [] }).gap, "empty_material");
  assert.equal(constructGround({ material, perturbation: "nope" }).gap, "unknown_perturbation");
});
