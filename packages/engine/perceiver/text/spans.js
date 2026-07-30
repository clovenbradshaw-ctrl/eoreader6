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

export const stripContainer = (text) => {
  let s = String(text ?? "");
  let offset = 0;
  const start = s.match(GUTENBERG_START);
  if (start) {
    offset = start.index + start[0].length;
    s = s.slice(offset);
  }
  const end = s.match(GUTENBERG_END);
  if (end) s = s.slice(0, end.index);
  return { text: s, offset };
};

const SENTENCE_TERMINATORS = new Set([".", "!", "?", "…"]);
const CLOSING_QUOTES = new Set(['"', "'", "”", "’"]);
const PARAGRAPH_BREAK = /\n\s*\n+/g;

const pushSentence = (s, start, end, out) => {
  const raw = s.slice(start, end);
  const trimmed = raw.trim();
  if (!trimmed) return;
  const leading = raw.length - raw.trimStart().length;
  out.push({ text: trimmed, offset: start + leading, order: out.length });
};

const splitSentencesInRange = (s, rangeStart, rangeEnd, out) => {
  let start = rangeStart;
  for (let i = rangeStart; i < rangeEnd; i++) {
    if (!SENTENCE_TERMINATORS.has(s[i])) continue;
    let end = i + 1;
    while (end < rangeEnd && CLOSING_QUOTES.has(s[end])) end += 1;
    if (end < rangeEnd && !/\s/.test(s[end])) continue; // probable abbreviation, keep scanning
    pushSentence(s, start, end, out);
    start = end;
  }
  pushSentence(s, start, rangeEnd, out);
};

export const splitSentences = (text) => {
  const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
  for (const para of paragraphs) splitSentencesInRange(s, para.start, para.end, sentences);
  sentences.forEach((sent, i) => { sent.order = i; });
  return sentences;
};
