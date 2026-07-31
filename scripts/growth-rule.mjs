// eoreader6 · growth-rule — DOES `activation` ACTUALLY JOIN?
//
// SEED.md: "An organ joins only when the level test returns `above` against the
// core. `peer` or `unstable` means it waits. Unwired is failing — a module
// nothing depends on is not early, it is refuted."
//
// activation/ was built, wired, and validated against an external reference,
// and that validation has since been retracted (see scripts/RESULTS.md). What
// was never run is the test the seed actually names. It is run here, and it is
// the right kind of work to do after a retraction: it consumes no external
// reference, cannot be swept, and asks a structural question rather than a
// statistical one.
//
// WHAT `level` ASKS. The same observation is measured against two grounds. If
// it is MORE extreme against the core's ground than against the organ's own,
// the organ is `above`: the core's nothing cannot anticipate what the organ
// perceives, so the organ adds a dimension rather than restating one. If the
// two grounds place it equally, they are `peer` — the organ is a re-description
// and does not join.
//
// Here: own = a ground over the candidate channel's series. target = a ground
// over causal surprisal, which is the core — the only channel the engine had
// before activation existed.
//
// The observation is drawn from ownGround's OWN samples, per the lesson already
// paid for in loops/family.js: any externally chosen scalar is liable to exceed
// a shuffle-null's support before the level question is even reached, and then
// the answer is about the scalar rather than about the grounds.
//
// AND THE SAME QUESTION ASKED BY A SECOND FAMILY. level() uses one perturbation,
// and SEED.md #6 is explicit that a bad perturbation fails invisibly and
// globally, so a relationship that does not survive being asked by a
// structurally different family (shuffle vs resample) has not been established.
// That is loops/family.js, and after tonight it would be indefensible to report
// a single-family result as a finding.
//
// Usage: node scripts/growth-rule.mjs

import { readFileSync } from "node:fs";
import { ground, level, isGap } from "../nul/index.js";
const FAMILIES = ["shuffle", "resample"];
import { causalSurprisalSeries, chunkWords, tokenize } from "../packages/engine/perceiver/text/material.js";
import { readForward, seriesOf } from "../packages/engine/emergence/activation.js";

const CHUNK = 100;
const WINDOW = 12;
// Placement saturates at 97% by 1600 draws for a stationary channel and stays
// at 86% at 400 — the earlier run was under-declared. For a NON-stationary one
// it never saturates, which is the point of reporting both below.
const DRAWS = 1600;
// windowedMean, not burstiness. A max-over-windows null has its support at the
// top of the range, so real observations censor below it and level() gaps before
// it is asked anything — measured: 639 of 742 below, 102 inside. See
// nul/index.js::windowedMean.
const STATISTIC = "windowedMean";

const BOOKS = [
  ["Frankenstein", "/home/user/eoreader4.2/tests/fixtures/frankenstein.txt"],
  ["Garoa (Basque)", "/home/user/eoreader4.2/tests/goldens/texts/basque-garoa.txt"],
  ["Heart of Darkness", "/home/user/eoreader4.2/tests/goldens/texts/heart-of-darkness.txt"],
];

console.log("SEED.md's growth rule: an organ joins only when level() returns `above` against");
console.log("the core. `peer` or `unstable` means it waits. The core here is causal surprisal.");
console.log(`chunk ${CHUNK} words, window ${WINDOW}, draws ${DRAWS}, statistic ${STATISTIC}\n`);

const verdicts = new Map();

for (const [name, path] of BOOKS) {
  let text;
  try {
    text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    console.log(`${name}: not on disk, skipped`);
    continue;
  }
  const chunks = chunkWords(tokenize(text), CHUNK);
  const core = causalSurprisalSeries(chunks);
  const { records } = readForward(chunks.map((ws, order) => ({ order, offset: order * CHUNK, words: ws })));

  // RAW AND RATE, SIDE BY SIDE. The raw counts are non-stationary by
  // construction — `recalled` correlates with position at r=0.995 — and a
  // shuffle null over a ramp tests the ramp. The rates ask the question the
  // counts were a proxy for: of the past that COULD have answered, how much
  // did. Both are reported because swapping quietly to the better-behaved
  // channel after seeing a verdict is the move this project retracted a
  // result for.
  const candidates = {
    "activation (raw)": seriesOf(records, "activation", { missing: 0 }),
    "reach (raw)": seriesOf(records, "reach", { missing: 0 }),
    "recalled (raw)": seriesOf(records, "recalled", { missing: 0 }),
    novelty: seriesOf(records, "novelty", { missing: 1 }),
    activationRate: seriesOf(records, "activationRate", { missing: 0 }),
    reachRate: seriesOf(records, "reachRate", { missing: 0 }),
    recalledRate: seriesOf(records, "recalledRate", { missing: 0 }),
  };

  console.log(`=== ${name} — ${chunks.length} frames`);
  const coreGround = ground({ material: core, draws: DRAWS, window: WINDOW, seed: 2, statistic: STATISTIC });
  if (isGap(coreGround)) {
    console.log(`  the CORE's own ground gapped (${coreGround.gap}) — nothing can be levelled against it here\n`);
    continue;
  }

  for (const [cname, series] of Object.entries(candidates)) {
    const own = ground({ material: series, draws: DRAWS, window: WINDOW, seed: 1, statistic: STATISTIC });
    if (isGap(own)) {
      console.log(`  ${cname.padEnd(17)} own ground gapped: ${own.gap} — ${own.reason ?? ""}`);
      continue;
    }
    // THE SAME MOMENTS, MEASURED IN EACH SERIES' OWN UNITS.
    //
    // The growth rule asks whether the core's nothing can anticipate what the
    // organ perceives. So take the moments the ORGAN finds most extreme, and
    // ask how the CORE's ground places those same moments. If the core also
    // finds them remarkable, the organ is restating it; if the core finds them
    // ordinary, the organ perceives something the core's ground cannot reach.
    //
    // Sampled across the WHOLE extent, never the top of one end: front-loading
    // is a documented failure in this lineage and a top-N over a document
    // accumulates opening-chapter bias for free.
    const windowedAt = (s, i) => {
      let sum = 0;
      for (let j = i; j < i + WINDOW; j++) sum += s[j];
      return sum / WINDOW;
    };
    const step = Math.max(1, Math.floor((series.length - WINDOW) / 60));
    const relations = {};
    let sampled = 0;
    for (let i = 0; i + WINDOW <= Math.min(series.length, core.length); i += step) {
      const lvAt = level({ own: windowedAt(series, i), target: windowedAt(core, i) }, own, coreGround);
      sampled++;
      const k = isGap(lvAt) ? `gap:${lvAt.gap}` : lvAt.relationship;
      relations[k] = (relations[k] ?? 0) + 1;
    }
    const ranked = Object.entries(relations).sort((a, b) => b[1] - a[1]);
    const rel = ranked[0][0];
    const share = ranked[0][1] / sampled;

    // THE SAME QUESTION, ASKED BY A STRUCTURALLY DIFFERENT FAMILY.
    //
    // SEED.md #6: a bad perturbation fails invisibly and globally, so a
    // relationship that does not survive shuffle-vs-resample has not been
    // established. loops/family.js does this for a single unpaired scalar,
    // which cannot work across incommensurate channels for the same reason
    // level() could not — so the paired form is done here directly over the
    // same sampled moments, rather than printing that helper's `unstable`
    // beside every row where it would read as evidence.
    const fams = FAMILIES.map((perturbation) => {
      const o = ground({ material: series, draws: DRAWS, window: WINDOW, seed: 11, perturbation, statistic: STATISTIC });
      const c = ground({ material: core, draws: DRAWS, window: WINDOW, seed: 12, perturbation, statistic: STATISTIC });
      if (isGap(o) || isGap(c)) return `${perturbation}=GAP`;
      const tally = {};
      let n = 0;
      for (let i = 0; i + WINDOW <= Math.min(series.length, core.length); i += step) {
        const lvAt = level({ own: windowedAt(series, i), target: windowedAt(core, i) }, o, c);
        n++;
        const k = isGap(lvAt) ? "gap" : lvAt.relationship;
        tally[k] = (tally[k] ?? 0) + 1;
      }
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      return { perturbation, rel: top[0], share: top[1] / n };
    });
    const famsStr = fams.map((f) => (typeof f === "string" ? f : `${f.perturbation}=${f.rel} ${(f.share * 100).toFixed(0)}%`)).join("  ");
    const bothAbove = fams.every((f) => typeof f !== "string" && f.rel === "above" && f.share > 0.5);

    // A modal verdict is not a verdict if it is barely modal. Requiring a
    // clear majority is not a tuned threshold — it is refusing to call a
    // three-way near-tie a relationship.
    const joins = rel === "above" && share > 0.5 && bothAbove;
    verdicts.set(`${name}·${cname}`, joins ? "joins" : `${rel} ${(share * 100).toFixed(0)}%`);

    const spread = ranked.map(([k, n]) => `${k} ${((n / sampled) * 100).toFixed(0)}%`).join(", ");
    console.log(`  ${cname.padEnd(17)} over ${sampled} moments: ${spread}`);
    console.log(`  ${" ".repeat(17)} cross-family: ${famsStr}   →   ${joins ? "JOINS" : "WAITS"}`);
  }
  console.log("");
}

const joined = [...verdicts.entries()].filter(([, v]) => v === "joins");
console.log("=== verdict");
if (joined.length === 0) {
  console.log("  NOTHING JOINS. Every activation channel is `peer` or worse against the core,");
  console.log("  in every book. By SEED.md's growth rule that is not a delay, it is a refutation:");
  console.log("  the organ re-describes what causal surprisal already grounds rather than adding");
  console.log("  a dimension to it. Wiring it anyway is the thing the rule exists to prevent.");
} else {
  console.log(`  joins in ${joined.length}/${verdicts.size} book-channel pairs:`);
  for (const [k] of joined) console.log(`    ${k}`);
  console.log("  A channel that joins in one book and waits in another has not joined. The rule");
  console.log("  is about the organ, not about a text.");
}
