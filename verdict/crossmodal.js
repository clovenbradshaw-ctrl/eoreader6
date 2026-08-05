// eoreader6 · verdict/crossmodal — an explicit tag for a correspondence
// CLAIMED BETWEEN two readings, at least one of which arrived from
// different material than the other (e.g. runTurn() on audio vs. runTurn()
// on image — goldens/multimodal). Adds no new ladder: strengthOf() only
// projects verdict()'s existing supported/settled/contested/thrash/void
// onto three bands, and crossModalTag() compares two of those projections
// plus a caller-declared, independently-checked corroboration flag per
// side. Nothing here infers corroboration — a caller who does not know
// whether a side was checked against anything outside itself must say so,
// because guessing would be exactly the unearned-correspondence failure
// this module exists to refuse.
//
// Why this needs to exist at all: prose in this repo already makes claims
// of this shape — CUBE.md's "is the same axis... not an analogy to it";
// goldens/multimodal/README.md's "not a weaker version of the same
// finding; it's the SAME finding, reproduced cross-modally." Both are
// careful, argued claims, each reached by a human weighing evidence. Neither
// is a value the engine itself can query. This module is that mechanism:
// given two sides, it returns one of four explicit tags and never silently
// rounds a weaker claim up to a stronger one.
//
//   identity — aligned, both sides earned (settled — stability-checked
//     against reseeding, per verdict()'s own ladder) AND independently
//     corroborated. The strongest claim this module can return; reserved
//     for exactly the case goldens/multimodal argues in prose.
//   analogy  — aligned, and either both sides are structurally strong
//     (earned) or both are independently corroborated, but not both at
//     once. A real, standing structural resemblance that has not (yet)
//     been earned AND checked against something outside itself together.
//   nascent  — aligned, but neither "both earned" nor "both corroborated"
//     holds — at least one side is only held (supported, not settled), and
//     no independent check closes the gap. A correspondence still finding
//     its footing, not a stable structure — read off a trajectory, not
//     asserted outright (the eoreader4.2 precedent this traces to called
//     exactly this shape "the life of a metaphor," but that word names a
//     RHETORICAL MOVE — figure substituted for ground, identity asserted
//     not compared — on a completely different, orthogonal axis than the
//     one this ladder measures, and on that other axis "metaphor" is a
//     confident, settled claim, not a weak one. Naming this rung "metaphor"
//     would collide the two axes with inverted meanings; see
//     verdict/CROSSMODAL-NAMING.md).
//   void     — not aligned, or a side has nothing earned or held to offer.
//     Refuses to tag anything rather than guess.
//
// Every void tag is also a gap (isGap() is true on it) — there is nothing
// else a void tag could mean here. No other tag is ever a gap. That
// invariant is checked in conformance/crossmodal.test.js.

import { gap, isGap } from "../nul/index.js";

export const CROSSMODAL_TAGS = Object.freeze(["identity", "analogy", "nascent", "void"]);

const STRENGTHS = Object.freeze(["earned", "held", "weak"]);

/**
 * Projects verdict()'s existing ladder onto three bands. Adds no new
 * category: "settled" is the only rung verdict() reaches by stability-
 * checking against reseeded material, so it alone earns "earned"; a bare
 * "supported" is held, not earned, until it clears that same check;
 * everything else (contested, thrash, void, or a gap) has nothing to offer.
 */
export const strengthOf = (v) => {
  if (!v || isGap(v)) return "weak";
  if (v.verdict === "settled") return "earned";
  if (v.verdict === "supported") return "held";
  return "weak"; // contested, thrash, void
};

const validSide = (side) =>
  Boolean(side) &&
  STRENGTHS.includes(side.strength) &&
  Number.isFinite(side.position) &&
  typeof side.corroborated === "boolean";

/**
 * a, b: { strength: "earned"|"held"|"weak", position: number, corroborated: boolean }
 * — position is the caller's own normalized locus (e.g. boundary index /
 * material length) so two different modalities' extents are comparable at
 * all; corroborated is whatever independent check the caller actually ran
 * (a known ground truth, a second measurement method) — never inferred
 * here, never defaulted to true.
 *
 * options.positionTolerance: how close two normalized positions must land
 * to count as the same locus. Declared, never defaulted — the same
 * discipline as `window`/`draws`/`tolerance` elsewhere in this repo: a
 * resolution is never assumed on the module's behalf.
 */
export const crossModalTag = (a, b, { positionTolerance } = {}) => {
  if (!Number.isFinite(positionTolerance) || positionTolerance < 0)
    return { tag: "void", ...gap("undeclared", { what: "positionTolerance", why: "closeness in normalized position is never a default" }) };
  if (!validSide(a) || !validSide(b))
    return { tag: "void", ...gap("empty_material", { reason: "each side needs a declared strength, a normalized position, and a stated corroboration" }) };

  const distance = Math.abs(a.position - b.position);
  if (distance > positionTolerance)
    return Object.freeze({ tag: "void", aligned: false, distance, ...gap("unstable", { reason: "the two sides share no comparable footing at this position tolerance" }) });

  if (a.strength === "weak" || b.strength === "weak")
    return Object.freeze({ tag: "void", aligned: true, distance, ...gap("degenerate_ground", { reason: "at least one side has nothing earned or held to compare" }) });

  const bothEarned = a.strength === "earned" && b.strength === "earned";
  const bothCorroborated = a.corroborated === true && b.corroborated === true;

  if (bothEarned && bothCorroborated)
    return Object.freeze({ tag: "identity", aligned: true, distance, strengthA: a.strength, strengthB: b.strength, corroborated: true });

  if (bothEarned || bothCorroborated)
    return Object.freeze({ tag: "analogy", aligned: true, distance, strengthA: a.strength, strengthB: b.strength, corroborated: bothCorroborated });

  return Object.freeze({ tag: "nascent", aligned: true, distance, strengthA: a.strength, strengthB: b.strength, corroborated: false });
};
