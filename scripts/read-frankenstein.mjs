// eoreader6 · read-frankenstein — an actual reading, left to right.
//
// This is eoreader5's significanceSpine mechanism, re-earned here. Three
// attempts at something cleverer failed first and each failure is worth
// keeping:
//
//   1. Averaging per-observation KL inside a declared window. Bayesian
//      surprise is not additive; a windowed mean of KLs is not a quantity.
//   2. An i.i.d. multinomial null drawn from the prior. No real prose is
//      i.i.d., so every actual frame beat it and the whole book came back as
//      one window.
//   3. A decayed prior that decayed priorTotal but only the ARRIVING forms,
//      so p_prior stopped summing to 1 and KL came out negative.
//
// What eoreader5 does instead, and it works (5/21 on the frozen span golden,
// still the best measured there):
//
//   · history is a BOUNDED SLIDING WINDOW of recent units, not an
//     accumulation and not a decay over everything
//   · score = KL(unit || mean of that history)
//   · NO NULL. Ranking is the discrimination — you take the top of the field,
//     you never ask whether a single unit beats chance
//   · selection is STRATIFIED across the whole extent, because any top-N over
//     a document accumulates opening-chapter bias (measured: unmasked, 12/12
//     selected spans fell in the first 27.5% of War and Peace)
//
// The salience window is therefore set by surprise in the only sense that
// survived measurement: the field of scores decides which passages are
// windows, and how wide each one runs is how far its run of elevation
// extends — not a declared radius.

import { readFileSync } from "node:fs";
import { splitSentences, stripContainer } from "../packages/engine/perceiver/text/spans.js";
import { readForward } from "../packages/engine/emergence/activation.js";

const SENTENCES_PER_FRAME = 6;
const HISTORY = 40;   // bounded sliding window, in frames
const K = 18;         // strata, and therefore moments reported

const WORD_RE = /[\p{L}\p{N}']+/gu;
const words = (t) => String(t ?? "").toLowerCase().match(WORD_RE) ?? [];

const dist = (ws) => {
  const m = new Map();
  for (const w of ws) m.set(w, (m.get(w) ?? 0) + 1);
  for (const [w, c] of m) m.set(w, c / ws.length);
  return m;
};

const klDivergence = (observed, expected, epsilon = 1e-10) => {
  let kl = 0;
  for (const [t, p] of observed) {
    if (p <= 0) continue;
    const q = Math.max(expected.get(t) ?? epsilon, epsilon);
    kl += p * Math.log2(p / q);
  }
  return Math.max(0, kl);
};

const TEXT_PATH = process.argv[2] || "/Users/mlacy/Documents/Default Project/pg84.txt";
const { text } = stripContainer(readFileSync(TEXT_PATH, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));

const sentences = splitSentences(text);
const frames = [];
for (let i = 0; i < sentences.length; i += SENTENCES_PER_FRAME) {
  const g = sentences.slice(i, i + SENTENCES_PER_FRAME);
  if (g.length) frames.push({ order: frames.length, offset: g[0].offset, text: g.map((s) => s.text).join(" ") });
}

// ── one causal pass: KL against a bounded window of what was just read ──────
const history = [];
const scored = [];

for (const f of frames) {
  const ws = words(f.text);
  if (ws.length < 20) { history.push(ws); if (history.length > HISTORY) history.shift(); continue; }

  if (history.length > 0) {
    // PRIOR: belief before this frame — the mean distribution of the window.
    const meanOf = (frameList) => {
      const m = new Map();
      for (const h of frameList) for (const [w, p] of dist(h)) m.set(w, (m.get(w) ?? 0) + p);
      for (const [w, p] of m) m.set(w, p / frameList.length);
      return m;
    };
    const prior = meanOf(history);

    // POSTERIOR: belief AFTER reading it — the window advanced one step,
    // oldest dropped. With a bounded window each frame carries constant
    // weight, so belief-change stays comparable across the whole book
    // instead of shrinking as history piles up.
    const advanced = history.length >= HISTORY ? [...history.slice(1), ws] : [...history, ws];
    const posterior = meanOf(advanced);

    // Itti & Baldi: how far belief MOVED. Not how divergent the observation
    // was — that is the other lane, kept alongside so the two can be compared
    // rather than assumed to agree.
    scored.push({
      ...f,
      belief: klDivergence(posterior, prior),
      divergence: klDivergence(dist(ws), prior),
    });
  }

  history.push(ws);
  if (history.length > HISTORY) history.shift();
}

// ── stratified selection across the WHOLE extent ────────────────────────────
const lo = scored[0].offset;
const hi = scored[scored.length - 1].offset + 1;
const strata = Array.from({ length: K }, () => []);
for (const s of scored) {
  strata[Math.min(K - 1, Math.floor(((s.offset - lo) / (hi - lo)) * K))].push(s);
}
const moments = strata
  .map((b) => b.sort((a, c) => c.score - a.score)[0])
  .filter(Boolean)
  .sort((a, b) => a.offset - b.offset);

const { records } = readForward(frames);
const recalledAt = new Map(records.map((r) => [r.order, r.recalled]));

const scores = scored.map((s) => s.score).sort((a, b) => a - b);
console.log(`READING ${TEXT_PATH.split("/").pop()} — ${sentences.length} sentences, ${frames.length} frames`);
console.log(`scored ${scored.length} frames against a ${HISTORY}-frame sliding history`);
console.log(`KL field: median ${scores[Math.floor(scores.length / 2)].toFixed(3)}, max ${scores[scores.length - 1].toFixed(3)}`);
console.log(`${moments.length} moments, one per stratum across the whole arc\n`);

for (const m of moments) {
  const pct = ((m.offset / text.length) * 100).toFixed(1);
  const shown = m.text.length > 300 ? m.text.slice(0, 300).replace(/\s+\S*$/, "") + "…" : m.text;
  console.log(`── ${pct}%  KL ${m.score.toFixed(3)}  recalled ${recalledAt.get(m.order) ?? "—"} prior passages`);
  console.log(`   ${shown.replace(/\n/g, " ")}\n`);
}
