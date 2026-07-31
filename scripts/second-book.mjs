// eoreader6 · second-book — THE PRE-REGISTERED TEST.
//
// Frankenstein is burned as a test set. scripts/declared-present.mjs swept the
// reach of the present across two channels, three grains and five window
// values on it, and a parameter you have swept is a parameter you have fitted.
// The p≈0.000 that this project has been quoting is one cell out of that
// sweep, chosen before the alternatives were measured — which is not the same
// thing as chosen well, and cannot be told apart from it on one book.
//
// So: one book that has never been looked at, one configuration fixed in
// advance, no sweep, and whatever number comes out is the number.
//
// THE CONFIGURATION, DECLARED BEFORE RUNNING (and it is the one that won on
// Frankenstein, deliberately — the point is to give it its best shot):
//
//     chunk 100 words, present 12 units, hop 4 units,
//     tolerance 3, draws 200, reseeds 5, clearOn ["moved"]
//
// Two cells only: causal surprisal and recalled, causal match window. Nothing
// else is reported, because reporting more is how the sweep gets back in.
//
// THE PREDICTION, ALSO IN ADVANCE: if the Frankenstein result reflects
// something about how prose is structured, it transfers, and p is small on a
// Basque novel by a different author in a different century. If it was the
// sweep finding its best cell, it does not transfer, and p is unremarkable.
//
// A note on what this book is: Garoa is dialogue-heavy — median paragraph 8
// words against Frankenstein's 80. That makes it a genuinely independent
// sample of "prose", not a replication in disguise, and it is also why the
// paragraph-derived present cannot be used here at all (see below).
//
// Usage: node scripts/second-book.mjs

import { readFileSync } from "node:fs";
import { read } from "../packages/engine/loops/reader.js";
import { isGap } from "../nul/index.js";
import { causalSurprisalSeries, chunkWords, tokenize, paragraphWords } from "../packages/engine/perceiver/text/material.js";
import { readForward, seriesOf } from "../packages/engine/emergence/activation.js";
import { causalWindow, tightWindow, hits, precision, rotationNull, stats } from "./lib/surrogates.mjs";

const FROZEN = { chunkSize: 100, present: 12, hop: 4, tolerance: 3, draws: 200, reseeds: 5, seed: 17, clearOn: ["moved"] };

const BOOKS = [
  {
    name: "Garoa (Basque, Agirre 1912)",
    path: "/home/user/eoreader4.2/tests/goldens/texts/basque-garoa.txt",
    marker: /^[IVXLC]+\.[ \t]*$/,
  },
];

const scoreBook = ({ name, path, marker }) => {
  let text;
  try {
    text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    console.log(`\n${name}: not on disk, skipped`);
    return;
  }
  const words = tokenize(text);
  const chunks = chunkWords(words, FROZEN.chunkSize);

  let off = 0;
  const markerWords = [];
  for (const line of text.split("\n")) {
    if (marker.test(line)) markerWords.push(tokenize(text.slice(0, off)).length);
    off += line.length + 1;
  }
  const truth = [...new Set(markerWords.map((w) => Math.floor(w / FROZEN.chunkSize)))].filter((c) => c > 0).sort((a, b) => a - b);

  const paras = paragraphWords(text).sort((a, b) => a - b);
  const medianPara = paras[Math.floor((paras.length - 1) * 0.5)];

  console.log(`\n=== ${name}`);
  console.log(`${words.length} tokens → ${chunks.length} frames; ${truth.length} chapter markers; median paragraph ${medianPara} words`);

  const { records } = readForward(chunks.map((ws, order) => ({ order, offset: order * FROZEN.chunkSize, words: ws })));
  const channels = {
    "causal surprisal": causalSurprisalSeries(chunks),
    recalled: seriesOf(records, "recalled", { missing: 0 }),
  };

  const spec = { window: FROZEN.present, hop: FROZEN.hop, tolerance: FROZEN.tolerance };
  for (const [cname, series] of Object.entries(channels)) {
    const result = read(series, {
      consumption: { order: "sequential", unit: `${FROZEN.chunkSize}-word chunk`, present: FROZEN.present, basis: "frozen from the Frankenstein sweep; see header", rate: null },
      draws: FROZEN.draws, reseeds: FROZEN.reseeds, tolerance: FROZEN.tolerance, hop: FROZEN.hop, seed: FROZEN.seed, clearOn: FROZEN.clearOn,
    });
    if (isGap(result)) {
      console.log(`  ${cname.padEnd(18)} GAP — ${result.gap}`);
      continue;
    }
    const found = result.events.filter((e) => e.op === "REC").map((e) => e.at);
    for (const [label, w] of [["causal", causalWindow(spec)], ["tight", tightWindow(spec)]]) {
      const h = hits(found, truth, w);
      const rot = rotationNull(found, truth, w, series.length, 4);
      const rs = stats(rot);
      const p = rot.filter((x) => x >= h).length / rot.length;
      console.log(
        `  ${(label === "causal" ? cname : "").padEnd(18)} ${label.padEnd(6)} ${String(h).padStart(2)}/${truth.length} recall  ` +
          `${String(precision(found, truth, w)).padStart(2)}/${String(found.length).padStart(2)} prec  |  rotated ${rs.mean.toFixed(1)}±${rs.sd.toFixed(1)}  p≈${p.toFixed(3)}`
      );
    }
  }
};

console.log("PRE-REGISTERED. Config frozen from the Frankenstein sweep, stated in the header,");
console.log("not adjusted after seeing anything below. Two channels, two match windows, one book.");
console.log(JSON.stringify(FROZEN));

for (const b of BOOKS) scoreBook(b);

console.log(`
Read it as follows, and only as follows:
  small p   — the Frankenstein result reflects something about prose and transfers.
  large p   — it was the sweep finding its best cell on one book, and this
              project has been quoting a fitted number as a discovery.
There is no third reading available from one pre-registered book, and no
adjustment to the config that would not turn this back into a sweep.`);
