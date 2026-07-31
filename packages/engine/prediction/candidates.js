// eoreader6 · prediction/candidates — this engine's own organs, as predictors.
//
// Nothing in this file came from eoreader5. The substrate around it did: the
// scoring rules, the baselines, the commitment seal, the prequential ledger.
// This is the part that has to be earned here, and it is the only part that
// answers the question the substrate exists to ask — does anything eoreader6
// actually does improve a prediction?
//
// SEED.md's growth rule says an organ joins only when the level test returns
// `above` against the core, and that "unwired is failing — a module nothing
// depends on is not early, it is refuted." Import-graph wiring is the cheap
// half of that. This is the expensive half: each candidate below is one organ
// reduced to a committed predictive distribution, so `above` becomes a number
// with a baseline underneath it instead of a claim.
//
// Every candidate is built as a MINIMAL CONTRAST with a baseline it is meant
// to be read against. That is the whole design discipline here — if a
// candidate differs from its control in two ways at once, its competency gain
// cannot be attributed to either, and the measurement was wasted:
//
//   candidate:regime-mean   vs  baseline:moving-mean-W / baseline:global-mean
//       Identical estimator (mean of a trailing slice, spread from that slice).
//       The ONLY difference is where the slice starts: a fixed window, or all
//       of history, versus the point at which atmosphere last conceded its
//       ground. So the gain measures exactly one thing — whether the re-zero
//       boundaries are real.
//
//   candidate:ananda-scaled vs  baseline:last-value
//       Identical centre (the most recent value). The ONLY difference is the
//       spread. So the gain measures exactly one thing — whether the volume of
//       the ground carries information about how uncertain the next step is.
//       SEED.md calls ananda "the warmth you check for" and explicitly not a
//       gate or a score; this does not make it one. It asks a narrower
//       question: is it INFORMATIVE. A thing can be informative and still
//       never be a gate.
//
//   candidate:placement-rate vs candidate:regime-mean
//       Identical centre AND identical base spread (both are regime-mean's).
//       The ONLY difference is a second multiplier on the spread, derived from
//       how much of the CURRENT regime the ground has FAILED to place (the
//       non-PLACED rate, atmosphere's `placement`). So the gain measures
//       exactly one thing — whether "how often has my ground been failing
//       lately" carries information about how uncertain the NEXT step is,
//       beyond what the regime boundary already supplies. Read against
//       candidate:placement-null (below), whose tag sequence is the same
//       COUNT, shuffled — isolating whether the tags' PLACEMENT in the series
//       carries information, not just their rate.
//
//       WHICH OF THE THREE THIS ACTUALLY READS. atmosphere's placement is
//       ternary (PLACED / STRAINED / OTHER — see loops/atmosphere.js), and the
//       fold below uses all three, differently: OTHER is caught by the
//       `rezeroed` branch FIRST and resets both counters, so it never reaches
//       the numerator. What the ratio measures is therefore the WITHIN-REGIME
//       STRAINED RATE — how much this ground has been failing to place while
//       still standing — with OTHER as the boundary that starts the count
//       over and the typed gap entering neither side.
//
//       So OTHER enters only as a reset, never as a magnitude. Whether the
//       concessions themselves carry information — their spacing, their
//       density, time since the last one — is a DIFFERENT candidate with a
//       different minimal contrast, and has not been run.
//
//       MEASURED DEAD END — the MAGNITUDE variant, not the rate, was run and
//       REFUTED on 2026-07-31: a candidate that summed atmosphere's per-step
//       exceedance margin instead of counting failures (strain magnitude vs
//       strain rate, the same fold shape otherwise) gained 866,747 vs
//       moving-mean-6 on real prose where placement-rate gained 1,311,812.
//       The size of the load carried LESS than the fact of the load. Do not
//       silently retry it; the code was reverted. See RESULTS.md.
//
// On not smuggling in a constant. The ananda candidate needs ground volume
// (on the scale of windowed means) to modulate a one-step spread (on the scale
// of first differences), and any hand-picked bridge between those two scales
// would be precisely the hand-set constant that baselines.js and nul both
// refuse. So the bridge is derived: ananda enters only as a RATIO to its own
// running mean, which is dimensionless, and multiplies a spread the data
// supplied. If ground volume carries no information the ratio hovers near 1,
// the candidate collapses onto last-value, and the gain goes to approximately
// zero — the honest null result, reachable without anyone choosing a number.
//
// Pure: no clock, no randomness, no I/O, no ambient state.

import { ground, volume, isGap } from "../../../nul/index.js";
import { createRegimeTracker, PLACEMENT } from "../loops/atmosphere.js";
import { gaussianOrPoint } from "./baselines.js";

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

/**
 * A candidate is stateful in a way a baseline is not — the regime tracker
 * carries what it has conceded so far — so candidates are constructed as
 * { id, prime(warmupHistory), predict(history), observe(revealed, history) }
 * rather than as bare functions. `observe` is called ONLY with values that
 * have already been revealed and scored, which is what keeps the state causal:
 * the tracker can never contain information the predictor was not entitled to.
 *
 * `prime` exists for an alignment reason worth stating, because getting it
 * wrong is silent: a tracker's internal index is only meaningful as an index
 * into `history` if it has seen every earlier value. Start the walk at warmup
 * without priming and `regimeStart` counts from the wrong origin, so
 * `history.slice(regimeStart)` returns a slice that is off by exactly the
 * warmup length — a candidate that looks like it is working and is reading the
 * wrong window. It is primed with material that is already revealed by
 * definition, so this buys alignment without buying leakage.
 */

/**
 * atmosphere's re-zero boundaries, as a predictor. Mean and spread of history
 * since the last conceded ground. Read against baseline:moving-mean-W, whose
 * slice is a fixed length instead.
 */
export const regimeMean = ({ window, draws, tolerance, seed = 0 }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  return {
    id: "candidate:regime-mean",
    prime: (warmupHistory) => {
      for (const x of warmupHistory) tracker.push(x);
    },
    predict: (history) => {
      const slice = history.slice(tracker.regimeStart);
      // Before a regime has enough material to describe itself, this is
      // last-value — declared here rather than hidden, because an untended
      // fallback is how a candidate quietly becomes its own baseline and then
      // reports a gain of zero as if it had been tested.
      if (slice.length < 2) return gaussianOrPoint(history[history.length - 1], stdev(diffs(history)));
      return gaussianOrPoint(mean(slice), stdev(slice));
    },
    observe: (x) => tracker.push(x),
    state: () => ({ regimeStart: tracker.regimeStart, rezeroCount: tracker.rezeroCount }),
  };
};

/**
 * ananda as an uncertainty signal. Centre is the most recent value — identical
 * to baseline:last-value — so the entire difference between them is the spread.
 */
export const anandaScaled = ({ window, draws, seed = 0 }) => {
  const history_ananda = [];
  return {
    id: "candidate:ananda-scaled",
    // Nothing to align: this candidate holds no index into history, only a
    // running mean that is allowed to start empty and fill.
    prime: () => {},
    predict: (history) => {
      const centre = history[history.length - 1];
      const base = stdev(diffs(history));
      const g = ground({ material: history, draws, window, seed });
      const a = isGap(g) ? null : volume(g);
      if (a == null || history_ananda.length === 0) return gaussianOrPoint(centre, base);
      const ratio = a / mean(history_ananda);
      if (!Number.isFinite(ratio) || ratio <= 0) return gaussianOrPoint(centre, base);
      return gaussianOrPoint(centre, base * ratio);
    },
    observe: (_x, history) => {
      // The running mean ananda is compared against must not include the
      // current step's own value, or the ratio is centred by construction and
      // the candidate silently becomes last-value again.
      const g = ground({ material: history, draws, window, seed });
      if (!isGap(g)) history_ananda.push(volume(g));
    },
    state: () => ({ anandaObservations: history_ananda.length }),
  };
};

/**
 * Both organs at once: regime-relative centre, ananda-modulated spread. This
 * is NOT a minimal contrast against anything, and is included only so a
 * combined result can be compared to the two isolated ones — if it beats both,
 * the organs are carrying independent information; if it beats neither, at
 * least one of them was doing nothing the other was not.
 */
export const regimeAnanda = ({ window, draws, tolerance, seed = 0 }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  const history_ananda = [];
  return {
    id: "candidate:regime-ananda",
    prime: (warmupHistory) => {
      for (const x of warmupHistory) {
        const step = tracker.push(x);
        if (step.ananda != null) history_ananda.push(step.ananda);
      }
    },
    predict: (history) => {
      const slice = history.slice(tracker.regimeStart);
      const centre = slice.length < 2 ? history[history.length - 1] : mean(slice);
      const base = slice.length < 2 ? stdev(diffs(history)) : stdev(slice);
      const a = tracker.ananda;
      if (a == null || history_ananda.length === 0) return gaussianOrPoint(centre, base);
      const ratio = a / mean(history_ananda);
      if (!Number.isFinite(ratio) || ratio <= 0) return gaussianOrPoint(centre, base);
      return gaussianOrPoint(centre, base * ratio);
    },
    observe: (x) => {
      const step = tracker.push(x);
      if (step.ananda != null) history_ananda.push(step.ananda);
      return step;
    },
    state: () => ({ regimeStart: tracker.regimeStart, rezeroCount: tracker.rezeroCount }),
  };
};

/**
 * Shared plumbing for candidate:placement-rate and its null control below —
 * the two must compute centre and spread with IDENTICAL logic, or a difference
 * between them stops being attributable to the one thing in dispute (the tag's
 * SOURCE). `unplacedOf(i, step)` is the only place they differ: the live
 * version reads atmosphere's own placement off `step`; the null reads a
 * caller-supplied sequence instead, `i` steps in.
 */
const placementCandidate = ({ window, draws, tolerance, seed = 0, id, unplacedOf }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  let unplacedInRegime = 0;
  let pushesInRegime = 0;
  let i = 0;
  const history_unplacedRate = [];
  const fold = (step) => {
    if (step.rezeroed) {
      unplacedInRegime = 0;
      pushesInRegime = 0;
    } else if (isGap(step.placement)) {
      // A step with no ground to judge against was neither placed nor failed
      // to be placed. It enters NEITHER side of the rate: counting it in the
      // denominator alone would report "unjudgeable" as "placed" and dilute
      // the very quantity this candidate exists to read.
    } else {
      pushesInRegime++;
      if (unplacedOf(i, step)) unplacedInRegime++;
    }
    i++;
    if (pushesInRegime > 0) history_unplacedRate.push(unplacedInRegime / pushesInRegime);
  };
  return {
    id,
    prime: (warmupHistory) => {
      for (const x of warmupHistory) fold(tracker.push(x));
    },
    predict: (history) => {
      const slice = history.slice(tracker.regimeStart);
      const centre = slice.length < 2 ? history[history.length - 1] : mean(slice);
      const base = slice.length < 2 ? stdev(diffs(history)) : stdev(slice);
      const unplacedRate = pushesInRegime > 0 ? unplacedInRegime / pushesInRegime : null;
      if (unplacedRate == null || history_unplacedRate.length === 0) return gaussianOrPoint(centre, base);
      const ratio = unplacedRate / mean(history_unplacedRate);
      if (!Number.isFinite(ratio) || ratio <= 0) return gaussianOrPoint(centre, base);
      return gaussianOrPoint(centre, base * ratio);
    },
    observe: (x) => fold(tracker.push(x)),
    state: () => ({ regimeStart: tracker.regimeStart, rezeroCount: tracker.rezeroCount, unplacedInRegime, pushesInRegime }),
  };
};

/**
 * The rate at which the current ground has FAILED to place what arrived, as an
 * uncertainty signal. Centre and base spread are candidate:regime-mean's,
 * unmodified; the ONLY difference is a second multiplier on the spread — the
 * current regime's non-PLACED rate entered as a ratio to its own running mean,
 * the same dimensionless-bridge discipline as candidate:ananda-scaled, and for
 * the same reason: a hand-picked multiplier would be exactly the smuggled
 * constant baselines.js and nul both refuse.
 *
 * This is as close as this engine can honestly get to eoreader4.2's efference
 * copy, and the distance is worth stating. There, a commit emitted an output
 * AND a prediction of sensing it return, and SELF meant the loop closed. Here
 * nothing is emitted, so what is measured is the ground's grip on arrivals,
 * not a self. It is deliberately NOT named efference: that word carries an
 * authorship SEED.md's relativity debt says this module does not yet have.
 */
export const placementRate = ({ window, draws, tolerance, seed = 0 }) =>
  placementCandidate({
    window, draws, tolerance, seed,
    id: "candidate:placement-rate",
    unplacedOf: (_i, step) => step.placement !== PLACEMENT.PLACED,
  });

/**
 * The null for candidate:placement-rate: the same estimator, driven by a tag
 * SEQUENCE handed in rather than atmosphere's own live reading — same count of
 * unplaced tags, different positions. If the real candidate does not beat this,
 * whatever gain it has was the RATE of failures, not where they actually landed
 * — bookkeeping, not information.
 */
export const placementNull = ({ placementSequence, window, draws, tolerance, seed = 0, id = "candidate:placement-null" }) =>
  placementCandidate({
    window, draws, tolerance, seed, id,
    unplacedOf: (i) => placementSequence[i] !== PLACEMENT.PLACED,
  });

/**
 * The placement atmosphere would read at each step of `series`, in order — the
 * sequence candidate:placement-rate reads live and candidate:placement-null
 * reads shuffled. A plain replay, not a candidate: nothing here is scored, so
 * it may look at the whole series at once without leaking anything a predictor
 * could act on.
 */
export const placementSequenceOf = (series, { window, draws, tolerance, seed = 0 }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  return series.map((x) => tracker.push(x).placement);
};

/**
 * The permutation null for regime-mean: the same estimator, re-zeroing the same
 * NUMBER of times, at positions it was handed instead of positions atmosphere
 * found.
 *
 * This exists because regime-mean beating baseline:moving-mean-W does not, on
 * its own, mean the boundaries are real. Regime-mean's slice is typically much
 * longer than a fixed window, and on a mean-reverting series a longer slice
 * estimates the mean better for reasons that have nothing to do with where it
 * starts. So the fixed-window baseline answers "is a long adaptive slice better
 * than a short fixed one", which is not the question. Run against a null of
 * arbitrary boundaries with a matched count, the comparison finally isolates
 * the only thing in dispute: whether THESE positions are better than any
 * positions. SEED.md #4 in the predictive register — a statistic must be
 * sensitive to what its perturbation destroys, and what this perturbation
 * destroys is boundary placement while holding boundary count fixed.
 */
export const boundaryControl = (boundaries, id = "candidate:boundary-null") => {
  const sorted = [...boundaries].sort((a, b) => a - b);
  return {
    id,
    prime: () => {},
    predict: (history) => {
      let start = 0;
      for (const b of sorted) if (b <= history.length - 2) start = b;
      const slice = history.slice(start);
      if (slice.length < 2) return gaussianOrPoint(history[history.length - 1], stdev(diffs(history)));
      return gaussianOrPoint(mean(slice), stdev(slice));
    },
    observe: () => {},
    state: () => ({ rezeroCount: sorted.length }),
  };
};

/**
 * The suite, constructed fresh per series — every candidate carries state, so
 * reusing one across two series would let the first series' regimes leak into
 * the second's predictions.
 */
export const defaultCandidates = ({ window, draws, tolerance, seed = 0 }) => [
  regimeMean({ window, draws, tolerance, seed }),
  anandaScaled({ window, draws, seed }),
  regimeAnanda({ window, draws, tolerance, seed }),
  placementRate({ window, draws, tolerance, seed }),
];
