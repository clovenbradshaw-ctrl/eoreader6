// eoreader6 · perceiver/text — turns real text into the numeric material `nul`
// requires. Unicode-aware (not ASCII-only): a ground built from this must
// hold for any script, not just English, or the omnimodal commitment is a
// lie for every language but one.
//
// Surprisal is self-referential: -log2 of a word's own frequency within the
// material being measured, Laplace-smoothed. No external corpus, no model —
// the only prior is the material itself.
//
// Contract shared by every perceiver in this directory: load(path) does I/O
// once; reduce(units, {fraction}) is pure and answers "what would the
// material look like having read only this much of the real thing so far."

import fs from "node:fs";
import { contract } from "../consumption.js";

const WORD_RE = /[\p{L}\p{N}']+/gu;
const MICROBITS = 1_000_000;

export const tokenize = (text) => text.toLowerCase().match(WORD_RE) || [];

export const buildFrequencyTable = (words) => {
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return { freq, total: words.length };
};

export const surprisalMicrobits = (words, table) => {
  const ws = typeof words === "string" ? tokenize(words) : words;
  if (ws.length === 0) return 0;
  let bits = 0;
  for (const w of ws) {
    const count = table.freq.get(w) || 0;
    // Fixed pseudocount (add-one), not scaled by vocabulary size. Scaling
    // the smoothing term by table.freq.size (distinct word types seen)
    // made the denominator inflate continuously as reading progresses —
    // real vocabulary diversity keeps growing throughout a novel — which
    // produced a systematic upward drift in surprisal over the WHOLE
    // document (measured: r(position, causal surprisal) = 0.297 on
    // Frankenstein) with no narrative content behind it. An unseen word
    // still costs what a first-time hapax would; that cost now depends only
    // on how much has been read (table.total), not on how many distinct
    // types happened to appear along the way.
    const p = (count + 1) / (table.total + 1);
    bits += -Math.log2(p);
  }
  return (bits / ws.length) * MICROBITS;
};

export const chunkWords = (words, size) => {
  const chunks = [];
  for (let i = 0; i + size <= words.length; i += size) {
    chunks.push(words.slice(i, i + size));
  }
  return chunks;
};

export const load = async (path) => tokenize(fs.readFileSync(path, "utf8"));

export const reduce = (words, { fraction = 1, chunkSize = 40 } = {}) => {
  const readWords = words.slice(0, Math.max(1, Math.floor(words.length * fraction)));
  const table = buildFrequencyTable(readWords);
  return chunkWords(readWords, chunkSize).map((c) => surprisalMicrobits(c, table));
};

// Causal surprisal: each chunk is scored against the frequency table of
// chunks BEFORE it only, never the whole document. A whole-document table
// leaks the future into every block's score — a block near the start gets
// measured against vocabulary it hasn't been read yet. This is eoreader5's
// forwardScore lesson (emergence/surprise/index.js), ported as a real
// mechanism, not an assertion: "how much new information would this add,
// given what's already been read" is a different, causally honest question
// from "how rare are these words across the whole book."
export const causalSurprisalSeries = (chunks) => {
  const table = { freq: new Map(), total: 0 };
  const series = [];
  for (const chunk of chunks) {
    series.push(table.total === 0 ? selfEntropyMicrobits(chunk) : surprisalMicrobits(chunk, table));
    for (const w of chunk) table.freq.set(w, (table.freq.get(w) || 0) + 1);
    table.total += chunk.length;
  }
  return series;
};

const selfEntropyMicrobits = (words) => {
  if (words.length === 0) return 0;
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  let bits = 0;
  for (const w of words) {
    const p = freq.get(w) / words.length;
    bits += -Math.log2(p);
  }
  return (bits / words.length) * MICROBITS;
};

// Token relevance: is this word even worth attending to? Self-referential,
// no external stopword list (no external corpus, per this whole module's
// discipline, and a hardcoded English stopword list would be a lie for
// every other language, same reasoning as the Unicode tokenizer above).
// Zipf's law does the work instead: the handful of words occupying a wildly
// disproportionate share of all tokens in ANY natural-language text are
// almost always function words (the, a, of, and...) — closed-class,
// structural, carrying little content on their own. A word is "relevant"
// when it does NOT belong to that small, over-represented set.
const DEFAULT_RELEVANCE_THRESHOLD = 0.006; // ~0.6% of all tokens — tuned against real text, see conformance test

export const tokenRelevance = (word, table, { threshold = DEFAULT_RELEVANCE_THRESHOLD } = {}) => {
  if (table.total === 0) return 1; // no history yet — nothing has earned irrelevance
  const share = (table.freq.get(word) || 0) / table.total;
  return share < threshold ? 1 : 0;
};

export const contentWords = (words, table, opts) => words.filter((w) => tokenRelevance(w, table, opts) === 1);

/** The closed class this text's own distribution reveals — never a stored list. */
export const functionWordSet = (table, { threshold = DEFAULT_RELEVANCE_THRESHOLD } = {}) => {
  const set = new Set();
  for (const [word, count] of table.freq) {
    if (count / table.total >= threshold) set.add(word);
  }
  return set;
};

// THE REACH OF THE PRESENT IN PROSE IS THE PARAGRAPH, AND THE WRITER DECLARED IT.
//
// This is the one number in the engine that had been a pure guess: every caller
// passed `window: 12` to prose chunks, raw bytes, and audio frames alike. A
// paragraph break is not a typographic convention here — it is the author
// saying, in the only channel they have for saying it, "this much is
// contemporary with itself; what follows is next." Taking them at their word
// costs nothing and is checkable.
//
// Derived from FORM, never from LENGTH — the distinction SEED.md #5 turns on.
// A paragraph does not get longer because the book is long, and that is
// measurable rather than assertable: Frankenstein's median paragraph is 80
// words at 25%, 50%, 75% and 100% read (78, 81, 84, 80). A window that drifted
// with extent would be the forbidden kind; this one does not move.
//
// The median, not the mean: paragraph lengths are heavily right-skewed (q25 40,
// median 80, q75 133, mean 95), and one page of unbroken description should not
// widen the present for the whole book.
export const paragraphWords = (text) =>
  String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => tokenize(p).length)
    .filter((n) => n > 0);

export const consumption = (text, { chunkSize = 40 } = {}) => {
  const lens = paragraphWords(text).sort((a, b) => a - b);
  const median = lens.length ? lens[Math.floor((lens.length - 1) * 0.5)] : 0;
  const present = Math.round(median / chunkSize);

  // THE UNIT MUST BE FINER THAN THE PRESENT, or the present is not
  // representable and clamping to the floor would fake one.
  //
  // A present of at least 2 units means the chunk can be at most half a
  // paragraph. Chunk more coarsely than that and each unit already spans more
  // than the present does — there is no "contemporary with itself" left to
  // measure, because everything inside one unit has been averaged together
  // before the reader sees it.
  //
  // This is not hypothetical housekeeping. Every Frankenstein number in
  // scripts/RESULTS.md up to this point was computed at 100-word chunks
  // against a median paragraph of 80 words, which is exactly this refusal —
  // the whole reading happened at a grain where the reach of the present could
  // not be expressed, and the 12 that was passed instead was a number about
  // nothing.
  if (median && present < 2)
    throw new TypeError(
      `consumption: a ${chunkSize}-word chunk is coarser than half this text's median paragraph (${median} words), ` +
        `so its present would be ${present} unit(s). Chunk at ${Math.max(1, Math.floor(median / 2))} words or finer.`
    );

  return contract({
    order: "sequential",
    unit: `${chunkSize}-word chunk`,
    // Where a text has no paragraphing at all there is nothing to derive from,
    // and the floor stands with the basis saying so rather than inventing one.
    present: median ? present : 2,
    basis: median
      ? `the median paragraph of this text is ${median} words, and a paragraph break is the writer's own declaration of what is contemporary with itself`
      : "this text has no paragraph structure to declare a present with, so the floor stands and no claim is made",
  });
};
