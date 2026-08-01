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
import { stripContainer } from "./spans.js";

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

/**
 * THE CONTAINER IS NOT THE WORK, and this path used to read it as one.
 *
 * `stripContainer` lived in `spans.js` and the sentence path called it; this —
 * the NUMERIC path, the one `surf`, `fold` and the whole `nul` substrate go
 * through — did not. So every ground built here was grown partly over the
 * distributor's licence.
 *
 * MEASURED, 2026-07-31, Heidi (Project Gutenberg 20781), 1376 chunks:
 *   - all 30 of `surf`'s wave-breaks fell in the licence, none in the novel;
 *   - from a standpoint at chunk 547, 38 of 60 placed positions (63%) were
 *     wrapper rather than Heidi, and the wrapper held the top of the ranking.
 *
 * eoreader5 had already found this and fixed it at ingest
 * (`packages/host/corpus.js::ingestFile`): "the markers bracket the actual
 * work, and leaving them in put license text into search results." That fix was
 * not re-earned here. This is it, re-earned at the perceiver rather than the
 * host, because this module is where the numeric material is born.
 *
 * NOT A MEASUREMENT, and it must not become one. Knowing where the container
 * ends is received knowledge about the FILE FORMAT — the same kind as knowing
 * an mp3 carries an ID3 header (see `spans.js`) — so markers are the right
 * instrument, not a weaker one. eoreader5's `emergence/boundaries/index.js`
 * records why the alternative fails: "concentration alone is a clustering
 * heuristic that happily individuates boilerplate." A salience measure finds
 * the wrapper BECAUSE the wrapper is statistically distinctive, which makes it
 * a false-positive generator rather than a detector.
 *
 * NO OFFSET IS CARRIED, deliberately. What this module produces is a
 * chunk-indexed series with no byte anchors, so there is nothing here for an
 * offset to correct. A caller mapping a position back to the FILE takes the
 * offset from `spans.js::stripContainer`, which returns `{ text, offset }` for
 * exactly that reason — eoreader5 measured the cost of dropping it on pg84.txt:
 * "spans came back verbatim but 686 bytes early, which looks correct in every
 * test that only re-reads through this process and is wrong the moment anyone
 * opens the file."
 *
 * A text with no markers passes through untouched.
 */
export const load = async (path) => tokenize(stripContainer(fs.readFileSync(path, "utf8")).text);

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
