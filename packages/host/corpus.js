import fs from "node:fs";
import { canonicalHashSync, CORPUS_API_VERSION } from "../spec/index.js";
import { createRegistry, register } from "../../provenance/index.js";
import { createSession as makeDiscourseSession } from "../../discourse/index.js";
import { lineIndex, outlineOfIndex, discoverSegment } from "../engine/perceiver/text/segments.js";

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

export function admitChunked(session, { text, sourceId }) {
  if (!text || !sourceId) return { chunks: 0, admitted: [] };
  const chunks = chunkText(text, sourceId, session);
  const docId = sourceId;
  const pieces = chunks.map((c) => ({ byteStart: c.byteStart, text: c.text, length: c.byteEnd - c.byteStart }));
  let info = session.documents.get(docId);
  if (info) {
    info.chunks = info.chunks.concat(chunks);
    info.pieces = info.pieces.concat(pieces);
  } else {
    session.documents.set(docId, { id: docId, path: sourceId, chunks, pieces, text });
  }
  return { chunks: chunks.length, admitted: chunks };
}

export function ingestFile(session, filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceId = `source:${filePath}`;
  return admitChunked(session, { text, sourceId });
}

export function searchSpans(session, { query, limit = 10 }) {
  if (!query || !query.trim()) return { spans: [], gaps: null };
  const q = query.toLowerCase();
  const matches = [];
  for (const span of session.spans.values()) {
    if (span.text && span.text.toLowerCase().includes(q)) {
      const words = span.text.toLowerCase().split(/\s+/);
      const phraseWords = q.split(/\s+/);
      const coverage = phraseWords.filter((w) => words.includes(w)).length / phraseWords.length;
      span.score = coverage;
      span.coverage = coverage;
      span.phrase = query;
      matches.push(span);
    }
  }
  matches.sort((a, b) => (b.score || 0) - (a.score || 0));
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

export function sessionReferents(session, { sourceId, priors = [], limit = 100 } = {}) {
  const doc = session.documents.get(sourceId);
  if (!doc) return { referents: [], gaps: [`unknown document ${sourceId}`] };

  const referents = [];
  const gaps = [];

  for (const prior of priors) {
    const id = prior.id || prior.name || `ref:${canonicalHashSync(prior)}`;
    const surfaces = prior.surfaces || [prior.name].filter(Boolean);
    referents.push({
      id,
      display: prior.display || prior.name || id,
      surfaces,
      mentions: doc.chunks ? doc.chunks.length : 0,
      frames: doc.chunks ? Math.min(doc.chunks.length, 10) : 0,
      firstFrame: 0,
      lastFrame: doc.chunks ? doc.chunks.length - 1 : 0,
      individuation: prior.individuation || "holon",
      fromPrior: true,
    });
  }

  return { referents, gaps };
}
