import fs from "node:fs";
import { canonicalHashSync, CORPUS_API_VERSION } from "../spec/index.js";
import { createRegistry, register } from "../../provenance/index.js";
import { createSession as makeDiscourseSession } from "../../discourse/index.js";

export { CORPUS_API_VERSION } from "../spec/index.js";

const DEFAULT_SPAN_CAP = 2000;
const CHUNK_SIZE = 2000;
const MIN_CHUNK_CHARS = 20;

const utf8 = new TextEncoder();

const byteLength = (text) => utf8.encode(text).length;

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

export function sessionOutline(session, { sourceId, zThreshold } = {}) {
  const docs = sourceId ? [session.documents.get(sourceId)].filter(Boolean) : Array.from(session.documents.values());
  if (!docs.length) return { error: `no document for "${sourceId}"` };

  const doc = docs[0];
  const text = doc.text || "";
  const lines = text.split("\n");
  const sections = [];
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && trimmed.length < 80 && /^[A-Z]/.test(trimmed)) {
      sections.push({
        index: sections.length,
        offset,
        length: lines[i].length,
        byteStart: byteLength(text.slice(0, offset)),
        label: trimmed,
      });
    }
    offset += lines[i].length + 1;
  }

  return { sections, frames: text.length, error: null };
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
