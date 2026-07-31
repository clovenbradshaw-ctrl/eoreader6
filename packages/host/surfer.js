// eoreader6 · packages/host/surfer — the no-model NL-prompt surfer.
//
// A reader says what they want in words and the surfer does it: snips the
// segment the words address. No model, no statistics, no clock — the prompt
// is addressed to the corpus mechanically, and whatever cannot be addressed
// is a typed gap, never a guess.
//
// WHERE THIS LIVES, AND WHY (eo-constitution, oracle claim surfer-snip-host):
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
import { sessionSegments, snipSegment, snipRange } from "./corpus.js";

// The cell this host organ occupies on the operator grid (engine/operators.js):
// SEG · Field · Clearing — the addressed reach-unit cut out of the arena, the
// app's default verb (no verb named ⇒ SEG · snip). Declared, checked by
// conformance.
export const CELL = Object.freeze({ op: "SEG", grain: "Ground" });

const tokenize = (s) => String(s ?? "").toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
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
// prompt did not name (the fan to all) keeps the whole prompt.
const scopeForTarget = (prompt, doc, namedDocs) => {
  if (!namedDocs.includes(doc)) return prompt;
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
const contentAddress = (prompt, idx) => {
  const toks = tokenize(prompt);
  if (toks.length === 0) return null;
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < idx.lines.length; i++) {
    const line = idx.lines[i].toLowerCase();
    let matched = 0;
    for (const t of toks) if (line.includes(t)) matched++;
    const score = matched / toks.length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  if (bestScore === 0) return null;
  return { line: best, score: bestScore, anchor: idx.starts[best], addressed_by: "content" };
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
  if (results.length === 1) return { ...results[0], operator: operator.op, verb: operator.verb };

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
    found: !range.window,
    windowed: Boolean(range.window),
    prompt: text,
  };
}
