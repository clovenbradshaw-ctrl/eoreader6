// eoreader6 · sequence-of-sequences — does a GROUND BUILT OVER THE SEQUENCE OF
// PAST REGIMES improve prediction beyond candidate:regime-mean?
//
// This is not a new organ. It is a measurement, in the shape
// prediction/candidates.js already established, of a question raised outside
// the code: "the pattern of one level becomes the material of the next" — see
// nul's `objectify`/`nexus` — "does treating that next-level material as
// something to build a GROUND from (rather than just a bare running mean)
// carry any information a one-level reader does not already have?"
//
// THE MINIMAL CONTRAST. candidate:regime-sequence is IDENTICAL to
// candidate:regime-mean in centre and base spread (mean/stdev of the current
// regime's slice). The ONLY difference is a second multiplier on the spread,
// and that multiplier is deliberately NOT candidate:regime-ananda's mechanism
// (a bare ratio to a running mean of PER-STEP ananda). It is one level up:
//
//   regime-ananda / ananda-scaled   ratio to a running mean of the CURRENT
//                                   ground's volume, read every STEP.
//   regime-sequence (this file)     ratio to the CENTRE OF A GROUND built by
//                                   shuffling the SEQUENCE OF PAST REGIMES'
//                                   volumes — one number per CONCLUDED
//                                   regime, not per step. The null this ground
//                                   answers is "what would a random window of
//                                   past regimes' rooms average to", and the
//                                   current regime's own room is measured
//                                   against it exactly the way any figure is
//                                   measured against any ground.
//
// Two new declared numbers, WINDOW2 and DRAWS2 — the reach and resolution of
// the SECOND-LEVEL ground, over regimes rather than over raw material. Never
// defaulted, for the reason every other declared number here is not: a ground
// whose window silently followed how many regimes happened to exist so far
// would mean a different thing early and late in the same reading (SEED.md
// #5). They are set small (2 and 32) because regimes are RARE — a positive
// control sees a handful, real prose sees single digits — and that scarcity
// is reported, not hidden, in the gap-rate line each series prints.
//
// THE ORDER NULL. Beating regime-mean would not, on its own, mean the
// SEQUENCE (as opposed to the mere SET) of past regimes' volumes carries
// information — exactly the boundary/placement nulls in
// prediction/candidates.js exist to isolate placement from rate. Here the
// analogous move is: replay the series once, unscored, to find the true
// sequence of concluded-regime volumes; then, for R replicates, shuffle that
// sequence (same multiset, same count, order destroyed) and re-run the
// identical candidate reading off the shuffled assignment instead of the live
// one. Passing means the real order beats an arbitrary order of the same
// values; failing means whatever gain exists was the SET, not the SEQUENCE —
// and "sequence of sequences" was doing no more work than "distribution of
// distributions" would have.
//
// Run: node scripts/sequence-of-sequences.mjs [path-to-text.txt]

import fs from "node:fs";
import { ground, isGap } from "../nul/index.js";
import { createRegimeTracker } from "../packages/engine/loops/atmosphere.js";
import { createPredictionTask } from "../packages/engine/prediction/tasks.js";
import { defaultNumericBaselines, gaussianOrPoint } from "../packages/engine/prediction/baselines.js";
import { regimeMean } from "../packages/engine/prediction/candidates.js";
import { runPrequential } from "../packages/engine/prediction/run.js";
import { tokenize, chunkWords, causalSurprisalSeries } from "../packages/engine/perceiver/text/material.js";

// The five declared numbers this reading needs. None is a default.
const WINDOW = 6; // reach of the present, level 1 (regime-mean's own)
const DRAWS = 96; // resolution of testimony, level 1
const TOLERANCE = 2; // resolution of refusal (atmosphere's re-zero trigger)
const WARMUP = 24; // where the walk-forward may honestly begin
const WINDOW2 = 2; // reach of the present, level 2 — over CONCLUDED REGIMES
const DRAWS2 = 32; // resolution of testimony, level 2
const SCORING_RULE = "crps";
const REPLICATES = 8; // the order-null's own resolution

const prng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const gauss = (next) => {
  const u = Math.max(next(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
};

// The identical battery predictive-competency.mjs uses, same seeds, so a
// result here is comparable to RESULTS.md line for line.
const levelShift = (n, seed) => {
  const next = prng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const leg = Math.floor(i / 40);
    out.push((leg % 2 === 0 ? 0 : 4) + gauss(next));
  }
  return out;
};
const ar1 = (n, seed, phi = 0.7) => {
  const next = prng(seed);
  const out = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = phi * v + gauss(next);
    out.push(v);
  }
  return out;
};
const trend = (n, seed) => {
  const next = prng(seed);
  return Array.from({ length: n }, (_, i) => i * 0.25 + gauss(next) * 0.35);
};
const noise = (n, seed) => {
  const next = prng(seed);
  return Array.from({ length: n }, () => gauss(next));
};
const textSeries = (path, maxChunks = 320) => {
  const chunks = chunkWords(tokenize(fs.readFileSync(path, "utf8")), 40);
  return causalSurprisalSeries(chunks.slice(0, maxChunks)).filter(Number.isFinite);
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
};
const diffs = (xs) => {
  const out = [];
  for (let i = 1; i < xs.length; i++) out.push(xs[i] - xs[i - 1]);
  return out;
};
const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
};

/**
 * The level-2 ground's centre: the median of its samples. Derived from the
 * data the ground was built over, never a hand-set constant — the same
 * dimensionless-bridge discipline candidates.js states at its own header.
 */
const groundCentre = (g) => quantile(g.samples, 0.5);

/**
 * candidate:regime-sequence. Centre and base spread: regime-mean's, verbatim.
 * The multiplier: current regime's ananda, over the centre of a ground built
 * from shuffling the SEQUENCE OF PAST REGIMES' anandas — one value per
 * CONCLUDED regime, in the order they concluded.
 *
 * `assignOverride`, when supplied, is the order-null's hook: instead of
 * appending the regime's OWN concluded ananda, append
 * `assignOverride[regimeAnandas.length]` — same count, same causal moment,
 * different value. This is the one line that turns the live candidate into
 * its own null, matching the shape of `placementNull` in candidates.js.
 */
const regimeSequence = ({ window, draws, tolerance, window2, draws2, seed = 0, assignOverride = null }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  const regimeAnandas = [];
  let pendingAnanda = null;
  let gapSteps = 0; // how often the level-2 ground could not be built at all
  let usedSteps = 0;

  const conclude = () => {
    const value = assignOverride ? assignOverride[regimeAnandas.length] : pendingAnanda;
    if (value != null) regimeAnandas.push(value);
  };

  const fold = (x) => {
    const step = tracker.push(x);
    if (step.rezeroed) conclude();
    if (step.ananda != null) pendingAnanda = step.ananda;
    return step;
  };

  const ratio = () => {
    if (regimeAnandas.length < 2) return null; // level-2 ground needs window2=2 points, minimum
    const g2 = ground({ material: regimeAnandas, draws: draws2, window: window2, statistic: "windowMean", seed });
    usedSteps++;
    if (isGap(g2)) {
      gapSteps++;
      return null;
    }
    const a = tracker.ananda;
    const centre2 = groundCentre(g2);
    if (a == null || !Number.isFinite(centre2) || centre2 === 0) return null;
    return a / centre2;
  };

  return {
    id: assignOverride ? "candidate:regime-sequence-null" : "candidate:regime-sequence",
    prime: (warmupHistory) => {
      for (const x of warmupHistory) fold(x);
    },
    predict: (history) => {
      const slice = history.slice(tracker.regimeStart);
      const centre = slice.length < 2 ? history[history.length - 1] : mean(slice);
      const base = slice.length < 2 ? stdev(diffs(history)) : stdev(slice);
      const r = ratio();
      if (r == null || !Number.isFinite(r) || r <= 0) return gaussianOrPoint(centre, base);
      return gaussianOrPoint(centre, base * r);
    },
    observe: (x) => fold(x),
    state: () => ({
      regimeStart: tracker.regimeStart,
      rezeroCount: tracker.rezeroCount,
      concludedRegimes: regimeAnandas.length,
      level2Gaps: gapSteps,
      level2Attempts: usedSteps,
    }),
  };
};

/** Unscored replay: the true sequence of concluded-regime anandas, in order. */
const regimeAnandaSequenceOf = (series, { window, draws, tolerance, seed = 0 }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  const out = [];
  let pendingAnanda = null;
  for (const x of series) {
    const step = tracker.push(x);
    if (step.rezeroed && pendingAnanda != null) out.push(pendingAnanda);
    if (step.ananda != null) pendingAnanda = step.ananda;
  }
  return out;
};

const shuffled = (xs, seed) => {
  const next = prng(seed);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const fmt = (x, w = 9) => (x === null || x === undefined ? "—" : x.toFixed(3)).padStart(w);

const runOne = (name, series, expectation) => {
  const baselines = defaultNumericBaselines({ window: WINDOW });
  const candidates = [
    regimeMean({ window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, seed: 0 }),
    regimeSequence({ window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, window2: WINDOW2, draws2: DRAWS2, seed: 0 }),
  ];
  const task = createPredictionTask({
    target_type: "number",
    horizon: { kind: "walk-forward", h: 1 },
    scoring_rule: SCORING_RULE,
    baseline_ids: baselines.map((b) => b.id),
    population: name,
  });

  const result = runPrequential({
    series,
    candidates,
    baselines,
    task,
    warmup: WARMUP,
    scoring_rule: SCORING_RULE,
    population: name,
    source_versions: [`${name}:n=${series.length}`],
  });

  console.log(`\n=== ${name}  (${expectation})`);
  console.log(`    n=${series.length}  scored=${result.steps}  skipped=${result.skipped}  rule=${SCORING_RULE}`);
  const ids = result.records[0]?.baseline_ids ?? [];
  console.log(`    ${"".padEnd(26)}${ids.map((i) => i.replace("baseline:", "").padStart(11)).join("")}   verdict`);
  for (const rec of [...result.baseline_records, ...result.records]) {
    const gains = ids.map((i) => fmt(rec.competency_gain[i], 11)).join("");
    const own = result.records.includes(rec);
    const verdict = !own ? "" : rec.beats_all_baselines ? "  BEATS ALL BASELINES" : "  no";
    const label = rec.candidate_id.replace(/^(candidate|baseline):/, own ? "* " : "  ");
    console.log(`    ${label.padEnd(26)}${gains}${verdict}`);
  }

  const rm = result.records.find((r) => r.candidate_id === "candidate:regime-mean");
  const rs = result.records.find((r) => r.candidate_id === "candidate:regime-sequence");
  const gainOverRegimeMean = rm.cumulative_loss - rs.cumulative_loss;
  const state = candidates[1].state();
  console.log(
    `    regime-sequence vs regime-mean (the minimal contrast): ${fmt(gainOverRegimeMean, 14).trim()}  ` +
      `(concluded regimes seen: ${state.concludedRegimes}, level-2 ground built ${state.level2Attempts - state.level2Gaps}/${state.level2Attempts} attempts)`,
  );
  return { result, gainOverRegimeMean, state };
};

const path = process.argv[2];
const N = 320;

const battery = [
  ["level-shift", levelShift(N, 11), "POSITIVE control — real boundaries a mean can use"],
  ["ar1", ar1(N, 23), "NEGATIVE control — stationary, no regimes"],
  ["trend", trend(N, 37), "NEGATIVE control — structure, but no boundary"],
  ["noise", noise(N, 53), "NEGATIVE control — nothing to find"],
];
if (path && fs.existsSync(path)) battery.push(["frankenstein", textSeries(path), "REAL material"]);

console.log("Does a ground built over the SEQUENCE OF PAST REGIMES improve on regime-mean?");
console.log("competency gain = baseline (or regime-mean) cumulative loss − candidate cumulative loss.");
console.log("* marks a candidate; unmarked rows are baselines scored against each other.\n");
console.log(`declared: window=${WINDOW} draws=${DRAWS} tolerance=${TOLERANCE} warmup=${WARMUP} window2=${WINDOW2} draws2=${DRAWS2}`);

const results = battery.map(([name, series, expectation]) => runOne(name, series, expectation));

// ── the order null: same regime-ananda VALUES, arbitrary SEQUENCE ──────────
console.log("\n=== order null (regime-ananda sequence shuffled, count and multiset held fixed)");
console.log(`    ${REPLICATES} replicates per series, gain measured against candidate:regime-mean`);

for (let i = 0; i < battery.length; i++) {
  const [name, series] = battery[i];
  const trueSeq = regimeAnandaSequenceOf(series, { window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, seed: 0 });
  if (trueSeq.length < 2) {
    console.log(`    ${name.padEnd(16)} concluded regimes=${trueSeq.length} — too few to build a level-2 ground at all, null not applicable`);
    continue;
  }
  const baselines = defaultNumericBaselines({ window: WINDOW });
  const task = createPredictionTask({
    target_type: "number",
    horizon: { kind: "walk-forward", h: 1 },
    scoring_rule: SCORING_RULE,
    baseline_ids: baselines.map((b) => b.id),
    population: `${name}:order-null`,
  });

  const gains = [];
  for (let r = 0; r < REPLICATES; r++) {
    const scrambled = shuffled(trueSeq, 3000 + r);
    const candidates = [
      regimeMean({ window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, seed: 0 }),
      regimeSequence({
        window: WINDOW, draws: DRAWS, tolerance: TOLERANCE, window2: WINDOW2, draws2: DRAWS2, seed: 0,
        assignOverride: scrambled,
      }),
    ];
    const result = runPrequential({
      series, candidates, baselines, task, warmup: WARMUP, scoring_rule: SCORING_RULE,
      population: `${name}:order-null`, source_versions: [`${name}:n=${series.length}:replicate=${r}`],
    });
    const rm = result.records.find((x) => x.candidate_id === "candidate:regime-mean");
    const rs = result.records.find((x) => x.candidate_id === "candidate:regime-sequence-null");
    gains.push(rm.cumulative_loss - rs.cumulative_loss);
  }
  gains.sort((a, b) => a - b);
  const observed = results[i].gainOverRegimeMean;
  const max = gains[gains.length - 1];
  const clears = observed > max;
  console.log(
    `    ${name.padEnd(16)} concluded=${String(trueSeq.length).padStart(3)}  observed=${fmt(observed, 14)}  null-max=${fmt(max, 14)}  ->  ${clears ? "CLEARS" : "does not clear"}`,
  );
}

// ── joint reading ────────────────────────────────────────────────────────
console.log("\n=== joint reading");
const positiveRec = results[0].result.records.find((r) => r.candidate_id === "candidate:regime-sequence");
const negWins = results.slice(1, 4).filter((res) =>
  res.result.records.find((r) => r.candidate_id === "candidate:regime-sequence")?.beats_all_baselines,
).length;
console.log(
  `    candidate:regime-sequence — positive control beats all baselines: ${positiveRec.beats_all_baselines ? "yes" : "no"}` +
    `, negative controls won: ${negWins}/3  ->  ${positiveRec.beats_all_baselines && negWins === 0 ? "EARNED (on the baseline bar)" : "NOT EARNED (on the baseline bar)"}`,
);
console.log(
  `    against its OWN minimal contrast (regime-mean): ` +
    results.map((r, i) => `${battery[i][0]}=${r.gainOverRegimeMean > 0 ? "+" : ""}${r.gainOverRegimeMean.toFixed(1)}`).join("  "),
);
