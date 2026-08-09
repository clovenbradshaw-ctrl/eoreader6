// eoreader6 · modifier-order — does a stack of modifiers nest by a received
// rank, or does it invert it?
//
// "The fat black cat" is well-formed and "the black fat cat" is not, in
// English, for a reason no lexicon of English adjectives states: modifiers
// closer to the head classify a narrower kind (color, origin, material —
// SEG on Kind, a boundary drawn tighter); modifiers farther from the head
// evaluate the kind once it is already settled (opinion, size-as-judgment —
// SIG/EVA layered on top). The claim that generalizes across languages is
// the RANK — how classifying vs. evaluative a modifier class is — not the
// SIDE of the head it falls on. Prenominal languages linearize far-to-near
// left-to-right; postnominal languages linearize near-to-far right-to-left.
// Same nesting, mirrored direction.
//
// Per CONSTITUTION.md II.2 (the giver test), which class a real-world word
// belongs to, and which direction a given language linearizes, is material
// knowledge — witness knowledge about a lexicon or a language — and must be
// received with a named giver. This organ never derives either. It receives
// a `typology` (class -> rank, a `direction`, and a `giver`) and a sequence
// of already-classified modifier tags, and answers one purely structural
// question: does this sequence's rank order nest monotonically toward the
// head, or does it invert somewhere?
//
// Per II.8 (no cheap compatibility): "how close is this modifier to the
// head" is never a cosine or embedding distance here. Rank is a received
// ordinal, not a learned or measured similarity.
//
// Per II.13 (the script earning test): the mechanism below is checked
// against tags, never against words, spellings, or scripts — it cannot see
// Latin, Cyrillic, or CJK, only the class labels a receiver already
// assigned. conformance/modifier-order.test.js carries the cross-script
// invariance fixture this earns rather than asserts: the same typology and
// the same rank pattern, spelled in an unrelated alphabet, must return the
// identical relation.
//
// This is not a Born-null organ. It makes no statistical claim about
// material and so does not pass through the holon gate (formation/
// holon_level) — it is a deterministic, type-checked structural check over
// received data, the same kind of module `provenance/index.js` is. Whether
// a given corpus's ATTESTED order is real (load-bearing) rather than free
// or pragmatic is a separate, genuinely statistical question, and belongs
// to `temporality` (see `corpusDirectionTest` below), not to this module.
//
// Per IV.3, a module nothing depends on is not early, it is refuted: this
// organ ships tested and receivable, but eoreader6 has no NL-to-modifier-tag
// ingestion path yet to wire it into. It is offered as a candidate, not
// claimed as a promoted one.
//
// Pure: no clock, no randomness, no I/O.

import { gap, isGap } from "../nul/index.js";
import { temporality } from "../temporality/index.js";

export const RELATIONS = Object.freeze(["nested", "inverted"]);
export const DIRECTIONS = Object.freeze(["pre", "post"]);

const isTag = (t) => t && typeof t.class === "string" && t.class.length > 0;

/**
 * A typology is received, never derived (II.2): a rank for every class this
 * sequence might use, a linearization direction for the language the
 * sequence was drawn from, and the giver who supplies both. A typology
 * missing its giver is a wall (II.2), not a gap-in-waiting.
 */
export const admissibleTypology = (typology) => {
  if (!typology || typeof typology !== "object")
    return gap("undeclared", { what: "typology", why: "class ranks are received, never assumed" });
  if (!typology.ranks || typeof typology.ranks !== "object" || Object.keys(typology.ranks).length === 0)
    return gap("undeclared", { what: "typology.ranks", why: "a class->rank table must be received" });
  if (!DIRECTIONS.includes(typology.direction))
    return gap("undeclared", {
      what: "typology.direction",
      why: "linearization side is received per-language, never assumed prenominal",
    });
  if (typeof typology.giver !== "string" || typology.giver.trim() === "")
    return gap("unreceived_origin", {
      reason: "a typology without a named giver is a wall, not a gap-in-waiting (II.2)",
    });
  return null;
};

/**
 * The structural question, and nothing else: reading from the head outward,
 * does rank stay non-decreasing (more classifying and nearer the head comes
 * first), or does some tag sit closer to the head than a more classifying
 * one already placed? `direction` only decides which end of the array is
 * "nearest the head": pre-nominal sequences read head-outward from the end
 * of the array back to the start, post-nominal sequences read head-outward
 * from the start. The rank invariant checked is identical either way — this
 * is the omnilingual part.
 */
export const order = (sequence, typology) => {
  const bad = admissibleTypology(typology);
  if (bad) return bad;

  if (!Array.isArray(sequence) || sequence.length === 0)
    return gap("empty_material", { sequence });
  if (!sequence.every(isTag))
    return gap("undeclared", { what: "sequence", why: "every tag needs a .class string" });

  const { ranks, direction, giver } = typology;
  const missing = sequence.map((t) => t.class).filter((c) => !(c in ranks));
  if (missing.length > 0)
    return gap("unknown_spec", { reason: "a class outside the received typology cannot be ranked", missing });

  const headOutward = direction === "pre" ? [...sequence].reverse() : sequence;

  let violation = null;
  for (let i = 1; i < headOutward.length; i++) {
    const prevRank = ranks[headOutward[i - 1].class];
    const curRank = ranks[headOutward[i].class];
    if (curRank < prevRank) {
      violation = Object.freeze({
        at: i,
        near: headOutward[i - 1].class,
        far: headOutward[i].class,
        why: `${headOutward[i].class} (rank ${curRank}) is more classifying than ${headOutward[i - 1].class} (rank ${prevRank}) but sits farther from the head, inverting the nesting`,
      });
      break;
    }
  }

  return Object.freeze({
    relation: violation ? "inverted" : "nested",
    direction,
    giver,
    headOutward: Object.freeze(headOutward.map((t) => t.class)),
    violation,
  });
};

/**
 * The bracket structure a "nested" sequence describes: each step wraps the
 * previous, innermost (nearest the head) first. Refuses on an inverted
 * sequence rather than building a tree that misdescribes it — a scope tree
 * for a sequence that does not nest is not a weaker tree, it is a wrong one.
 */
export const scopeTree = (sequence, typology, { head = "HEAD" } = {}) => {
  const o = order(sequence, typology);
  if (isGap(o)) return o;
  if (o.relation !== "nested")
    return gap("unstable", { reason: "a scope tree describes a nesting; this sequence inverts one", violation: o.violation });

  return o.headOutward.reduceRight(
    (inner, cls) => Object.freeze({ class: cls, scopes: inner }),
    Object.freeze({ class: head, scopes: null }),
  );
};

/**
 * A separate, genuinely statistical question: given an attested corpus of
 * rank sequences from one language (one numeric series per sentence's
 * modifier stack, already reduced to ranks by a received typology), is the
 * attested order load-bearing for that language (arrowed / reversible) or
 * is it exchangeable — free, and therefore carrying some other signal
 * (focus, givenness) instead of scope? This delegates to `temporality`
 * rather than re-deriving a shuffle test: the claim is the same shape
 * (is this index load-bearing, does it have a direction) that organ already
 * makes about any series.
 */
export const corpusDirectionTest = (rankSeries, { draws, window, seed = 0 } = {}) =>
  temporality({ material: rankSeries, draws, window, seed });
