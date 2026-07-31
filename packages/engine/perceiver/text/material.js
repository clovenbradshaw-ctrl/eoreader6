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

// THE REACH OF THE PRESENT IN PROSE: A BASIS THAT WAS TRIED AND REFUTED.
//
// This is the one number in the engine that was a pure guess — every caller
// passed `window: 12` to prose chunks, raw bytes and audio frames alike. The
// fix attempted here was to derive it from the median paragraph, on the
// argument that a paragraph break is the author saying, in the only channel
// they have for saying it, "this much is contemporary with itself."
//
// The argument is still appealing and the basis is measurably wrong. Both
// failures are recorded rather than quietly dropped, because the next person
// to have this idea should have to get past them:
//
//   1. IT DOES NOT WIN. Swept against arbitrary windows on Frankenstein at
//      every grain it permits, the paragraph-derived present never scores best
//      and is usually near the bottom (scripts/declared-present.mjs).
//
//   2. IT DEGENERATES ON DIALOGUE. Garoa's median paragraph is 8 words against
//      Frankenstein's 80, because in a dialogue-heavy novel the median
//      paragraph is one line of speech. Paragraph length there is bimodal —
//      short turns and long narration — and the median of a bimodal
//      distribution describes neither mode. The derived present would demand
//      chunks of 4 words or finer, which is not a reach of the present, it is
//      a stammer.
//
// So this no longer derives anything. The caller declares `present` and
// `basis`, and the contract refuses without them, which is the discipline the
// whole consumption module exists for: what is refused is a GUESS WEARING A
// DERIVATION, not the requirement to justify. `paragraphWords` stays exported
// as evidence anyone can look at, and the conversion from it to a present is
// what has been withdrawn.
//
// What a working basis would need: it must not collapse on bimodal paragraph
// distributions, and it must transfer across authors and languages, which is
// exactly the pair of tests this one failed.
export const paragraphWords = (text) =>
  String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => tokenize(p).length)
    .filter((n) => n > 0);

export const consumption = (text, { chunkSize = 40, present, basis } = {}) => {
  if (present === undefined || basis === undefined)
    throw new TypeError(
      "consumption(text): `present` and `basis` are declared by the caller. The paragraph-median basis that " +
        "used to supply them was measured and refuted — it loses to arbitrary windows on Frankenstein and " +
        "degenerates on dialogue-heavy prose (Garoa's median paragraph is 8 words). See the header. " +
        "paragraphWords(text) is still available as evidence; converting it to a present is what was withdrawn."
    );
  return contract({ order: "sequential", unit: `${chunkSize}-word chunk`, present, basis });
};
