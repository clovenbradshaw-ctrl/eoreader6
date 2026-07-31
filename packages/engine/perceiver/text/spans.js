// eoreader6 · perceiver/text/spans — real meaningful spans, not arbitrary
// fixed-size chunks. Everything built earlier this session (motif
// detection, structure tests, significance) operated on chunkWords(words,
// 40) — 40-word windows with no relationship to sentence or clause
// boundaries. That's the wrong foundation for anything above it: heat-
// tracking needs a real unit to attach activation to, coref resolution
// needs real sentence boundaries to resolve a pronoun within.
//
// Ported from eoreader5's text-organ.js::splitSentences, a real, tested
// implementation — paragraph breaks are a harder boundary than any
// terminator (a chapter heading has no period and must not glue onto the
// next paragraph), closing quotes after a terminator are absorbed, and a
// terminator NOT followed by whitespace is treated as a probable
// abbreviation ("Mr.") rather than a sentence end. Not reinvented — CLAUDE.md
// names sentence segmentation with offsets as one of the consistently
// reinvented wheels in this project family.

// Container, not content. A Project Gutenberg file wraps the work in a
// licence header, a title block, and often a table of contents; none of it
// is the text being read, and leaving it in put a chapter-number list at the
// top of a salience report earlier in this session. Knowing where the
// container ends is received knowledge ABOUT THE FILE FORMAT — the same kind
// as knowing an mp3 carries an ID3 header — not a linguistic rule and not a
// word set: no claim is made here about any language's vocabulary. Texts
// without these markers pass through untouched.
const GUTENBERG_START = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;
const GUTENBERG_END = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;

// THE CONTAINER DOES NOT END AT THE START MARKER, and assuming it did put 354
// forms of transcriber's note into the material on Heidi. Measured: the
// perished ground of a standpoint reader turned out to be Project Gutenberg's
// producer credits, so a reader imagining prose reached back and said the
// publisher's name, a copyright year and a page number.
//
// After the marker PG typically continues with a producer credit block, an
// ornamental rule, and a boxed transcriber's note, and only then the work.
// Two of the three are recognised by FORM alone, which is what keeps this out
// of linguistic-rule territory:
//
//   RULE   a line of nothing but asterisks and space
//   BOX    a run of lines drawn out of + - | and space, or bounded by pipes
//
// Neither says anything about a language's vocabulary — they are typography,
// and a Devanagari or CJK file draws its boxes the same way. The third needs a
// format marker, and a PG URL is exactly the same kind of received knowledge
// about the file format as the START marker itself already is (an mp3 has an
// ID3 header; a PG file has a credit block).
//
// STRIPPING STOPS AT THE FIRST PARAGRAPH THAT IS NONE OF THESE. It never scans
// the body, so a rule or a box drawn inside the work — a table, a scene break
// — is content and survives. Bounding it that way is what makes this safe;
// an unbounded version would eat an author's own ornament.
const PG_CREDIT_URL = /\b(?:pgdp\.net|gutenberg\.org|www\.gutenberg)/i;
const ORNAMENT_RULE = /^[\s*]+$/;
const BOX_BLOCK = /^[\s+|=_-]*$/;
const BOX_ROW = /^\s*\|.*\|\s*$/;

const isContainerParagraph = (p) => {
  const trimmed = p.trim();
  if (!trimmed) return true;
  if (ORNAMENT_RULE.test(trimmed)) return true;
  if (PG_CREDIT_URL.test(trimmed)) return true;
  // A boxed block: every line is either a border or a piped row.
  const lines = trimmed.split("\n");
  if (lines.every((l) => BOX_BLOCK.test(l) || BOX_ROW.test(l))) return true;
  return false;
};

// The cell this organ occupies on the operator grid (engine/operators.js):
// SEG · Field · Clearing — sentence segmentation; abbreviations are injected
// priors, never a list. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "SEG", grain: "Ground" });

export const stripContainer = (text) => {
  let s = String(text ?? "");
  let offset = 0;
  const start = s.match(GUTENBERG_START);
  if (start) {
    offset = start.index + start[0].length;
    s = s.slice(offset);

    // Walk the leading paragraphs and drop the ones that are still container.
    // Offsets are accumulated as we go, because everything downstream anchors
    // spans against this offset and a strip that forgot to move it would
    // silently shift every citation in the reader.
    for (;;) {
      const m = s.match(/^(\s*)([\s\S]*?)(\n\s*\n|$)/);
      if (!m) break;
      const paragraph = m[2];
      if (!paragraph.trim()) break;
      if (!isContainerParagraph(paragraph)) break;
      const consumed = m[0].length;
      if (consumed === 0) break;
      offset += consumed;
      s = s.slice(consumed);
    }
  }
  const end = s.match(GUTENBERG_END);
  if (end) s = s.slice(0, end.index);
  return { text: s, offset };
};

const SENTENCE_TERMINATORS = new Set([".", "!", "?", "…"]);
const CLOSING_QUOTES = new Set(['"', "'", "”", "’"]);
const PARAGRAPH_BREAK = /\n\s*\n+/g;

// The guard this file used to rely on — "a terminator not followed by
// whitespace is probably an abbreviation" — catches `3.14` and does NOT catch
// `Mr. Darcy`, which is the case its own comment named. Measured on real text:
// "Mr. Collins" occurred in 0 of Pride and Prejudice's sentences against 145
// occurrences in the file, because every title was split off as a sentence of
// its own. War and Peace never showed it, since Russian titles ("Prince
// Vasíli", "Count Rostóv") carry no period — so the defect was invisible for
// exactly as long as the corpus was Russian.
//
// WHICH tokens are abbreviations is a fact about a language, so it is not
// decided here. It is injected (`options.abbreviations`) and lives as data in
// bin/priors/lang/*.json, on its way to eoPriors. This module stays
// language-agnostic in the same way material.js does: no list baked in.
//
// When nothing is injected the fallback is derived from the material itself,
// Zipf-style, with no word list: a token type ALWAYS written with a trailing
// period is an abbreviation, since a real sentence-final word also turns up
// mid-sentence without one. A length bar taken from the text's own 10th
// -percentile token length keeps out words that merely happen to be
// text-final-only in a short sample.
//
// The fallback is a floor, not a substitute, and it is fragile in a way worth
// stating precisely rather than implying it is close enough. Two limits, both
// measured:
//
//   - the length bar on real English prose comes out at 2 characters, so a
//     three-character title like `Mrs` is out of reach by construction;
//   - "always written with a period" is all-or-nothing, so ONE period-less
//     occurrence anywhere — including in a licence header — disqualifies a
//     token for the whole text.
//
// Together those are not a small shortfall. On Frankenstein the fallback
// recovers `Mr` and `M` (13 and 8 sentences repaired). On Pride and Prejudice
// it recovers NOTHING: `Mr. Darcy` stays at 0 sentences derived, against 249
// with the prior. A caller that has a prior should pass it.
const TOKEN_BEFORE_DOT = /(\p{L}[\p{L}\p{M}]*)\./gu;
const TOKEN_RE = /\p{L}[\p{L}\p{M}]*/gu;

export const deriveAbbreviations = (text) => {
  const withDot = new Map();
  const total = new Map();
  const lengths = [];
  for (const m of text.matchAll(TOKEN_BEFORE_DOT)) withDot.set(m[1], (withDot.get(m[1]) || 0) + 1);
  for (const m of text.matchAll(TOKEN_RE)) {
    total.set(m[0], (total.get(m[0]) || 0) + 1);
    lengths.push(m[0].length);
  }
  if (lengths.length === 0) return new Set();
  lengths.sort((a, b) => a - b);
  const bar = lengths[Math.floor(lengths.length * 0.1)];
  const out = new Set();
  for (const [token, n] of withDot) if (n >= 2 && total.get(token) === n && token.length <= bar) out.add(token);
  return out;
};

/** The token immediately before position i, or "" if there is none. */
const tokenEndingAt = (s, i) => {
  let j = i;
  while (j > 0 && /[\p{L}\p{M}]/u.test(s[j - 1])) j--;
  return s.slice(j, i);
};

const pushSentence = (s, start, end, out) => {
  const raw = s.slice(start, end);
  const trimmed = raw.trim();
  if (!trimmed) return;
  const leading = raw.length - raw.trimStart().length;
  out.push({ text: trimmed, offset: start + leading, order: out.length });
};

const splitSentencesInRange = (s, rangeStart, rangeEnd, out, abbreviations) => {
  let start = rangeStart;
  for (let i = rangeStart; i < rangeEnd; i++) {
    if (!SENTENCE_TERMINATORS.has(s[i])) continue;
    let end = i + 1;
    while (end < rangeEnd && CLOSING_QUOTES.has(s[end])) end += 1;
    if (end < rangeEnd && !/\s/.test(s[end])) continue; // a decimal point, not a stop
    if (s[i] === "." && abbreviations.has(tokenEndingAt(s, i))) continue; // a title, not a stop
    pushSentence(s, start, end, out);
    start = end;
  }
  pushSentence(s, start, rangeEnd, out);
};

/**
 * @param {string} text
 * @param {object} [options]
 * @param {Iterable<string>|null} [options.abbreviations] - tokens that take a
 *   trailing period without ending a sentence. A LANGUAGE prior; pass one from
 *   bin/priors/lang/*.json. Omit to derive a weaker set from the text itself.
 */
export const splitSentences = (text, { abbreviations = null } = {}) => {
  const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const abbrev = abbreviations ? new Set(abbreviations) : deriveAbbreviations(s);
  const paragraphs = [];
  let paraStart = 0;
  let pm;
  PARAGRAPH_BREAK.lastIndex = 0;
  while ((pm = PARAGRAPH_BREAK.exec(s))) {
    paragraphs.push({ start: paraStart, end: pm.index });
    paraStart = pm.index + pm[0].length;
  }
  paragraphs.push({ start: paraStart, end: s.length });

  const sentences = [];
  for (const para of paragraphs) splitSentencesInRange(s, para.start, para.end, sentences, abbrev);
  sentences.forEach((sent, i) => { sent.order = i; });
  return sentences;
};
