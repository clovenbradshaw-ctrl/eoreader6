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
// STRUCTURE-MAPPING (Gentner 1983; Gentner & Markman 1997; Bowdle & Gentner
// 2005, "The Career of Metaphor"): analogy, metaphor, and literal
// similarity are evaluated by ONE alignment mechanism, not three. What
// differs is (a) how much SURFACE/attribute overlap accompanies the
// relational overlap, and (b) whether a live comparison has survived
// enough re-observation to be promoted into a standing, reusable category
// ("dead" metaphor = class-inclusion, not alignment). This module was
// pointed at that literature after the fact and re-derived two pieces of
// it independently, which is recorded here rather than claimed as if
// planned: `strengthOf()`'s "settled" rung was already a crude
// survives-re-observation check; `mode` below is the first real
// relational-overlap signal this module has had (previously position
// alignment alone stood in for BOTH attribute and relational overlap,
// which conflates Gentner-Markman's analogy and mere-appearance cells).
//
//   identity — aligned, same relational mode where declared, both sides
//     earned (settled) AND independently corroborated. The strongest claim
//     this module can return; reserved for exactly the case
//     goldens/multimodal argues in prose.
//   analogy  — aligned, same relational mode where declared, and either
//     both sides are structurally strong (earned) or both are
//     independently corroborated, but not both at once.
//   nascent  — aligned, same relational mode where declared, but neither
//     "both earned" nor "both corroborated" holds. A LIVE comparison —
//     Gentner's novel-metaphor/analogy state, effortful and provisional
//     each time it is drawn (see `career()` below for what happens across
//     repeated draws of the same locus). Not named "metaphor": that word
//     names a RHETORICAL MOVE on a different, orthogonal axis where it
//     means a confident, settled claim, the opposite of what this rung
//     means here — see verdict/CROSSMODAL-NAMING.md.
//   mereAppearance — aligned in POSITION, but the two sides' relational
//     mode (`surfeit` vs `moved` — real structural-event kinds, not
//     invented for this) actively DISAGREES. Gentner-Markman's mere-
//     appearance cell exactly: real, noticed overlap with no systematicity
//     to transfer. HARD-CAPPED — can never reach identity or analogy no
//     matter how earned or corroborated either side is alone, because
//     strength/corroboration answer "how sure are we," not "is this even
//     the right KIND of correspondence."
//   void     — not aligned, or a side has nothing earned or held to offer.
//     Refuses to tag anything rather than guess.
//
// OUT OF SCOPE, refused rather than tagged (the metonymy/homology guard):
// this module answers only claims of INDEPENDENTLY OBSERVED similarity.
// Two sides that share a literal common origin (coreference — the same
// underlying material cited twice, `nul`'s own `cites()`/CON.identity
// territory) are not independently similar, they are the same thing; a
// caller who knows this must declare `sharedOrigin: true` and gets refused
// outright, not scored as an extra-strong "identity". Contiguity/
// association claims (metonymy — "the crown" for the monarchy) are not a
// structural-alignment question at all and must be filtered by the caller
// before ever constructing a side; there is nothing in a {strength,
// position, corroborated} triple that could detect "this is contiguity,
// not similarity," so this module cannot guard that case itself.
//
// Every void tag is also a gap (isGap() is true on it) — there is nothing
// else a void tag could mean here. No other tag is ever a gap. That
// invariant is checked in conformance/crossmodal.test.js.
//
// NOT YET EARNED, and should not be treated as confirmed: Gentner-Markman's
// full quadrant (literal-similarity / analogy / mere-appearance /
// abstraction) crosses RELATIONAL overlap with ATTRIBUTE overlap as two
// independent axes. `mode`-matching gives this module a real relational
// signal for the first time; it has no attribute-overlap signal at all —
// nothing here compares the two sides' underlying MAGNITUDES, shapes, or
// surface features, only their position and a mode label. Choosing
// "literal similarity" vs "analogy" as an output tag would require that
// second axis, and inventing a proxy for it now — rather than measuring
// one — would be exactly the unearned-correspondence mistake this module
// exists to refuse, aimed at itself.

import { gap, isGap } from "../nul/index.js";

export const CROSSMODAL_TAGS = Object.freeze(["identity", "analogy", "nascent", "mereAppearance", "void"]);

const STRENGTHS = Object.freeze(["earned", "held", "weak"]);
const MODES = Object.freeze(["surfeit", "moved"]);

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
  typeof side.corroborated === "boolean" &&
  (side.mode === undefined || MODES.includes(side.mode));

/**
 * null when either side omits `mode` (no relational signal available —
 * not the same as disagreement, and must not be scored as one); true/false
 * when both declare a mode and it does/doesn't match.
 */
const relationalMatch = (a, b) => {
  if (a.mode == null || b.mode == null) return null;
  return a.mode === b.mode;
};

/**
 * a, b: { strength: "earned"|"held"|"weak", position: number, corroborated:
 * boolean, mode?: "surfeit"|"moved" } — position is the caller's own
 * normalized locus (e.g. boundary index / material length) so two
 * different modalities' extents are comparable at all; corroborated is
 * whatever independent check the caller actually ran (a known ground
 * truth, a second measurement method) — never inferred here, never
 * defaulted to true. `mode` is optional and is the real event KIND behind
 * the position (runTurn()'s own `surfeit`/`moved` failure modes) — omit it
 * when the side has no such kind (a literal reference point, e.g. a real
 * chapter header, has no clearing mode of its own).
 *
 * options.positionTolerance: how close two normalized positions must land
 * to count as the same locus. Declared, never defaulted — the same
 * discipline as `window`/`draws`/`tolerance` elsewhere in this repo: a
 * resolution is never assumed on the module's behalf.
 *
 * options.sharedOrigin: declare `true` only when the caller KNOWS the two
 * sides cite the same underlying material (coreference/homology) rather
 * than being independently observed. Refused outright — see the
 * metonymy/homology guard in this file's header comment.
 */
export const crossModalTag = (a, b, { positionTolerance, sharedOrigin = false } = {}) => {
  if (!Number.isFinite(positionTolerance) || positionTolerance < 0)
    return { tag: "void", ...gap("undeclared", { what: "positionTolerance", why: "closeness in normalized position is never a default" }) };
  if (sharedOrigin === true)
    return { tag: "void", ...gap("made_no_difference", { reason: "sides that share a literal origin are not independently corroborating each other — that is coreference/homology, not analogy; use nul's own identity/coref machinery instead" }) };
  if (!validSide(a) || !validSide(b))
    return { tag: "void", ...gap("empty_material", { reason: "each side needs a declared strength, a normalized position, and a stated corroboration" }) };

  const distance = Math.abs(a.position - b.position);
  if (distance > positionTolerance)
    return Object.freeze({ tag: "void", aligned: false, distance, ...gap("unstable", { reason: "the two sides share no comparable footing at this position tolerance" }) });

  if (a.strength === "weak" || b.strength === "weak")
    return Object.freeze({ tag: "void", aligned: true, distance, ...gap("degenerate_ground", { reason: "at least one side has nothing earned or held to compare" }) });

  const relMatch = relationalMatch(a, b);
  if (relMatch === false)
    return Object.freeze({ tag: "mereAppearance", aligned: true, distance, relationalMatch: false, strengthA: a.strength, strengthB: b.strength });

  const bothEarned = a.strength === "earned" && b.strength === "earned";
  const bothCorroborated = a.corroborated === true && b.corroborated === true;

  if (bothEarned && bothCorroborated)
    return Object.freeze({ tag: "identity", aligned: true, distance, relationalMatch: relMatch, strengthA: a.strength, strengthB: b.strength, corroborated: true });

  if (bothEarned || bothCorroborated)
    return Object.freeze({ tag: "analogy", aligned: true, distance, relationalMatch: relMatch, strengthA: a.strength, strengthB: b.strength, corroborated: bothCorroborated });

  return Object.freeze({ tag: "nascent", aligned: true, distance, relationalMatch: relMatch, strengthA: a.strength, strengthB: b.strength, corroborated: false });
};

const CAREER_MODES = Object.freeze(["comparison", "categorized"]);

/**
 * career(history, { minObservations }) — Bowdle & Gentner's (2005) "Career
 * of Metaphor": a live comparison and a categorized (standing, reusable)
 * correspondence are the SAME relation at different points in repeated
 * re-observation, not two kinds of correspondence chosen at creation time.
 * `history` is a sequence of past crossModalTag() results for the SAME
 * tracked (a, b) locus over independent re-observations (different
 * reseeds, different re-readings) — never one call's internal state, since
 * a career is what happens ACROSS observations.
 *
 * "categorized" requires `minObservations` (declared, never defaulted —
 * how much re-observation earns categorization is not this module's call
 * to assume) consecutive identity/analogy tags at the END of the history.
 * One contradicting observation (void, mereAppearance, or a gap in
 * between) resets the streak to zero — categorization is earned by
 * UNBROKEN consistent re-observation, matching Bowdle & Gentner's own
 * account of conventionalization, not by a majority vote over a noisy
 * history.
 */
export const career = (history, { minObservations } = {}) => {
  if (!Number.isInteger(minObservations) || minObservations < 1)
    return { mode: "comparison", ...gap("undeclared", { what: "minObservations", why: "how much re-observation earns categorization is never a default" }) };
  if (!Array.isArray(history))
    return { mode: "comparison", ...gap("empty_material", { reason: "a career needs a history array, even an empty one" }) };
  if (history.length === 0) return Object.freeze({ mode: "comparison", streak: 0, of: 0 });

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i]?.tag;
    if (t === "identity" || t === "analogy") streak++;
    else break;
  }
  return Object.freeze({ mode: streak >= minObservations ? "categorized" : "comparison", streak, of: history.length });
};

export { CAREER_MODES };
