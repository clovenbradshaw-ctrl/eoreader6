import { test } from "node:test";
import assert from "node:assert/strict";
import { isGap } from "../nul/index.js";
import { CROSSMODAL_TAGS, strengthOf, crossModalTag } from "../verdict/crossmodal.js";

const earned = (position, corroborated) => ({ strength: "earned", position, corroborated });
const held = (position, corroborated) => ({ strength: "held", position, corroborated });
const weak = (position, corroborated) => ({ strength: "weak", position, corroborated });

test("strengthOf projects verdict()'s ladder onto three bands, adding none", () => {
  assert.equal(strengthOf({ verdict: "settled" }), "earned");
  assert.equal(strengthOf({ verdict: "supported" }), "held");
  assert.equal(strengthOf({ verdict: "contested" }), "weak");
  assert.equal(strengthOf({ verdict: "thrash" }), "weak");
  assert.equal(strengthOf({ verdict: "void" }), "weak");
  assert.equal(strengthOf(null), "weak");
});

test("identity: aligned, both earned, both independently corroborated", () => {
  const v = crossModalTag(earned(0.5, true), earned(0.51, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "identity");
  assert.equal(isGap(v), false);
});

test("analogy: aligned, both earned, but not both corroborated", () => {
  const v = crossModalTag(earned(0.5, true), earned(0.51, false), { positionTolerance: 0.05 });
  assert.equal(v.tag, "analogy");
  assert.equal(v.corroborated, false);
});

test("analogy: aligned, both corroborated, but not both earned", () => {
  const v = crossModalTag(held(0.5, true), earned(0.51, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "analogy");
  assert.equal(v.corroborated, true);
});

test("metaphor: aligned, held on both sides, corroborated on neither", () => {
  const v = crossModalTag(held(0.5, false), held(0.49, false), { positionTolerance: 0.05 });
  assert.equal(v.tag, "metaphor");
});

test("metaphor: one earned-uncorroborated, one held-uncorroborated — neither escape hatch fires", () => {
  const v = crossModalTag(earned(0.5, false), held(0.49, false), { positionTolerance: 0.05 });
  assert.equal(v.tag, "metaphor");
});

test("void: positions do not align at the declared tolerance", () => {
  const v = crossModalTag(earned(0.1, true), earned(0.9, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "void");
  assert.equal(v.aligned, false);
  assert.equal(isGap(v), true);
  assert.equal(v.gap, "unstable");
});

test("void: aligned, but one side has nothing earned or held", () => {
  const v = crossModalTag(weak(0.5, false), earned(0.5, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "void");
  assert.equal(isGap(v), true);
  assert.equal(v.gap, "degenerate_ground");
});

test("void: positionTolerance left undeclared is refused, not defaulted", () => {
  const v = crossModalTag(earned(0.5, true), earned(0.5, true), {});
  assert.equal(v.tag, "void");
  assert.equal(isGap(v), true);
  assert.equal(v.gap, "undeclared");
});

test("void: a side missing its declared shape is refused, not coerced", () => {
  const v = crossModalTag({ position: 0.5 }, earned(0.5, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "void");
  assert.equal(isGap(v), true);
  assert.equal(v.gap, "empty_material");
});

test("invariant: tag is void if and only if the result is a gap", () => {
  const cases = [
    crossModalTag(earned(0.5, true), earned(0.5, true), { positionTolerance: 0.05 }),
    crossModalTag(earned(0.5, true), earned(0.5, false), { positionTolerance: 0.05 }),
    crossModalTag(held(0.5, false), held(0.5, false), { positionTolerance: 0.05 }),
    crossModalTag(earned(0.1, true), earned(0.9, true), { positionTolerance: 0.05 }),
    crossModalTag(weak(0.5, false), earned(0.5, true), { positionTolerance: 0.05 }),
  ];
  for (const v of cases) assert.equal(v.tag === "void", isGap(v), JSON.stringify(v));
});

test("CROSSMODAL_TAGS names exactly the tags this module returns", () => {
  assert.deepEqual(CROSSMODAL_TAGS, ["identity", "analogy", "metaphor", "void"]);
});
