// eoreader6 · perceiver/text/relations — SVO extraction from prose.
//
// MEDIUM-SPECIFIC BY CONSTRUCTION, and that is why it lives in the perceiver.
// The organ above it (emergence/graph.js) consumes (subject, verb, object,
// polarity) triples and never learns where they came from — a video
// perceiver would supply its own triples from actor-action-target and the
// graph would not change a line.
//
// THE VOCABULARY IS DERIVED, NEVER TYPED IN. This file used to carry a
// 90-word hand-listed English verb string (`married|fought|led|wrote|...`),
// and that list was the whole terrain's bottleneck: every triple the graph
// ever saw was gated on a literal match against it, so any English prose
// that didn't happen to use one of those 90 words produced zero triples —
// zero nodes, zero edges, no Network, nothing for `induceKinds` to induce a
// Kind from. MEASURED on a civic-prose passage using ordinary verbs the list
// omitted (praised, approved, filed, briefed, lobbied, summoned): 0 triples.
// Rewriting the same sentences with verbs the list happened to contain
// (told, gave, found, knew, saw) produced a full graph. The list was not a
// simplification of English, it was a sample of it standing in for the
// whole, and every terrain built on CON·Link inherited that sample's edges.
//
// `discoverRelationVocab` replaces the list with a measurement: a candidate
// verb is the token immediately FOLLOWING a candidate referent surface
// (perceiver/text/surfaces.js::extractSurfaces — the SAME blind, capitalised-
// run detector every other organ in this ladder already uses to find the
// cast) — the slot SVO order puts a verb in, with the surface standing as
// the clause's subject. Admitted only if it is not itself capitalised (not a
// surface), not a bare number, and not a member of this text's own closed
// class (material.js::functionWordSet, Zipf-derived, no stopword list).
//
// TWO SHAPES WERE MEASURED AND ONE WAS REFUSED. The first attempt anchored on
// BOTH ends — the token strictly BETWEEN two surfaces — matching the shape a
// hand-verb-list would have matched. On Frankenstein (64 blind referents,
// 1,031 surface occurrences in ~78k words) it found *six* candidates in the
// whole novel: name-dense civic prose (the case this design was first argued
// from) has a named object in most clauses; a first-person novel does not —
// objects are pronouns, which this ladder cannot yet resolve to a referent
// (surfaces.js's own documented model-tier gap). Anchoring on ONE end — what
// immediately follows a surface acting as subject — needs no object-side
// referent and found 165 candidates, 33 of them recurring across ≥2 DISTINCT
// surfaces: entered, went, came, appeared, became, nursed, shone, spent, saw,
// spoke, seemed, soothed, desired among them, alongside residual noise
// (auxiliaries and prepositions the Zipf threshold didn't catch at this
// book's size — `were`, `could`, `from` — the same tuning tension
// material.js's own DEFAULT_RELEVANCE_THRESHOLD comment already names).
// Anchoring on the token BEFORE a surface was tried too and refused: it
// mixes true object-final verbs with premodifying epithets ("dear
// Elizabeth", "poor Justine") that recur next to many names for reasons that
// have nothing to do with being a relation.
//
// `minSurfaces` applies the same recurrence discipline
// `referents/entity.js::admitEntity` applies to a being: a candidate seen
// after only ONE surface scored well once; one seen after several DIFFERENT
// surfaces recurs, and only a recurring difference is testimony (SEED.md,
// "the unit of record").
//
// This is still a heuristic, and still declared as such. It will not
// fabricate: no triple is emitted without a literal match against the
// vocabulary it was handed, and a caller that hands in no vocabulary gets no
// triples back, never a guessed one.
//
// NEGATION MARKERS ARE NOT IN SCOPE HERE. "not", "never", "didn't" and the
// rest are a small closed grammatical category, the same tier as narrator.js's
// FIRST_PERSON pronoun set or surfaces.js's Roman-numeral grammar — a
// received fact about a language's function words, not an open-class
// semantic list standing in for content the text should be measured for.
// Amendment V says this directly: such a set "is a received prior with a
// named giver... not a set mined from the material." What was mined out
// above is the open class (verbs), which has no such standing.
//
//   · POLARITY IS READ, NEVER ASSERTED. "never married" and "did not love"
//     are negative relations, not absent ones. Defaulting to affirmative
//     would fabricate the most consequential bit in the triple.
//
// The extraction is heuristic and declared as such. It will not fabricate:
// no triple is emitted without a literal verb match in the clause.

import { diaNorm } from "./surfaces.js";

// The cell this organ occupies on the operator grid (engine/operators.js):
// CON · Link · Binding — subject · verb · object triples; the graph's
// medium-specific mouth. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "CON", grain: "Figure" });

// A received closed class (Amendment V: a small set of function words is a
// named prior, not content mined from the material — the same tier as
// narrator.js's FIRST_PERSON or surfaces.js's Roman-numeral grammar). Held
// as a Set so discoverRelationVocab can refuse to admit "never" as a verb —
// measured on Frankenstein at minSurfaces=1: it followed a surface once and
// nothing here knew to say no.
const NEGATION_WORDS = new Set(["not", "never", "hardly", "scarcely", "neither", "nor", "didn't", "don't", "doesn't", "wouldn't", "couldn't", "shouldn't", "won't", "can't", "cannot"]);
const NEGATION_BEFORE_VERB = new RegExp(`\\b(?:${[...NEGATION_WORDS].join("|")}|no longer)\\s+(?:\\w+\\s+){0,2}$`, "i");

// Unicode-aware: translated prose is full of accented names (Natásha, Hélène)
// that ASCII \w silently truncates mid-name.
const W = "[\\p{L}\\p{N}_'’]+";
const TOKEN_STRIP = /^[^\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+$/gu;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The text's own relation vocabulary — measured, not typed in.
 *
 * `surfaces` is whatever perceiver/text/surfaces.js::extractSurfaces already
 * found blind (an array of `{surface}` or a plain iterable of surface
 * strings) — the same candidate cast every referent-gated reader in this
 * ladder builds before it ever calls this organ, so nothing new is asked of
 * a caller that already runs the ladder in order (SIG before CON;
 * operators.js::OPERATOR_ORDER).
 *
 * A candidate is the token immediately following a surface occurrence — at
 * most a few characters of whitespace away, never crossing a clause break
 * (a comma, a full stop, a quote mark ends the run of letters this reads, so
 * "Victor. Elizabeth" or "Victor, who" both find no candidate there, exactly
 * as intended). It is admitted to the vocabulary only if:
 *
 *   · it is not itself capitalised — a capitalised token there is shaped
 *     like a surface, not a verb ("Victor AND Elizabeth" excluded by case,
 *     not by a conjunction list);
 *   · it is not a bare number;
 *   · it is not a member of `functionWords` — this text's own Zipf-derived
 *     closed class (material.js::functionWordSet). Omit `functionWords` and
 *     this filter simply does not run, same discipline as
 *     surfaces.js::extractSurfaces;
 *   · it follows at least `minSurfaces` DISTINCT surfaces. `minSurfaces` is
 *     declared by the caller, never defaulted here, for the same reason
 *     `referents/entity.js`'s `minArrivals` is never defaulted: how much
 *     recurrence makes a pattern rather than a coincidence is a property of
 *     the reading, not a constant this file gets to assume for every
 *     caller's material.
 *
 * Returns `{ verbs, candidates }`. `candidates` is every token that followed
 * at least one surface, ranked by how many distinct surfaces it followed,
 * kept so a caller can inspect what the gate let through and what it
 * refused — a gap is a result, and so is the sorted list around a threshold.
 */
export const discoverRelationVocab = (text, { surfaces, functionWords = null, minSurfaces } = {}) => {
  if (!Number.isInteger(minSurfaces) || minSurfaces < 1)
    throw new TypeError("discoverRelationVocab: minSurfaces is declared — how much recurrence counts as a pattern is the caller's to say, never a default here");

  const s = String(text ?? "");
  const names = [...(surfaces ?? [])]
    .map((x) => (typeof x === "string" ? x : x?.surface))
    .filter((x) => typeof x === "string" && x.length > 0);
  const uniqueNames = [...new Set(names)].sort((a, b) => b.length - a.length);
  if (!uniqueNames.length) return { verbs: new Set(), candidates: [] };

  // Longest-first alternation, same discipline as read-people.mjs's
  // surfaceToId: "Victor Frankenstein" must win over "Victor" at the same
  // start offset, or the shorter surface eats half the longer one's hits.
  const SURFACE_RE = new RegExp(`\\b(?:${uniqueNames.map(escapeRe).join("|")})\\b`, "gu");
  const AFTER = /^\s*([\p{L}\p{N}'’]+)/u;

  const surfacesByToken = new Map(); // lowercase token -> Set(surfaces it directly followed)
  let m;
  while ((m = SURFACE_RE.exec(s)) !== null) {
    const end = m.index + m[0].length;
    const after = s.slice(end, end + 40).match(AFTER);
    if (!after) continue;

    const cleaned = after[1].replace(TOKEN_STRIP, "");
    if (!cleaned) continue;
    if (/^\p{Lu}/u.test(cleaned)) continue;       // capitalised — shaped like a surface, not a verb
    if (/^\p{Nd}+$/u.test(cleaned)) continue;     // a bare number, not a verb
    const lower = cleaned.toLowerCase();
    if (functionWords && functionWords.has(lower)) continue; // this text's own closed class
    if (NEGATION_WORDS.has(lower)) continue; // a negation marker modifies a verb; it is not one

    if (!surfacesByToken.has(lower)) surfacesByToken.set(lower, new Set());
    surfacesByToken.get(lower).add(diaNorm(m[0]));
  }

  const verbs = new Set();
  const candidates = [];
  for (const [token, seenAfter] of surfacesByToken) {
    candidates.push({ verb: token, surfaces: seenAfter.size });
    if (seenAfter.size >= minSurfaces) verbs.add(token);
  }
  candidates.sort((x, y) => y.surfaces - x.surfaces);

  return { verbs, candidates };
};

/**
 * Triples stated in one passage, against a vocabulary the caller measured
 * (`discoverRelationVocab`, or any other named Set — the mouth does not care
 * where a Set came from, only that nothing is matched that isn't in it).
 * `limit` defaults to Infinity: that cap is a display concern, and silently
 * dropping relations before the graph has seen them would make the belief
 * structure a function of a presentation default.
 *
 * No `verbs`, or an empty one, yields no triples — never a guessed match.
 * That is the same refusal every organ in this repo makes when handed no
 * ground to perceive through: the honest answer to "what did this passage
 * say" before a vocabulary exists to hear it with is nothing, not a fallback
 * dictionary.
 */
export const extractRelations = (text, { verbs, limit = Infinity } = {}) => {
  const vocab = verbs instanceof Set ? verbs : new Set(verbs ?? []);
  if (vocab.size === 0) return [];

  const VERB_ALT = [...vocab].map(escapeRe).join("|");
  const MATCHER = new RegExp(`(?<=^|[^\\p{L}])(${W}(?:\\s+${W})?)\\s+(${VERB_ALT})\\s+(.+?)(?:\\.|,|;|$)`, "giu");
  const SPLITTER = new RegExp(`^(.+?)\\s+(${VERB_ALT})\\s+(.+?)$`, "iu");

  const rels = [];
  const seen = new Set();
  const s = String(text ?? "");
  let m;

  while ((m = MATCHER.exec(s)) !== null) {
    const parts = m[0].match(SPLITTER);
    if (!parts) continue;
    const subject = parts[1].trim();
    const verb = parts[2].trim().toLowerCase();
    const object = parts[3].trim().replace(/[.,;]$/, "");
    if (!subject || !object) continue;

    const key = `${subject}|${verb}|${object}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const before = s.slice(Math.max(0, m.index - 40), m.index + parts[1].length + 1);
    rels.push({
      subject,
      verb,
      object,
      polarity: NEGATION_BEFORE_VERB.test(before) ? "-" : "+",
    });
    if (rels.length >= limit) break;
  }

  return rels;
};
