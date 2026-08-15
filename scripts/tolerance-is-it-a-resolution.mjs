// eoreader6 · tolerance-is-it-a-resolution — the one candidate the census found,
// put to spec 13's own test.
//
// WHERE THIS CANDIDATE CAME FROM. Not from reading. `scripts/resolution-census.mjs`
// walks 107 engine-tier source files, extracts every number the code itself
// declares never-defaulted (122 guard sites, 53 distinct numbers), and splits
// them on the code's own words — is the gloss a *resolution* or a threshold.
// Exactly one number is glossed as a resolution, is not one of SEED.md's three,
// and is a word SEED.md has never once contained:
//
//   tolerance   "the resolution of refusal is never a default"
//               packages/engine/loops/atmosphere.js · packages/engine/loops/turn.js
//
// `SEED.md` states "**No fourth declared number.** Three declared numbers
// still." twice, in two separate amendments. `runTurn` — the organ that fires
// all nine operators — requires a fourth, and its own TypeError calls it a
// resolution.
//
// THE QUESTION. Is `tolerance` a fourth resolution, or a policy threshold
// wearing the word? Spec 13 §1 says a resolution sets the finest distinction
// expressible; the three each report a censoring bound (`1/draws`, `1/reseeds`,
// and `window`'s own reach). A policy threshold sets where a line is drawn.
// The two are told apart by what escalating them does, and the difference is
// not subtle:
//
//   A RESOLUTION CONVERGES. Buying more of it makes the answer more nearly the
//   material's own — false verdicts fall while true ones survive, because you
//   are seeing more finely, not deciding more strictly.
//
//   A THRESHOLD TRADES. Buying more of it moves along a curve — false verdicts
//   and true ones fall together, because nothing about the seeing changed.
//
// So: plant a real regime change in one material and none in another, sweep
// each number, and read false-alarm rate against detection rate. This is an
// ROC separation and it is the standard device for exactly this distinction.
//
// PRE-REGISTERED, WRITTEN AND COMMITTED BEFORE THE SCRIPT WAS RUN:
//
//   T1  `tolerance` TRADES: as it rises, the false-alarm rate and the detection
//       rate fall together. Operationally, detection falls by at least half the
//       proportion the false-alarm rate does.
//   T2  `draws` — the Figure-grain resolution, on the same tracker, over the
//       same two materials — does NOT trade in that sense: its detection rate
//       holds up proportionally better than `tolerance`'s across a comparable
//       fall in false alarms.
//   T3  (the decision) If T1 and T2 both hold, `tolerance` is a threshold
//       wearing "resolution", `SEED.md`'s invariant survives, and the wrong
//       thing is `atmosphere.js`/`turn.js`'s own error message. If T1 fails —
//       if tolerance's detection holds up while its false alarms fall — it is a
//       fourth resolution and SEED.md's twice-stated invariant is false.
//
// Both outcomes are findings and neither is preferred here. What is NOT
// available is the third possibility this script exists to prevent: leaving a
// number glossed as a resolution, required by the engine's central loop, never
// tested against the invariant that says it cannot exist.
//
// WHAT IS DECLARED AND WHY (nothing here is chosen by what it does to a score):
// - The base spec is `two-clearings.mjs`'s, already this repo's declared
//   operating point for the regime tracker and reused verbatim by
//   `scripts/terrain-census.mjs`. Not picked here.
// - Detection = a re-zero within `2 * window` pushes after the planted
//   boundary. Declared, and stated in advance; a re-zero anywhere else on the
//   planted series is counted as a false alarm exactly as on the null series.
// - Extent and realisation count are set by what runs in about a minute. That
//   is a runtime choice, not a score choice, and it costs power (stated with
//   the result), not validity.

import { createRegimeTracker } from "../packages/engine/loops/atmosphere.js";

// ── declared, never defaulted — two-clearings.mjs's SPEC ───────────────────
const BASE = { window: 12, draws: 200, tolerance: 3, reseeds: 5, seed: 17, statistic: "burstiness", findOn: [] };
const EXTENT = 320;
const REALISATIONS = 8;
const SHIFT_AT = 0.5; // the planted boundary, mid-series
const SHIFT_BY = 0.6; // a level shift; burstiness is a max windowed mean, so it moves
const DETECT_WITHIN = (window) => 2 * window;

const SWEEPS = {
  tolerance: [1, 2, 3, 5, 8],
  draws: [50, 100, 200, 400, 800],
  window: [6, 12, 24],
};

const rngLocal = (seed) => {
  let a = (seed | 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const nullSeries = (seed) => {
  const r = rngLocal(seed);
  return Array.from({ length: EXTENT }, () => r());
};

const plantedSeries = (seed) => {
  const r = rngLocal(seed);
  const at = Math.floor(EXTENT * SHIFT_AT);
  return Array.from({ length: EXTENT }, (_, i) => r() + (i >= at ? SHIFT_BY : 0));
};

/** Every index at which this tracker conceded its ground. */
const rezeroIndices = (series, spec) => {
  const tracker = createRegimeTracker(spec);
  const out = [];
  series.forEach((x, i) => {
    if (tracker.push(x).rezeroed) out.push(i);
  });
  return out;
};

const runSetting = (spec) => {
  const at = Math.floor(EXTENT * SHIFT_AT);
  const within = DETECT_WITHIN(spec.window);
  let falseAlarms = 0;
  let pushes = 0;
  let detected = 0;
  let plantedFalseAlarms = 0;
  for (let i = 0; i < REALISATIONS; i++) {
    falseAlarms += rezeroIndices(nullSeries(20260815 + i * 7919), spec).length;
    pushes += EXTENT;
    const hits = rezeroIndices(plantedSeries(20260815 + i * 7919), spec);
    if (hits.some((h) => h >= at && h <= at + within)) detected++;
    plantedFalseAlarms += hits.filter((h) => h < at || h > at + within).length;
  }
  return {
    falsePer1000: (falseAlarms / pushes) * 1000,
    detection: detected / REALISATIONS,
    plantedFalsePer1000: (plantedFalseAlarms / (REALISATIONS * EXTENT)) * 1000,
  };
};

console.log("── tolerance-is-it-a-resolution ────────────────────────────────────");
console.log(`base spec (two-clearings.mjs): ${JSON.stringify(BASE)}`);
console.log(`extent ${EXTENT} · ${REALISATIONS} realisations per cell · planted shift +${SHIFT_BY} at ${SHIFT_AT * EXTENT}`);
console.log("PRE-REGISTERED: T1 tolerance TRADES (detection falls with false alarms)");
console.log("                T2 draws does not trade in that sense");
console.log("                T3 T1 & T2 → tolerance is a threshold, SEED's invariant survives\n");

const results = {};
for (const [knob, values] of Object.entries(SWEEPS)) {
  console.log(`── sweeping ${knob} ──`);
  results[knob] = [];
  for (const v of values) {
    const spec = { ...BASE, [knob]: v };
    const r = runSetting(spec);
    results[knob].push({ v, ...r });
    console.log(
      `  ${knob}=${String(v).padEnd(5)} false alarms ${r.falsePer1000.toFixed(2).padStart(6)}/1000 pushes   ` +
        `detection ${(r.detection * 100).toFixed(0).padStart(3)}%   (planted-series false alarms ${r.plantedFalsePer1000.toFixed(2)}/1000)`,
    );
  }
  console.log();
}

// ── the pre-registered readings ────────────────────────────────────────────
// "Trades" = across the swept range, detection falls by at least half the
// proportion the false-alarm rate falls by. A resolution buys the fall in
// false alarms without paying for it in detection.
const tradeRatio = (row) => {
  const first = row[0];
  const last = row[row.length - 1];
  if (!(first.falsePer1000 > 0)) return null;
  const faDrop = (first.falsePer1000 - last.falsePer1000) / first.falsePer1000;
  const detDrop = first.detection > 0 ? (first.detection - last.detection) / first.detection : 0;
  return { faDrop, detDrop, ratio: faDrop > 0 ? detDrop / faDrop : null };
};

console.log("── verdicts ────────────────────────────────────────────────────────");
for (const knob of Object.keys(SWEEPS)) {
  const t = tradeRatio(results[knob]);
  if (!t) {
    console.log(`${knob}: no false alarms at the low end — the trade question is unanswerable here (a gap, not a zero)`);
    continue;
  }
  console.log(
    `${knob.padEnd(10)} false alarms fell ${(t.faDrop * 100).toFixed(1)}% · detection fell ${(t.detDrop * 100).toFixed(1)}% · ` +
      `paid/bought = ${t.ratio === null ? "n/a" : t.ratio.toFixed(2)}  → ${t.ratio !== null && t.ratio >= 0.5 ? "TRADES" : "does not trade"}`,
  );
}

const tol = tradeRatio(results.tolerance);
const dr = tradeRatio(results.draws);
console.log(
  `\nT1 tolerance TRADES: ${tol && tol.ratio !== null && tol.ratio >= 0.5 ? "HELD" : "REFUSED"}` +
    `\nT2 draws does not trade as tolerance does: ${
      tol && dr && tol.ratio !== null ? (dr.ratio === null || dr.ratio < tol.ratio ? "HELD" : "REFUSED") : "unanswerable"
    }`,
);
