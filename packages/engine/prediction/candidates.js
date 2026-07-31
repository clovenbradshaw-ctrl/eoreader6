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
//   candidate:efference     vs  candidate:regime-mean
//       Identical centre AND identical base spread (both are regime-mean's).
//       The ONLY difference is a second multiplier on the spread, derived from
//       how much of the CURRENT regime has been self (the ground held, an
//       ordinary EVA-Tending step) versus world (a clearing — the observation
//       exceeded the ground's own witness). So the gain measures exactly one
//       thing — whether "how much has my own forecast been confirmed lately"
//       carries information about how uncertain the NEXT step is, beyond what
//       the regime boundary already supplies. This is the re-earned kernel of
//       eoreader4.2's efference copy (enactor/efference.js, enactor/monitor.js):
//       not "I spoke and later heard myself" — this engine authors no output
//       to hear back — but the part of that mechanism that survives without a
//       speaker: one held forecast, a match/no-match test against what
//       returns, and a self-run of matches damping how surprised the next
//       prediction is entitled to be. Read against candidate:efference-null
//       (below), whose self/world tag is the same COUNT, shuffled — isolating
//       whether the tag's placement carries information, not just its rate.
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
import { createRegimeTracker } from "../loops/atmosphere.js";
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
 * Shared plumbing for candidate:efference and its null control below — the
 * two must compute centre and spread with IDENTICAL logic, or a difference
 * between them stops being attributable to the one thing in dispute (the
 * cleared bit's SOURCE). `clearedOf(i, step)` is the only place they differ:
 * the live version reads atmosphere's own undelayed clearing test off `step`;
 * the null reads a caller-supplied sequence instead, `i` steps in.
 */
const efferenceCandidate = ({ window, draws, tolerance, seed = 0, id, clearedOf }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  let clearingsInRegime = 0;
  let pushesInRegime = 0;
  let i = 0;
  const history_worldRate = [];
  const fold = (step) => {
    if (step.rezeroed) {
      clearingsInRegime = 0;
      pushesInRegime = 0;
    } else {
      pushesInRegime++;
      if (clearedOf(i, step)) clearingsInRegime++;
    }
    i++;
    if (pushesInRegime > 0) history_worldRate.push(clearingsInRegime / pushesInRegime);
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
      const worldRate = pushesInRegime > 0 ? clearingsInRegime / pushesInRegime : null;
      if (worldRate == null || history_worldRate.length === 0) return gaussianOrPoint(centre, base);
      const ratio = worldRate / mean(history_worldRate);
      if (!Number.isFinite(ratio) || ratio <= 0) return gaussianOrPoint(centre, base);
      return gaussianOrPoint(centre, base * ratio);
    },
    observe: (x) => fold(tracker.push(x)),
    state: () => ({ regimeStart: tracker.regimeStart, rezeroCount: tracker.rezeroCount, clearingsInRegime, pushesInRegime }),
  };
};

/**
 * The re-earned kernel of eoreader4.2's efference copy — not a self-authored
 * output being sensed back (this engine authors no output to hear), but the
 * part of that mechanism that survives without one: a held forecast, a
 * match/no-match test against what returns, and a self-run of matches damping
 * how much uncertainty the next forecast is entitled to carry. Centre and
 * base spread are candidate:regime-mean's, unmodified; the ONLY difference is
 * a second multiplier on the spread — the CURRENT regime's clearing rate
 * (world) entered as a ratio to its own running mean, the same
 * dimensionless-bridge discipline as candidate:ananda-scaled, and for the
 * same reason: a hand-picked multiplier would be exactly the smuggled
 * constant baselines.js and nul both refuse.
 */
export const efferenceGated = ({ window, draws, tolerance, seed = 0 }) =>
  efferenceCandidate({ window, draws, tolerance, seed, id: "candidate:efference", clearedOf: (_i, step) => step.cleared });

/**
 * The null for candidate:efference: the same estimator, driven by a cleared
 * SEQUENCE handed in rather than atmosphere's own live test — same count of
 * self/world tags, different placement. If the real candidate does not beat
 * this, whatever gain it has was the RATE of clearings, not where they
 * actually landed — bookkeeping, not information.
 */
export const efferenceNull = ({ clearedSequence, window, draws, tolerance, seed = 0, id = "candidate:efference-null" }) =>
  efferenceCandidate({ window, draws, tolerance, seed, id, clearedOf: (i) => Boolean(clearedSequence[i]) });

/**
 * The cleared bit atmosphere would raise at each step of `series`, in order —
 * the sequence candidate:efference reads live and candidate:efference-null
 * reads shuffled. A plain replay, not a candidate: nothing here is scored, so
 * it may look at the whole series at once without leaking anything a
 * predictor could act on.
 */
export const clearedSequenceOf = (series, { window, draws, tolerance, seed = 0 }) => {
  const tracker = createRegimeTracker({ window, draws, tolerance, seed });
  return series.map((x) => tracker.push(x).cleared);
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
  efferenceGated({ window, draws, tolerance, seed }),
];
