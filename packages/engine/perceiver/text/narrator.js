// eoreader6 · perceiver/text/narrator — who is "I" here?
//
// The one pronoun whose referent is a function of WHO IS HOLDING THE PEN
// rather than of the token itself. Frankenstein is a frame narrative:
// Walton > Victor > Creature. Every "I" inside the creature's tale is the
// creature; the same three letters elsewhere are Victor or Walton. No amount
// of reading the string can settle that.
//
// So it is RECEIVED. eoPriors coref priors carry `narratorSpans` as ANCHOR
// QUOTES — not offsets, because raw offsets rot the moment whitespace or an
// edition changes, and an exact-string match breaks on line wraps. Anchors
// are resolved at apply time against whitespace-collapsed text, which is
// eoreader5's `presence.js::resolveSpans` discipline, ported.
//
// This is the nameless-referent principle applied to the hardest case: a
// surface whose referent is fixed by SCOPE. Outside a known span the answer
// is a typed gap, never a guess — attributing the creature's murder of
// William to Victor is exactly the failure `def/attribution.js` exists to
// catch, and it is one silent fallback away.

const FIRST_PERSON = /^(i|me|my|mine|myself|we|us|our|ours)$/i;

/** Collapse whitespace, keeping a map back to raw offsets. */
const collapse = (text) => {
  let out = "";
  const map = [];
  let inRun = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      if (!inRun) { out += " "; map.push(i); inRun = true; }
    } else {
      out += c; map.push(i); inRun = false;
    }
  }
  return { collapsed: out, map };
};

/**
 * Resolve a prior's anchor-quoted narrator spans to real character ranges.
 * An anchor that cannot be found is reported, never silently dropped: a span
 * that failed to resolve means a stretch of text whose narrator we believed
 * we knew and now do not.
 */
export const resolveNarratorSpans = (text, referentId, spans) => {
  const { collapsed, map } = collapse(text);
  const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

  const resolved = [];
  const unresolved = [];

  for (const span of spans ?? []) {
    const fromIdx = span.fromAnchor ? collapsed.indexOf(norm(span.fromAnchor)) : 0;
    const toIdx = span.toAnchor ? collapsed.indexOf(norm(span.toAnchor)) : collapsed.length;
    if (fromIdx === -1 || toIdx === -1) {
      unresolved.push({ span, reason: fromIdx === -1 ? "fromAnchor not found" : "toAnchor not found" });
      continue;
    }
    const from = map[fromIdx] ?? 0;
    const to = map[Math.min(toIdx, map.length - 1)] ?? text.length;
    if (to <= from) { unresolved.push({ span, reason: "toAnchor precedes fromAnchor" }); continue; }
    resolved.push({ referentId, from, to });
  }

  return { resolved, unresolved };
};

export const isFirstPerson = (surface) => FIRST_PERSON.test(String(surface ?? "").trim());

/**
 * Who does this first-person surface point at, at this offset?
 * Returns a referent id, or a typed gap when no span covers the position —
 * "some narrator, and the prior does not say which."
 */
export const narratorAt = (offset, resolvedSpans) => {
  for (const s of resolvedSpans) if (offset >= s.from && offset < s.to) return { referentId: s.referentId };
  return {
    gap: {
      reason: "narrator_unknown_at_offset",
      tier: "model",
      needsWitness: true,
      offset,
      detail: "a first-person surface outside every known narrator span; which speaker holds the pen here is not derivable",
    },
  };
};
