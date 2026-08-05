import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalHashSync, CORPUS_API_VERSION } from "../spec/index.js";
import { createRegistry, register } from "../../provenance/index.js";
import { createSession as makeDiscourseSession } from "../../discourse/index.js";
import { lineIndex, outlineOfIndex, discoverSegment } from "../engine/perceiver/text/segments.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../engine/perceiver/text/material.js";
import { splitSentences, deriveAbbreviations, stripContainer } from "../engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../engine/perceiver/text/surfaces.js";
import { resolvePronouns } from "../engine/perceiver/text/pronouns.js";
import { projectReferents } from "../engine/referents/index.js";

// The cells this host organ occupies on the operator grid (engine/operators.js):
// INS · Void · Cultivating — material comes into being, admitted chunked by
// byte budget — CON · Field · Tending — a segment bound to its byte range —
// and SEG · Field · Clearing — the addressed reach-unit cut out byte-accurate
// (snip). Declared, checked by conformance.
export const CELLS = Object.freeze([
  Object.freeze({ op: "INS", grain: "Ground" }),
  Object.freeze({ op: "CON", grain: "Ground" }),
  Object.freeze({ op: "SEG", grain: "Ground" }),
]);

export { CORPUS_API_VERSION } from "../spec/index.js";

const DEFAULT_SPAN_CAP = 2000;
const CHUNK_SIZE = 2000;
const MIN_CHUNK_CHARS = 20;

// The operating point perceiver/text/pronouns.js::resolvePronouns is called
// at from this host. Declared HERE, not defaulted inside the engine organ
// (resolvePronouns throws without them, on the same standing entity.js's
// minArrivals and kind-void.js's draws/seed already hold) — but this pair of
// numbers is, honestly, the same standing as this file's own CHUNK_SIZE: an
// engineering starting point, not yet validated against a retrieval-quality
// golden. No such golden exists for pronoun binding in this repo today (the
// same gap surfaces.js's own header names). Moving these two numbers as one
// gets built is expected, not a regression.
const PRONOUN_MIN_ACTIVATION = 0.05;
const PRONOUN_MIN_MARGIN = 0.2;

const utf8 = new TextEncoder();
const utf8dec = new TextDecoder();

const byteLength = (text) => utf8.encode(text).length;

// A byte-accurate line index: starts are UTF-8 byte offsets into the source.
// The engine's boundary detection is unit-agnostic by contract, so the host
// hands it a byte index and the seams stay honest — slicing a string by byte
// offsets shifts every read past the first multi-byte character.
const byteIndex = (text) => {
  const lines = String(text ?? "").split("\n");
  const starts = new Array(lines.length);
  let at = 0;
  for (let i = 0; i < lines.length; i++) {
    starts[i] = at;
    at += byteLength(lines[i]) + (i + 1 < lines.length ? 1 : 0);
  }
  return { lines, starts, total: at, lengthOf: (line) => byteLength(line) };
};

const bufferOf = (text) => utf8.encode(text);

const bytesOf = (buf, start, end) =>
  utf8dec.decode(buf.subarray(start, Math.min(end, buf.length)));

export function createSession({ spanCap = DEFAULT_SPAN_CAP, engineVersion } = {}) {
  const discourse = makeDiscourseSession();
  return {
    apiVersion: CORPUS_API_VERSION,
    spans: new Map(),
    documents: new Map(),
    spanCap,
    engineVersion,
    discourse,
    provenance: createRegistry(),
    _bytes: new Map(),
  };
}

function chunkText(text, sourceId, session) {
  const chunks = [];
  const bytes = utf8.encode(text);
  let offset = 0;
  let chunkIndex = 0;

  while (offset < text.length) {
    const end = Math.min(offset + CHUNK_SIZE, text.length);
    const chunkText = text.slice(offset, end);
    if (chunkText.trim().length >= MIN_CHUNK_CHARS) {
      const chunkId = `${sourceId}:chunk-${chunkIndex}`;
      const byteStart = byteLength(text.slice(0, offset));
      const textBytes = byteLength(chunkText);
      const spanId = `span:${canonicalHashSync({ sourceId, chunkText })}`;

      const span = {
        span_id: spanId,
        source_id: chunkId,
        byte_start: byteStart,
        byte_end: byteStart + textBytes,
        text: chunkText,
        preview: chunkText.slice(0, 110),
        score: 0,
        coverage: 0,
        phrase: chunkText.slice(0, 60),
        chunk_index: chunkIndex,
      };

      if (session.spans.size < session.spanCap) {
        session.spans.set(spanId, span);
        register(session.provenance, {
          sourceId: chunkId,
          byteStart,
          byteEnd: byteStart + textBytes,
          text: chunkText,
        });
      }

      chunks.push({ id: chunkId, text: chunkText, byteStart, byteEnd: byteStart + textBytes });
    }
    offset = end;
    chunkIndex++;
  }
  return chunks;
}

/**
 * @param {string} [options.language] the document's language, e.g. "en" —
 *   RECEIVED, never inferred (SEED.md #1, Amendment V): omit it and cast
 *   discovery uses the engine's own derived abbreviation floor exactly as
 *   before. Supplied and a matching bin/priors/lang/<language>.json exists,
 *   that prior is used instead (see discoveredCast).
 */
export function admitChunked(session, { text, sourceId, language }) {
  if (!text || !sourceId) return { chunks: 0, admitted: [] };
  const chunks = chunkText(text, sourceId, session);
  const docId = sourceId;
  const pieces = chunks.map((c) => ({ byteStart: c.byteStart, text: c.text, length: c.byteEnd - c.byteStart }));
  let info = session.documents.get(docId);
  if (info) {
    info.chunks = info.chunks.concat(chunks);
    info.pieces = info.pieces.concat(pieces);
    // `text` is the whole-document face of this record — documentText serves
    // it and sessionReferents reads its sentences. Appending chunks without
    // appending here left both looking at the first admission only, so a
    // document grown in two calls was folded as if the second half did not
    // exist. The chunker's own offsets already assume one continuous text.
    info.text = (info.text || "") + text;
    if (language) info.language = language;
  } else {
    session.documents.set(docId, { id: docId, path: sourceId, chunks, pieces, text, language: language ?? null });
  }
  return { chunks: chunks.length, admitted: chunks };
}

export function ingestFile(session, filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceId = `source:${filePath}`;
  return admitChunked(session, { text, sourceId });
}

// ── n-gram signal, shared with the surfer (surfer.js's contentAddress) ───────
// Re-earned from specs/mechanical-retrieval-theory.md: eoreader5 beat ColBERT
// on surface-form robustness with character-trigram profiles, and its typo
// arithmetic is calibrated at n=3 ("a typo changes at most 3 trigrams per
// character"; >50% retention keeps the rank). A wider range was measured and
// reverted: {2..4}, {2..5}, and {4..4} change no outcome on the 11 content-path
// golden cases, the three War-and-Peace paragraph snips, or their single-typo
// variants. The trigram is sufficient, so the anchor is kept. Both sides get
// the same transform, so a query and a span that share a phrase share its
// grams even when one has a wrong letter or a dropped accent.
export const nGramProfile = (text, { minN = 3, maxN = 3 } = {}) => {
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

// Query containment: the span's grams restricted to the query's support, each
// capped at the query's own count, cosine against the query. This asks "how
// much of what I asked for is in the span" and is immune to both span length
// and repetition: a span that contains the phrase verbatim scores ~1 no matter
// how long it is, a span with only half the query's grams scores proportionally,
// and a span that repeats a common letter pattern does not get extra credit.
export const queryContainment = (query, span) => {
  let dot = 0;
  let nq = 0;
  let nl = 0;
  for (const [k, qv] of query) {
    nq += qv * qv;
    const sv = span.get(k);
    if (!sv) continue;
    const capped = Math.min(sv, qv);
    dot += qv * capped;
    nl += capped * capped;
  }
  return nq && nl ? dot / (Math.sqrt(nq) * Math.sqrt(nl)) : 0;
};

// The longest contiguous run of query tokens appearing in a span's token
// sequence, as a fraction of the query's token count — the strongest evidence
// short of an exact span, and the same evidence the surfer's phrase term reads
// off a line: when the reader's words appear in order and unbroken, the span
// contains the thing asked for. Runs of length one are not evidence (every
// matched span contains the query's words singly).
const contiguousPhrase = (tokens, queryTokens) => {
  for (let len = queryTokens.length; len >= 2; len--) {
    for (let s = 0; s + len <= queryTokens.length; s++) {
      const win = queryTokens.slice(s, s + len);
      outer: for (let i = 0; i + len <= tokens.length; i++) {
        for (let j = 0; j < len; j++) if (tokens[i + j] !== win[j]) continue outer;
        return len / queryTokens.length;
      }
    }
  }
  return 0;
};

export function searchSpans(session, { query, limit = 10 }) {
  if (!query || !query.trim()) return { spans: [], gaps: null };
  const phraseWords = tokenize(query);
  if (phraseWords.length === 0) return { spans: [], gaps: null };

  // Lexical presence, never derivation: a span earns a match by containing a
  // query word as a token — no stemming, no synonymy, no fuzzy distance. The
  // query need not be a contiguous substring (a reader asks in words, not in
  // strings). Tokens come from the perceiver's WORD_RE — letters, numbers,
  // apostrophes — so "town" matches "town." and a query in any script matches
  // the same material.
  //
  // Rarity weight, re-earned from surfer.js's contentAddress (measured there:
  // term COUNT is not evidence strength — a stopword is nearly free, a rare
  // word decisive): weight = log(1 + N / (1 + df)), df is corpus-wide document
  // frequency (spans containing the token, out of N spans total). No
  // hardcoded stopword list (bin/README.md: "a hardcoded English stopword
  // list would be a lie" for any other language or a non-text medium) — a
  // word's ordinariness is read off this corpus's own statistics.
  //
  // REGRESSION this replaces: plain present/total coverage gave every query
  // word equal credit, so "who is neil armstrong" against a 5000-span novel
  // scored 0.5 (2 of 4 words present) on every one of dozens of spans that
  // merely contain "who" and "is" — indistinguishable from a genuinely
  // on-topic match, because "neil" and "armstrong" being ABSENT cost nothing.
  // Weighting fixes this without a second pass: "neil"/"armstrong" have df=0
  // (highest possible weight, since they never occur), so they dominate the
  // denominator for every span, and a span that only matches "who"/"is" —
  // both near-ubiquitous, near-zero weight — scores close to zero instead of
  // tying with real matches.
  //
  // One walk of the corpus computes both df (pass 1) and, once weights are
  // known, each span's score (pass 2) — no second full scan.
  const hits = [];
  const df = new Map(phraseWords.map((w) => [w, 0]));
  for (const span of session.spans.values()) {
    if (!span.text) continue;
    const tokens = tokenize(span.text);
    const words = new Set(tokens);
    const present = phraseWords.filter((w) => words.has(w));
    if (present.length === 0) continue;
    for (const w of present) df.set(w, df.get(w) + 1);
    hits.push({ span, present, tokens });
  }
  if (hits.length === 0) return { spans: [], gaps: null };

  const n = hits.length;
  const weight = (w) => Math.log(1 + n / (1 + (df.get(w) ?? 0)));
  const weights = new Map(phraseWords.map((w) => [w, weight(w)]));
  const totalW = phraseWords.reduce((s, w) => s + weights.get(w), 0);
  const queryGrams = nGramProfile(query);

  // A span's report is PRESENCE, and nothing else. The three terms a weighted
  // blend used to mix were measured against a full corpus and one of them is
  // not a signal at all: character-trigram containment between a sentence
  // query and a ~2000-char span is a near-constant (measured 0.88–0.98 across
  // every span of a real 220-span corpus), because the query's trigram mass is
  // overwhelmingly common English letters ("th", "he", "and") that any span
  // carries. Folded into the score it added a flat +0.13 to EVERY span — a
  // floor-bypass: below-threshold noise stopped being noise, which is exactly
  // the failure MIN_RELEVANCE_SCORE exists to close. It is kept on the span as
  // a trace and still serves the surfer's content address; it does not order
  // search. So no blend: the sense organ reports what is present, and order is
  // declared evidence — presence first, then, at equal presence, the span that
  // contains the reader's words contiguously in order (the surfer's "strongest
  // evidence short of an exact span"), then the earlier span (determinism over
  // noise). None of this is a weighted combination of what is present (the
  // constitution's II.8); the scalar stays the calibrated report the host's
  // floor was measured against.
  const matches = [];
  for (const { span, present, tokens } of hits) {
    const matchedW = present.reduce((s, w) => s + weights.get(w), 0);
    const coverage = totalW > 0 ? matchedW / totalW : 0;
    const phrase = contiguousPhrase(tokens, phraseWords);
    const ngram = queryContainment(queryGrams, nGramProfile(span.text));
    span.score = coverage;
    span.coverage = coverage;
    span.phrase_score = phrase;
    span.ngram = ngram;
    span.phrase = query;
    matches.push(span);
  }
  // Deterministic: presence desc, then the contiguous phrase desc, then earlier
  // in the document wins — the same tie-break the surfer uses ("the earlier
  // line wins — determinism over noise"), never the order the spans happened
  // to be admitted in.
  matches.sort(
    (a, b) =>
      (b.score || 0) - (a.score || 0) ||
      (b.phrase_score || 0) - (a.phrase_score || 0) ||
      a.byte_start - b.byte_start,
  );
  return { spans: matches.slice(0, limit), gaps: null };
}

export function spanUnits(session, spans) {
  return spans.map((sp) => ({
    meta: { span_id: sp.span_id, source_id: sp.source_id, score: sp.coverage || sp.score },
    text: sp.text,
    score: sp.score,
    coverage: sp.coverage,
  }));
}

export function foldSpans(session, { units, query, tokenBudget = 2400, maxUnits = 16 } = {}) {
  if (!units || !units.length) return { selected: [], summary: "", tokens: 0, selectedCount: 0 };

  const sorted = [...units].sort((a, b) => (b.score || 0) - (a.score || 0));
  const selected = [];
  let tokens = 0;
  const AVG_TOKEN_LEN = 4;

  for (const u of sorted) {
    const cost = Math.ceil((u.text?.length || 0) / AVG_TOKEN_LEN);
    if (tokens + cost > tokenBudget || selected.length >= maxUnits) break;
    selected.push(u);
    tokens += cost;
  }

  const summary = selected.map((u, i) => `[${i + 1}] ${u.text}`).join("\n\n");
  const dropped = units.length - selected.length;

  return { selected, summary, tokens, budget: tokenBudget, selectedCount: selected.length, dropped };
}

export function readSpan(session, { spanId, maxBytes = 4000 }) {
  const span = session.spans.get(spanId);
  if (!span) return { error: `unknown span_id ${spanId}` };
  const text = span.text.slice(0, maxBytes);
  return { text, source_id: span.source_id, byte_start: span.byte_start, byte_end: span.byte_end, truncated: text.length < span.text.length };
}

export function documentIds(session) {
  return Array.from(session.documents.keys());
}

export function documentText(session, docId) {
  const doc = session.documents.get(docId);
  if (!doc) return { error: `unknown document ${docId}` };
  const text = doc.text || doc.chunks.map((c) => c.text).join("\n");
  return { text, chunks: doc.chunks.length, source: doc.path };
}

// The structural outline of one document, re-earned from the engine's segment
// organ. Byte-accurate: every offset indexes the source's UTF-8 bytes, and a
// heading's `end` is the next boundary's start — the same coordinates the
// reader's byte windows already speak in, so an outline click and the text it
// lands on cannot part company.
export function sessionSegments(session, { sourceId, max, minBody } = {}) {
  const doc = sourceId ? session.documents.get(sourceId) : Array.from(session.documents.values())[0];
  if (!doc) return { error: `no document for "${sourceId}"` };

  const idx = byteIndex(doc.text || "");
  const out = outlineOfIndex(idx, { max, minBody });
  return { source: doc.id, text: doc.text || "", idx, ...out };
}

export function sessionOutline(session, { sourceId, zThreshold, max, minBody } = {}) {
  const seg = sessionSegments(session, { sourceId, max, minBody });
  if (seg.error) return { sections: [], frames: 0, error: seg.error };

  return {
    sections: (seg.headings || []).map((h, i) => ({
      index: i,
      offset: h.start,
      byteStart: h.start,
      byteEnd: h.end,
      length: h.end - h.start,
      label: h.label,
    })),
    frames: seg.text.length,
    gap: seg.gap,
    truncated: seg.truncated ?? false,
    error: null,
  };
}

// Snip an explicit byte range of one document — the primitive the surfer's
// outline resolution lands on. Decoded from the source bytes (never by
// slicing the JS string), registered in provenance so a later reader can
// cite it by refId.
export function snipRange(session, { sourceId, start, end, prompt, label }) {
  const doc = sourceId ? session.documents.get(sourceId) : Array.from(session.documents.values())[0];
  if (!doc) return { gap: "no_source", error: `no document for "${sourceId}"` };

  const cached = session._bytes.get(doc.id);
  const idx = cached?.idx ?? byteIndex(doc.text || "");
  const buf = cached?.buf ?? bufferOf(doc.text || "");
  if (!cached) session._bytes.set(doc.id, { idx, buf });

  const s = Math.max(0, Math.min(Math.floor(start ?? 0), idx.total));
  const e = Math.max(s, Math.min(Math.floor(end ?? idx.total), idx.total));
  if (e <= s) return { gap: "empty_material", reason: "the addressed range is empty" };

  const text = bytesOf(buf, s, e);
  const refId = register(session.provenance, {
    sourceId: doc.id,
    byteStart: s,
    byteEnd: e,
    text,
    spec: { what: "snipped_segment", prompt: prompt ?? null, segment: label ?? null },
  });

  return {
    refId,
    segment: label ?? "(untitled range)",
    source: doc.id,
    byte_start: s,
    byte_end: e,
    text,
  };
}

// The structural segment bracketing a byte anchor — the segment containing the
// passage the reader just landed on. Whatever stands within the reach around
// the anchor is found; a missing boundary behind it is reported honestly as a
// context window, never dressed up as a chapter.
export function snipSegment(session, { sourceId, anchor, radius, prompt } = {}) {
  const doc = sourceId ? session.documents.get(sourceId) : Array.from(session.documents.values())[0];
  if (!doc) return { gap: "no_source", error: `no document for "${sourceId}"` };

  const cached = session._bytes.get(doc.id);
  const idx = cached?.idx ?? byteIndex(doc.text || "");
  const buf = cached?.buf ?? bufferOf(doc.text || "");
  if (!cached) session._bytes.set(doc.id, { idx, buf });

  const seg = discoverSegment(idx, anchor, { radius });
  if (!seg) {
    // No structural boundary anywhere within the reach: return the window as
    // evidence, labelled as exactly that. A fabricated chapter name would be
    // a false permanency.
    const r = Math.min(radius ?? 6000, Math.max(600, idx.total >> 2));
    const from = Math.max(0, (anchor || 0) - r);
    const to = Math.min(idx.total, (anchor || 0) + r);
    const text = bytesOf(buf, from, to);
    return {
      gap: "no_structural_boundary_in_reach",
      reason: "the source's structure does not reach this passage — returned as a context window, not an invented chapter",
      segment: "(no structural boundary detected — context window)",
      source: doc.id,
      byte_start: from,
      byte_end: to,
      windowed: true,
      text,
    };
  }

  return {
    ...snipRange(session, { sourceId: doc.id, start: seg.start, end: seg.end, prompt, label: seg.label }),
    found: seg.found,
    windowed: false,
  };
}

// ---------------------------------------------------------------------------
// sessionReferents — the cast of one document.
//
// WHAT THIS REPLACES. Until now this function echoed the prior back and
// invented its numbers: `mentions: doc.chunks.length`, `frames:
// min(chunks,10)`, `lastFrame: chunks-1` — the same three values for every
// referent, none of them counted from the text. A document with no prior
// returned an empty cast, which is why the app's entity rail and Orbit were
// blank for every source but Frankenstein. Fabricated counts are worse than
// the empty cast, because a reader cannot tell them apart from measurements.
//
// Both are now read off the material by the engine's own organs, which
// already existed and were simply never called from the host:
//
//   spans.js::splitSentences        real sentence units with offsets
//   spans.js::deriveAbbreviations   tokens this text always writes with a dot
//   material.js::functionWordSet    closed class from THIS text's Zipf curve
//   surfaces.js::extractSurfaces    candidate surfaces + the cap/lower filter
//   surfaces.js::discoverReferents  name-variant coreference -> DEF.admit
//   referents/index.js::projectReferents   the canonical event projection
//   pronouns.js::resolvePronouns    third-person singular pronouns bound to
//                                   the discovered cast by one-hop activation
//                                   recall — see the header note below.
//
// TIER DISCIPLINE is inherited unchanged from surfaces.js and is the reason
// this is honest rather than a regex NER: name-variant coreference is
// ENGINE tier (derivable); descriptor synonymy is MODEL tier and still comes
// back as a typed gap, never a guessed number. A prior, when one exists,
// outranks discovery for the surfaces it claims.
//
// PRONOUN BINDING IS PARTIAL, AND SAID SO. surfaces.js's own gap
// ("pronoun_and_descriptor_mentions_unresolved") is not retired here — it is
// narrowed. Third-person singular pronouns ("he"/"she" and their forms) in a
// sentence with no named surface are offered to resolvePronouns, which binds
// one only when its one-hop recall against the already-discovered cast
// clears two declared bars (activation floor, margin over the runner-up);
// short of either, the pronoun stays exactly the same unresolved gap it
// always was. Resolved pronoun mentions are counted SEPARATELY from literal
// name mentions (`pronounMentions`/`pronounFrames`, never folded into
// `mentions`/`frames`) — merging them would let an activation-bound guess
// masquerade as a name occurrence, and countAcrossChunks's substring
// counting has no way to tell one pronoun's referent from another's.
//
// KNOWN LIMIT, declared not hidden: extractSurfaces gates on capitalisation,
// which is a property of Latin/Greek/Cyrillic script. On Han text it returns
// nothing (goldens/cast/README.md measured this). That is reported as a gap
// on a document where sentences exist but no surface survived, so the caller
// sees "this detector does not apply here" rather than "this text has no
// cast".
// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-form occurrence counting, the same boundary rule the app's own
// surface matcher uses: a letter or digit on either side means this is a
// longer word, not this surface.
//
// The trailing group admits the apostrophe clitic, because the perceiver
// merged "Locke's" into "Locke" when it built the candidate. Counting the
// merged surface without it would report the stem's occurrences only — a
// number belonging to one spelling of a name that now covers two, which is
// exactly the kind of quietly-wrong figure the fold is supposed to refuse.
//
// Between words, an OPTIONAL period plus whitespace — not a literal single
// space. surfaces.js strips a trailing period off every token it captures
// (tokenisation drops non-letters), so a candidate born from an
// abbreviation-preserved name ("Mr Darcy", from raw text "Mr. Darcy") would
// otherwise never be found in the chunk text it was discovered in: a
// literal-space match requires "Mr Darcy" with no period, which the raw
// text never has. Silent under the derived fallback (which rarely produces
// a title-preserved multi-word candidate at all) and live the moment a real
// abbreviation prior is supplied — measured, not theoretical.
const occurrenceMatcher = (surfaces) => {
  const alts = [...new Set(surfaces.filter(Boolean).map(String))]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.split(/\s+/).map(escapeRe).join("\\.?\\s+"));
  if (!alts.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.join("|")})(?:['’]s?)?(?![\\p{L}\\p{N}])`, "giu");
};

// mentions/frames counted against the document's OWN admitted chunks, so the
// numbers the reader sees are in the same coordinates as the anchors they can
// click. A "frame" is a chunk the referent occurs in at least once.
const countAcrossChunks = (chunks, surfaces) => {
  const re = occurrenceMatcher(surfaces);
  if (!re) return { mentions: 0, frames: 0, firstFrame: null, lastFrame: null };
  let mentions = 0;
  let frames = 0;
  let firstFrame = null;
  let lastFrame = null;
  for (let i = 0; i < chunks.length; i++) {
    re.lastIndex = 0;
    const hits = chunks[i].text ? chunks[i].text.match(re) : null;
    if (!hits || !hits.length) continue;
    mentions += hits.length;
    frames++;
    if (firstFrame === null) firstFrame = i;
    lastFrame = i;
  }
  return { mentions, frames, firstFrame, lastFrame };
};

// bin/priors/lang/<language>.json — a received prior naming which tokens
// this language writes with a trailing period without ending a sentence
// (spans.js's own docstring: "a caller that has a prior should pass it").
// Loaded here, at the host, and nowhere in the engine: the engine perceiver
// stays language-agnostic by construction (no word list baked into spans.js
// or surfaces.js), and loading a JSON file off disk is host-tier I/O, the
// same division loadMorphology/loadConventions already draw. `language` is
// RECEIVED (SEED.md #1, Amendment V) — never inferred from the text — so a
// caller that does not know or does not declare a document's language gets
// exactly today's behaviour: the engine's own derived, weaker fallback.
const priorsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bin", "priors", "lang");

const loadAbbreviationPrior = (language) => {
  const path = join(priorsRoot, `${language}.json`);
  if (!fs.existsSync(path)) return null;
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  if (raw.schema !== "AbbreviationPrior@1")
    throw new TypeError(`loadAbbreviationPrior: expected AbbreviationPrior@1, got ${raw.schema}`);
  if (!raw.provenance?.source) throw new TypeError("loadAbbreviationPrior: a prior must name its giver");
  return { language: raw.language, giver: raw.provenance.source, abbreviations: raw.abbreviations };
};

// Discovery is deterministic in the document text, so it is memoised per
// document and invalidated by chunk count — the only way a document grows
// here is admitChunked appending to it. /api/fold is polled by the app on
// every source toggle and every reader open; re-splitting 400 KB of sentences
// each time is work with a known answer.
function discoveredCast(session, doc) {
  const cached = session._cast?.get(doc.id);
  if (cached && cached.chunks === doc.chunks.length) return cached.value;

  const source = doc.text || doc.chunks.map((c) => c.text).join("\n");
  const body = stripContainer(source).text || source;

  const gaps = [];

  // Derived once and used twice, deliberately: the same set that keeps "Cf."
  // from ending a sentence is the set that keeps "Cf" out of the cast. Both
  // uses rest on the same source. When the document names a received
  // language AND a matching prior exists, that prior is the stronger source
  // (spans.js's own measurement: 0 -> 249 "Mr. Darcy" occurrences on Pride
  // and Prejudice, against 0 -> 0 from derivation alone); otherwise this
  // falls through to the engine's own derived, weaker floor exactly as
  // before — no language was ever asserted here without one being given.
  let abbreviations = null;
  let abbreviationGiver = null;
  if (doc.language) {
    const prior = loadAbbreviationPrior(doc.language);
    if (prior) {
      abbreviations = prior.abbreviations;
      abbreviationGiver = prior.giver;
    } else {
      gaps.push({
        reason: "no_abbreviation_prior_for_language",
        tier: "witness",
        detail: `document declared language "${doc.language}" but bin/priors/lang/${doc.language}.json does not exist — falling back to the engine's own derived abbreviation floor`,
      });
    }
  }
  if (!abbreviations) abbreviations = deriveAbbreviations(body);
  const sentences = splitSentences(body, { abbreviations });

  let referents = [];
  let pronounBindings = [];

  if (!sentences.length) {
    gaps.push({
      reason: "no_sentence_units_in_document",
      tier: "engine",
      detail: "the text perceiver found no sentence boundaries, so no surface could be positioned",
    });
  } else {
    const functionWords = functionWordSet(buildFrequencyTable(tokenize(body)));
    const surfaces = extractSurfaces(sentences, { functionWords, abbreviations });

    if (!surfaces.length) {
      gaps.push({
        reason: "no_candidate_surfaces",
        tier: "engine",
        detail:
          `${sentences.length} sentences were read and no surface survived the capitalisation filter. ` +
          "extractSurfaces detects names by mid-sentence capitalisation, which is a property of " +
          "Latin/Greek/Cyrillic script — on a caseless script (Han, Arabic, Hebrew) this detector " +
          "does not apply, and its silence is not evidence that the text has no cast.",
      });
    } else {
      const discovery = discoverReferents(surfaces);
      referents = projectReferents(discovery.events);
      // discoverReferents emits the same gap once per referent, because at
      // that level each referent is the unit. Forwarding 63 identical
      // objects to a reader-facing audit log is noise that buries the gaps
      // that differ; the fact is one fact about the whole cast, so it is
      // stated once and carries its own count.
      if (discovery.gaps.length) {
        const one = discovery.gaps[0];
        gaps.push({
          reason: one.reason,
          tier: one.tier,
          needsWitness: one.needsWitness,
          referents: discovery.gaps.length,
          detail: `${discovery.gaps.length} discovered referents: ${one.detail}`,
        });
      }

      // Third-person singular pronouns, offered to the same cast — see the
      // section header above. surfaceToReferent maps each admitted DEF.admit
      // surface straight back to its referent_id; resolvePronouns adds no
      // surfaces of its own, it only asks which already-named referent a
      // pronoun's sentence resembles by one-hop recall.
      const surfaceToReferent = new Map(discovery.events.map((e) => [e.surface, e.referent_id]));
      const resolved = resolvePronouns(sentences, surfaceToReferent, {
        minActivation: PRONOUN_MIN_ACTIVATION,
        minMargin: PRONOUN_MIN_MARGIN,
      });
      pronounBindings = resolved.bindings;

      // Same collapsing discipline as discovery.gaps just above: one summary
      // fact, not one gap object per unresolved pronoun in a 690 KB novel.
      if (resolved.bindings.length || resolved.gaps.length) {
        gaps.push({
          reason: "pronoun_mentions_partially_resolved",
          tier: "model",
          needsWitness: true,
          pronounsResolved: resolved.bindings.length,
          pronounsRemaining: resolved.gaps.length,
          detail:
            `${resolved.bindings.length} third-person singular pronoun mentions bound to a referent by ` +
            `activation recall; ${resolved.gaps.length} remain unresolved (below the declared activation ` +
            "or margin floor, gender-incompatible with every candidate named so far, or nothing named yet " +
            "to recall). Descriptor synonymy is untouched by either count and remains not derivable " +
            "(eoreader5 measured distributional coref failing twice). Supply a per-text prior to close " +
            "what remains.",
        });
      }
    }
  }

  const value = { referents, gaps, abbreviationGiver, pronounBindings };
  if (!session._cast) session._cast = new Map();
  session._cast.set(doc.id, { chunks: doc.chunks.length, value });
  return value;
}

export function sessionReferents(session, { sourceId, priors = [], limit = 100 } = {}) {
  const doc = session.documents.get(sourceId);
  if (!doc) return { referents: [], gaps: [`unknown document ${sourceId}`] };

  const chunks = doc.chunks || [];
  const referents = [];
  const gaps = [];
  const claimed = new Set(); // lowercased surfaces a prior has already spoken for

  // The prior first, and it wins every surface it names. Witness knowledge is
  // received, not competed with — a discovered candidate that happens to share
  // a surface with a prior referent is the same being seen without the name.
  for (const prior of priors) {
    const id = prior.id || prior.name || `ref:${canonicalHashSync(prior)}`;
    const raw = prior.surfaces || [prior.name].filter(Boolean);
    // A prior surface may be an object with a scope, or a positional
    // `surface@from-to` handle. Neither is countable text.
    const surfaces = raw
      .map((s) => (typeof s === "string" ? s : s && s.surface))
      .filter((s) => typeof s === "string" && s && !/@\d+-\d+$/.test(s));
    const counted = countAcrossChunks(chunks, surfaces.length ? surfaces : raw.filter((s) => typeof s === "string"));
    for (const s of surfaces) claimed.add(diaNorm(s));
    referents.push({
      id,
      display: prior.display || prior.name || id,
      surfaces: raw,
      ...counted,
      individuation: prior.individuation || "holon",
      fromPrior: true,
    });
  }

  const discovery = discoveredCast(session, doc);
  gaps.push(...discovery.gaps);

  for (const r of discovery.referents) {
    if (r.surfaces.some((s) => claimed.has(diaNorm(s)))) continue;
    const counted = countAcrossChunks(chunks, r.surfaces);
    if (!counted.mentions) continue; // discovered in the body, absent from the admitted chunks
    // The longest surface is the fullest form of the name ("Victor
    // Frankenstein" over "Victor"), which is what a reader wants on the label.
    const display = [...r.surfaces].sort((a, b) => b.length - a.length)[0];
    // Activation-bound pronoun mentions for THIS referent, counted separately
    // from `counted` above (see the section header: never folded into
    // `mentions`/`frames`, which stay literal-surface-only).
    const pronounHits = discovery.pronounBindings.filter((b) => b.referentId === r.id);
    const pronounFrameOrders = new Set(pronounHits.map((b) => b.sentenceOrder));
    referents.push({
      id: r.id,
      display,
      surfaces: r.surfaces,
      ...counted,
      pronounMentions: pronounHits.length,
      pronounFrames: pronounFrameOrders.size,
      // Individuation is NOT decided here. Which kind of being a referent is
      // (holon / emanon / protogon / field / apparatus) is a typed judgement;
      // discovery only establishes that something recurs and is named. The
      // caller sees null and applies its own policy.
      individuation: null,
      fromPrior: false,
    });
  }

  referents.sort((a, b) => (b.fromPrior === true) - (a.fromPrior === true) || b.mentions - a.mentions);

  // L3: where the cast is cut, the cut is reported.
  const total = referents.length;
  const kept = Number.isFinite(limit) ? referents.slice(0, limit) : referents;
  if (kept.length < total) {
    gaps.push({
      reason: "cast_truncated",
      tier: "host",
      detail: `${total} referents discovered, ${kept.length} returned (limit=${limit})`,
    });
  }

  return { referents: kept, gaps };
}
