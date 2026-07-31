// eoreader6 · perceiver/text/relations — SVO extraction from English prose.
//
// MEDIUM-SPECIFIC BY CONSTRUCTION, and that is why it lives in the perceiver.
// An English verb list, English negation markers, Latin-script word shapes:
// none of this means anything for a leitmotif or a shot sequence. The organ
// above it (emergence/graph.js) consumes (subject, verb, object, polarity)
// triples and never learns where they came from — a video perceiver would
// supply its own triples from actor-action-target and the graph would not
// change a line.
//
// Ported from eoreader5's perceiver/text/extraction.js, which earned it. Two
// things there are load-bearing and kept exactly:
//
//   · POLARITY IS READ, NEVER ASSERTED. "never married" and "did not love"
//     are negative relations, not absent ones. Defaulting to affirmative
//     would fabricate the most consequential bit in the triple.
//   · THE VERB LIST IS ONE LIST. eoreader5 records a second copy drifting
//     out of sync in another module; it is exported here for membership
//     testing so no consumer re-types it.
//
// The extraction is heuristic and declared as such. It will not fabricate:
// no triple is emitted without a literal verb match in the clause.

// The cell this organ occupies on the operator grid (engine/operators.js):
// CON · Link · Binding — subject · verb · object triples; the graph's
// medium-specific mouth. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "CON", grain: "Figure" });

export const RELATION_VERBS =
  "married|fought|led|wrote|built|destroyed|founded|ruled|served|worked|lived|died|born|moved|traveled|said|told|asked|gave|took|made|found|held|stood|sat|ran|walked|spoke|thought|knew|saw|heard|felt|wanted|needed|loved|hated|feared|hoped|believed|claimed|stated|argued|showed|proved|revealed|demonstrated|indicated|suggested|implied|meant|intended|planned|tried|attempted|managed|failed|succeeded|won|lost|beat|defeated|conquered|controlled|dominated|influenced|shaped|changed|transformed|developed|grew|improved|declined|fell|rose|increased|decreased|remained|stayed|became|turned|seemed|appeared|looked|sounded|tasted|smelled";

export const relationVerbSet = () => new Set(RELATION_VERBS.split("|"));

const NEGATION_BEFORE_VERB =
  /\b(?:not|never|no longer|hardly|scarcely|neither|nor|didn't|don't|doesn't|wouldn't|couldn't|shouldn't|won't|can't|cannot)\s+(?:\w+\s+){0,2}$/i;

// Unicode-aware: translated prose is full of accented names (Natásha, Hélène)
// that ASCII \w silently truncates mid-name.
const W = "[\\p{L}\\p{N}_'’]+";

const MATCHER = new RegExp(`(?<=^|[^\\p{L}])(${W}(?:\\s+${W})?)\\s+(${RELATION_VERBS})\\s+(.+?)(?:\\.|,|;|$)`, "giu");
const SPLITTER = new RegExp(`^(.+?)\\s+(${RELATION_VERBS})\\s+(.+?)$`, "iu");

/**
 * Triples stated in one passage. `limit` defaults to Infinity here rather
 * than eoreader5's 6: that cap is a display concern, and silently dropping
 * relations before the graph has seen them would make the belief structure a
 * function of a presentation default.
 */
export const extractRelations = (text, { limit = Infinity } = {}) => {
  const rels = [];
  const seen = new Set();
  const s = String(text ?? "");
  MATCHER.lastIndex = 0;
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
