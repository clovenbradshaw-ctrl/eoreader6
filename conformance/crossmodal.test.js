import { test } from "node:test";
import assert from "node:assert/strict";
import { isGap } from "../nul/index.js";
import { CROSSMODAL_TAGS, CAREER_MODES, strengthOf, crossModalTag, career } from "../verdict/crossmodal.js";

const earned = (position, corroborated, mode) => ({ strength: "earned", position, corroborated, ...(mode !== undefined ? { mode } : {}) });
const held = (position, corroborated, mode) => ({ strength: "held", position, corroborated, ...(mode !== undefined ? { mode } : {}) });
const weak = (position, corroborated, mode) => ({ strength: "weak", position, corroborated, ...(mode !== undefined ? { mode } : {}) });

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

test("nascent: aligned, held on both sides, corroborated on neither", () => {
  const v = crossModalTag(held(0.5, false), held(0.49, false), { positionTolerance: 0.05 });
  assert.equal(v.tag, "nascent");
});

test("nascent: one earned-uncorroborated, one held-uncorroborated — neither escape hatch fires", () => {
  const v = crossModalTag(earned(0.5, false), held(0.49, false), { positionTolerance: 0.05 });
  assert.equal(v.tag, "nascent");
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
    crossModalTag(earned(0.5, true, "surfeit"), earned(0.5, true, "moved"), { positionTolerance: 0.05 }), // mereAppearance
  ];
  for (const v of cases) assert.equal(v.tag === "void", isGap(v), JSON.stringify(v));
});

test("CROSSMODAL_TAGS names exactly the tags this module returns", () => {
  assert.deepEqual(CROSSMODAL_TAGS, ["identity", "analogy", "nascent", "mereAppearance", "void"]);
});

test("no tag collides with a named rhetorical-mechanism device (verdict/CROSSMODAL-NAMING.md)", () => {
  // This is the one axis-collision check worth pinning: "metaphor" was
  // renamed away from because it is inverted between axes (a confident,
  // settled claim on the rhetorical-mechanism axis; the weakest evidential
  // rung here). "identity" and "analogy" are kept — see the naming doc for
  // why those two are not inverted the same way.
  assert.ok(!CROSSMODAL_TAGS.includes("metaphor"));
});

// ── relational mode: Gentner-Markman's mere-appearance cell ────────────────

test("mereAppearance: aligned position, but declared relational mode disagrees — capped even with strong evidence on both sides", () => {
  const v = crossModalTag(earned(0.5, true, "surfeit"), earned(0.51, true, "moved"), { positionTolerance: 0.05 });
  assert.equal(v.tag, "mereAppearance");
  assert.equal(v.relationalMatch, false);
  assert.equal(isGap(v), false); // real, not a refusal — just capped
});

test("mereAppearance overrides what would otherwise be identity — strength/corroboration cannot buy back a relational mismatch", () => {
  const strongButMismatched = crossModalTag(earned(0.5, true, "surfeit"), earned(0.5, true, "moved"), { positionTolerance: 0.05 });
  assert.equal(strongButMismatched.tag, "mereAppearance");
  assert.notEqual(strongButMismatched.tag, "identity");
});

test("relational mode omitted on either side is 'not applicable', not a mismatch — behaves exactly as before mode existed", () => {
  const oneSided = crossModalTag(earned(0.5, true, "surfeit"), earned(0.51, true), { positionTolerance: 0.05 });
  assert.equal(oneSided.tag, "identity");
  assert.equal(oneSided.relationalMatch, null);
});

test("relational mode matching on both sides behaves exactly as the mode-free path — never downgrades a real match", () => {
  const v = crossModalTag(earned(0.5, true, "surfeit"), earned(0.51, true, "surfeit"), { positionTolerance: 0.05 });
  assert.equal(v.tag, "identity");
  assert.equal(v.relationalMatch, true);
});

test("void: a malformed mode is refused, not coerced", () => {
  const v = crossModalTag({ strength: "earned", position: 0.5, corroborated: true, mode: "wobble" }, earned(0.5, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "void");
  assert.equal(v.gap, "empty_material");
});

// ── metonymy/homology exclusion guard ───────────────────────────────────

test("sharedOrigin: true refuses outright — coreference is not independently-observed correspondence", () => {
  const v = crossModalTag(earned(0.5, true), earned(0.5, true), { positionTolerance: 0.05, sharedOrigin: true });
  assert.equal(v.tag, "void");
  assert.equal(isGap(v), true);
  assert.equal(v.gap, "made_no_difference");
});

test("sharedOrigin defaults to false — omitting it does not silently refuse", () => {
  const v = crossModalTag(earned(0.5, true), earned(0.5, true), { positionTolerance: 0.05 });
  assert.equal(v.tag, "identity");
});

// ── career(): Bowdle & Gentner's trajectory, not a static label ────────────

test("career: no history yet is comparison mode by construction", () => {
  const c = career([], { minObservations: 3 });
  assert.equal(c.mode, "comparison");
  assert.equal(c.streak, 0);
});

test("career: an unbroken run of identity/analogy tags at least minObservations long is categorized", () => {
  const history = [{ tag: "nascent" }, { tag: "analogy" }, { tag: "identity" }, { tag: "analogy" }];
  const c = career(history, { minObservations: 3 });
  assert.equal(c.mode, "categorized");
  assert.equal(c.streak, 3);
});

test("career: short of minObservations stays comparison mode", () => {
  const history = [{ tag: "identity" }, { tag: "analogy" }];
  const c = career(history, { minObservations: 3 });
  assert.equal(c.mode, "comparison");
  assert.equal(c.streak, 2);
});

test("career: one contradicting observation resets the streak — categorization is unbroken, not majority-vote", () => {
  const history = [{ tag: "identity" }, { tag: "identity" }, { tag: "void" }, { tag: "analogy" }, { tag: "identity" }];
  const c = career(history, { minObservations: 3 });
  assert.equal(c.mode, "comparison"); // only 2 consecutive at the tail
  assert.equal(c.streak, 2);
});

test("career: mereAppearance also breaks the streak — a mismatch cell never conventionalizes into a category", () => {
  const history = [{ tag: "identity" }, { tag: "identity" }, { tag: "mereAppearance" }];
  const c = career(history, { minObservations: 2 });
  assert.equal(c.mode, "comparison");
  assert.equal(c.streak, 0);
});

test("career: minObservations left undeclared is refused, not defaulted", () => {
  const c = career([{ tag: "identity" }], {});
  assert.equal(c.mode, "comparison");
  assert.equal(c.gap, "undeclared");
});

test("CAREER_MODES names exactly the modes career() returns", () => {
  assert.deepEqual(CAREER_MODES, ["comparison", "categorized"]);
});
