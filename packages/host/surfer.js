// eoreader6 · packages/host/surfer — the no-model NL-prompt surfer.
//
// A reader says what they want in words and the surfer does it: snips the
// segment the words address. No model, no statistics, no clock — the prompt
// is addressed to the corpus mechanically, and whatever cannot be addressed
// is a typed gap, never a guess.
//
// WHERE THIS LIVES, AND WHY (eo-constitution, assay claim surfer-snip-host):
// this is app-tier. It owns the session, the prompt-as-interface, and the
// byte I/O that turns a byte range into text a reader can experience. It
// measures nothing about the material itself — every measurement is the
// engine's, imported whole from perceiver/text/segments.js and host/corpus.js.
//
// THE ADDRESS LADDER, re-earned from eoreader-chat's engineReadSegment and
// the mcp snip tool:
//
//   1. SOURCE — one document is the corpus; several need the prompt to say
//      which. A prompt that names a document narrows the field to the names;
//      a prompt that names none is NOT a guess about which — it is an address
//      to ALL of them, and the surfer fans the act out across the corpus. The
//      old rung stopped at a `no_source_addressed` typed gap; that gap was
//      the engine asking "which document?" and the answer — everywhere — is
//      what a fan delivers. Two names named is two targets, not ambiguity:
//      `ambiguous_source` was the same gate with the answer already in the
//      prompt.
//
//   2. HEADING — if the prompt addresses a boundary by form ("chapter 2",
//      "letter 1", "movement 3"), that segment is snipped. Numeral forms
//      convert across arabic/roman ("chapter 18" finds "CHAPTER XVIII");
//      surrounding words ("snip chapter 2 of the book") are the reader's,
//      not the address. Two headings addressed at once is ambiguity, typed.
//
//   3. CONTENT — no heading addressed: the prompt's substantive tokens are
//      matched against the lines, and the best-scoring line is the anchor.
//      The segment bracketing it is what the surfer returns — the structural
//      cluster around the passage the reader described.
//
//   4. WINDOW, never fabrication. A passage with no structural boundary in
//      reach returns the raw context window, labelled as one, or a typed gap
//      — never a chapter name invented for the occasion.
//
// THE OPERATOR GRID (engine/operators.js): every act of the app is one of the
// nine operators, aimed at some target at some holonic height. The surfer's
// act is SEG · snip — the addressed reach-unit cut out of the arena, byte-
// accurate — and this file is the target dimension of that grid: the act is
// aimed at every target the prompt names, or at the whole corpus when it
// names none, and each fan entry lands at the ladder rung it reached. The
// verb dimension (the nine operators and their organs) is declared in
// engine/operators.js and fired by the loops; the surfer does not pretend to
// run an EVA or DEF organ it has not — a prompt's English verb is content,
// and the surfer is mechanical.
//
// The ladder is host because the prompt is a surface: a leitmotif in a
// symphony does not arrive by English words. What the engine refuses to do
// (understand "the second chapter" — an English ordinal) the surfer does not
// paper over either; that word falls through to the content phase, where it
// is matched as a token or missed as a typed gap.

import { OPERATORS } from "../engine/operators.js";
import { headingsMatch } from "../engine/perceiver/text/segments.js";
import { diaNorm } from "../engine/perceiver/text/surfaces.js";
import { sessionSegments, snipSegment, snipRange } from "./corpus.js";

// The cell this host organ occupies on the operator grid (engine/operators.js):
// SEG · Field · Clearing — the addressed reach-unit cut out of the arena, the
// app's default verb (no verb named ⇒ SEG · snip). Declared, checked by
// conformance.
export const CELL = Object.freeze({ op: "SEG", grain: "Ground" });

// The n-gram pass is computed only for this many top-lexical lines: the
// signal reorders near-equals, so the shortlist cap bounds the cost without
// changing what the gate admits.
const CONTENT_SHORTLIST_CAP = 40;

// A token is a run of 4+ letters/digits, folded through the canonical single-
// pass diacritic map (diaNorm — never a third map). The 4-char floor keeps a
// distinctive word while refusing what is not a word: "oak" alone is not
// distinctive enough to address anything, and an un-segmented glyph run like
// "第二回" is not a token either — treating a CJK run as one word is a value
// claim that belongs in eoPriors, and the golden pins that address as a typed
// gap until a segmentation prior lands.
const tokenize = (s) => diaNorm(s).match(/[\p{L}\p{N}]{4,}/gu) ?? [];

// ── n-gram signal, re-earned from specs/mechanical-retrieval-theory.md ──────
// eoreader5 beat ColBERT on surface-form robustness with character-trigram
// profiles, and its typo arithmetic is calibrated at n=3 ("a typo changes at
// most 3 trigrams per character"; >50% retention keeps the rank). A wider
// range was measured and reverted: {2..4}, {2..5}, and {4..4} change no
// outcome on the 11 content-path golden cases, the three War-and-Peace
// paragraph snips, or their single-typo variants (a dropped letter in a short
// word like "sappy" still lands under pure trigrams) — the trigram is
// sufficient, so the anchor is kept. Both sides get the same transform, so a
// query and a line that share a phrase share its grams even when one has a
// wrong letter or a dropped accent.
const nGramProfile = (text, { minN = 3, maxN = 3 } = {}) => {
  const t = String(text ?? "").toLowerCase();
  const counts = new Map();
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i + n <= t.length; i++) {
      const key = `${n}:${t.slice(i, i + n)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
};

// Query containment: the line's grams restricted to the query's support,
// each capped at the query's own count, cosine against the query. This asks
// "how much of what I asked for is in the line" and is immune to both line
// length and repetition: a line that contains the phrase verbatim scores ~1
// no matter how long it is, a line with only half the query's grams scores
// proportionally, and a line that repeats a common letter pattern ("th", "he")
// does not get extra credit for it. A plain whole-line cosine would be
// diluted by a long line's unrelated content and would hand the tie to the
// shorter line (measured: "the regression analysis" flipping to "3. Results").
const queryContainment = (query, line) => {
  let dot = 0;
  let nq = 0;
  let nl = 0;
  for (const [k, qv] of query) {
    nq += qv * qv;
    const lv = line.get(k);
    if (!lv) continue;
    const capped = Math.min(lv, qv);
    dot += qv * capped;
    nl += capped * capped;
  }
  return nq && nl ? dot / (Math.sqrt(nq) * Math.sqrt(nl)) : 0;
};

const baseName = (id) =>
  String(id ?? "")
    .split(":")
    .pop()
    .split(/[/\\]/)
    .pop()
    .replace(/\.(txt|md|html?|json|csv)$/i, "");

// 1. SOURCE — the documents the prompt addresses. A named document narrows
// the field to the names (one name is a single target, several are several);
// silence addresses every document in the corpus. A prompt that names nothing
// is not a guess about which — it is an address to all of them.
const resolveTargets = (session, prompt) => {
  const docs = Array.from(session.documents.values());
  if (docs.length === 0) return { error: "no_source", reason: "the corpus is empty" };

  const lower = String(prompt ?? "").toLowerCase();
  const hits = docs.filter((d) => lower.includes(baseName(d.id).toLowerCase()));
  return { targets: hits.length > 0 ? hits : docs, named: hits };
};

// When a prompt names several documents, each target is addressed by the
// clause that names it — the other documents' addresses must not bleed into
// this one's heading match ("chapter 2 of pg84 and chapter 1 of pg1342" is
// two targets with two addresses, not one ambiguous address). A document the
// prompt did not name (the fan to all) keeps the whole prompt, and a single
// named document keeps the whole prompt too — its prose is one address, not
// a clause to be split ("...that Genoa and Lucca are family estates of the
// Buonapartes" is one thought, and splitting on "and" would mangle it).
const scopeForTarget = (prompt, doc, namedDocs) => {
  if (!namedDocs.includes(doc)) return prompt;
  if (namedDocs.length === 1) return prompt;
  const clauses = String(prompt).split(/\s+and\s+/i).map((s) => s.trim());
  const name = baseName(doc.id).toLowerCase();
  return clauses.find((c) => c.toLowerCase().includes(name)) ?? prompt;
};

// 2. HEADING — addresses of boundaries by form, mechanically.
const headingAddress = (prompt, outline) => {
  const matches = (outline.headings || []).filter((h) => headingsMatch(prompt, h.label));
  if (matches.length === 1) {
    const h = matches[0];
    return { heading: h, anchor: h.bodyStart, addressed_by: "heading", label: h.label };
  }
  if (matches.length > 1) {
    return {
      error: "ambiguous_address",
      reason: `"${prompt}" addresses ${matches.length} segments (a flat outline cannot tell them apart): ${matches
        .slice(0, 5)
        .map((h) => `${h.label}@${h.start}`)
        .join(", ")}${matches.length > 5 ? ", …" : ""}`,
    };
  }
  return null;
};

// 3. CONTENT — the line the prompt's tokens best cover is the anchor.
//
// Re-earned, not ported, from the measured eoreader5 search lessons
// (packages/engine/search/index.js + specs/mechanical-retrieval-theory.md):
// the composition is lexical-coverage-led because signal-led ranking was
// measured to lose the verbatim phrase (top-1 7/14), and rarity weights exist
// because term COUNT is not evidence strength. Two passes:
//
//   PASS 1 — the evidence gate. A line with zero matched tokens has nothing
//   to say about the prompt, and the n-gram signal NEVER rescues it — silence
//   over fabrication, and measured in eoreader5: signal alone cannot separate
//   a genuine near-match from an absent term at this granularity.
//
//   PASS 2 — n-gram query containment, computed only for the lexical
//   shortlist. It can reorder near-equals (a typo, a diacritic, a shared
//   phrase), never admit.
//
//   score = coverage*0.6 + phrase*0.25 + ngram*0.15
const contentAddress = (prompt, idx) => {
  const toks = tokenize(prompt);
  if (toks.length === 0) return null;

  // Rarity weights over THIS document's lines (the index the surfer already
  // paid for): weight = log(1 + N / (1 + df)). A stopword is nearly free, a
  // rare word decisive. df is over diacritic-normalized lines, so "Pávlovna"
  // and "Pavlovna" are one term.
  const lines = idx.lines.map((l) => diaNorm(l));
  const n = Math.max(1, lines.length);
  const df = new Map();
  for (const t of toks) {
    let d = 0;
    for (const line of lines) if (line.includes(t)) d++;
    df.set(t, d);
  }
  const weight = (t) => Math.log(1 + n / (1 + (df.get(t) ?? 0)));
  const weights = new Map(toks.map((t) => [t, weight(t)]));

  const queryGrams = nGramProfile(diaNorm(prompt));

  const shortlist = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matchedW = 0;
    let totalW = 0;
    let matched = 0;
    for (const t of toks) {
      const w = weights.get(t);
      totalW += w;
      if (line.includes(t)) {
        matchedW += w;
        matched++;
      }
    }
    if (matched === 0) continue; // the evidence gate

    // Longest contiguous run of query tokens present in the line — the
    // strongest evidence short of an exact span: when the reader's words
    // appear contiguously, the line contains the thing asked for.
    let phrase = 0;
    for (let len = toks.length; len >= 2 && phrase === 0; len--) {
      for (let s = 0; s + len <= toks.length; s++) {
        if (line.includes(toks.slice(s, s + len).join(" "))) {
          phrase = len / toks.length;
          break;
        }
      }
    }

    const coverage = totalW > 0 ? matchedW / totalW : 0;
    shortlist.push({ i, coverage, phrase, lexical: coverage * 0.6 + phrase * 0.25 });
  }
  if (shortlist.length === 0) return null;

  shortlist.sort((a, b) => b.lexical - a.lexical || a.i - b.i);
  const candidates = shortlist.slice(0, CONTENT_SHORTLIST_CAP);

  let best = -1;
  let bestScore = 0;
  let bestMatch = null;
  for (const c of candidates) {
    const ngram = queryContainment(queryGrams, nGramProfile(lines[c.i]));
    const score = c.coverage * 0.6 + c.phrase * 0.25 + ngram * 0.15;
    // Only a clear margin flips the winner: the n-gram signal reorders
    // near-equals, but two lines that each contain the query's phrase are
    // equal evidence, and the earlier line wins — determinism over noise.
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = c.i;
      bestMatch = { coverage: c.coverage, phrase: c.phrase, ngram, score };
    }
  }
  if (best === -1) return null;
  return { line: best, score: bestScore, anchor: idx.starts[best], addressed_by: "content", match: bestMatch };
};

// RESOLUTION — the anchor is located against the whole outline, not a
// radius-limited local window: the outline is the navigable index the surfer
// already paid for, and a chapter far longer than the local reach must still
// hold the passage it contains. An anchor before the first heading is the
// preamble, answered as a context window; a source with no structure at all
// misses and falls back to the raw reach.
const resolveRange = (outline, anchor) => {
  const hs = outline.headings || [];
  if (hs.length === 0) return { miss: true };
  let lo = 0;
  let hi = hs.length - 1;
  let hit = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (hs[mid].start <= anchor) { hit = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  if (hit === -1) {
    return { window: { start: 0, end: hs[0].start, label: "(context window — no heading precedes this passage)" } };
  }
  return { h: hs[hit] };
};

// The one entry point: execute a natural-language prompt against the session
// corpus and snip the segment it addresses. No model anywhere in the path.
export function executePrompt(session, prompt, { sourceFilter, radius } = {}) {
  const text = String(prompt ?? "").trim();
  if (!text) return { gap: "empty_prompt", reason: "a prompt with no words addresses nothing" };

  let targets;
  let named = [];
  if (sourceFilter) {
    const hit = Array.from(session.documents.values()).find(
      (d) => d.id === sourceFilter || baseName(d.id).toLowerCase() === sourceFilter.toLowerCase(),
    );
    if (!hit) return { gap: "no_source", reason: `no document matches "${sourceFilter}"` };
    targets = [hit];
  } else {
    const resolved = resolveTargets(session, text);
    if (resolved.error) return { gap: resolved.error, reason: resolved.reason };
    targets = resolved.targets;
    named = resolved.named;
  }

  const results = targets.map((doc) =>
    addressDoc(session, scopeForTarget(text, doc, named), doc, { radius }),
  );

  const operator = OPERATORS.SEG;
  if (results.length === 1) return { ...results[0], operator: operator.op, verb: operator.verb, prompt: text };

  // The fan: the act is aimed at every target at the height each one reached.
  // Each entry is a snip or a typed gap — a document the prompt could not
  // address is reported, never silently dropped.
  return {
    fan: results,
    operator: operator.op,
    verb: operator.verb,
    prompt: text,
    fan_to: results.length,
  };
}

// Address the prompt inside one document: the whole ladder, one target.
const addressDoc = (session, text, doc, { radius } = {}) => {
  const outline = sessionSegments(session, { sourceId: doc.id });
  if (outline.error) return { gap: "no_source", reason: outline.error };

  const addr = headingAddress(text, outline);
  if (addr?.error) return { gap: addr.error, reason: addr.reason };

  let anchor;
  let addressed_by;
  let content = null;
  if (addr) {
    anchor = addr.anchor;
    addressed_by = "heading";
  } else {
    content = contentAddress(text, outline.idx);
    if (!content) {
      return {
        gap: "content_not_found",
        reason: `no heading nor any line in ${baseName(doc.id)} matches "${text}"`,
      };
    }
    anchor = content.anchor;
    addressed_by = "content";
  }

  const range = resolveRange(outline, anchor);
  if (range.miss) {
    // No structure ANYWHERE in the source, per the outline — the navigable
    // index this organ already paid for. The fallback is a raw context window
    // around the anchor, honestly labelled — NEVER a local boundary pulled out
    // of the reach by form alone: the outline's substance gate already
    // refused it, and resurrecting it here would be the same listing-as-
    // structure false permanency the engine exists to refuse.
    const total = outline.idx?.total ?? 0;
    const r = Math.min(radius ?? 6000, Math.max(600, total >> 2));
    const from = Math.max(0, anchor - r);
    const to = Math.min(total, anchor + r);
    const snip = snipRange(session, {
      sourceId: doc.id,
      start: from,
      end: to,
      prompt: text,
      label: "(no structural boundary detected — context window)",
    });
    return {
      ...snip,
      source_id: doc.id,
      source: baseName(doc.id),
      gap: "no_structural_boundary_in_reach",
      reason: "the source's structure does not reach this passage — returned as a context window, not an invented chapter",
      addressed_by,
      heading: null,
      content_line: content?.line ?? null,
      content_match: content?.match ?? null,
      found: false,
      windowed: true,
      prompt: text,
    };
  }

  const r = range.window ?? range.h;
  const snip = snipRange(session, {
    sourceId: doc.id,
    start: r.start,
    end: r.end,
    prompt: text,
    label: r.label,
  });

  return {
    ...snip,
    source_id: doc.id,
    source: baseName(doc.id),
    addressed_by,
    heading: range.window ? null : range.h.label,
    content_line: content?.line ?? null,
    content_match: content?.match ?? null,
    found: !range.window,
    windowed: Boolean(range.window),
    prompt: text,
  };
}
