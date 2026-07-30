// eoreader6 · emergence/tiers — MEANING FOLDS ON ITSELF.
//
// Surprise is not computed differently at each altitude. It is the same
// operation — how far did the prior move — applied to priors that surprise
// itself built. Atmosphere, lens and paradigm are not outputs of surprise;
// they ARE priors, and their shift IS surprise at that altitude.
//
//   tier 0  the material          prior: whatever the perceiver reduces to
//   tier 1  ATMOSPHERE            prior: what tier 0's surprises accumulate into
//   tier 2  LENS                  prior: what tier 1's shifts accumulate into
//   tier 3  PARADIGM              prior: what tier 2's shifts accumulate into
//
// (Interpretation × Ground / Figure / Pattern — the terrain column that the
// ladder diagram had entirely unbuilt.)
//
// THE PROPAGATION RULE IS THE WITNESS GATE, not a threshold chosen here.
// SEED.md: "the system may perceive anything. It may speak only of what
// changed the ground." So an observation reaches tier N+1 only if it moved
// tier N further than tier N's OWN RECENT HISTORY of movement — a rank
// against itself, conditional, never a global constant. Sparsification
// upward is then structural: many frames, fewer atmospheres, fewer lenses,
// rare paradigm shifts. Rarity is earned, not configured.
//
// Higher tiers forget more slowly. A paradigm outlasts a lens outlasts an
// atmosphere. That is a real modelling claim, so gamma is declared per tier
// and never defaulted.

import { bayesianSurprise } from "./surprise.js";

const HISTORY = 60; // how much of its own movement a tier remembers, for the rank test

export const createTier = ({ name, gamma, quantile }) => {
  if (!Number.isFinite(gamma) || gamma <= 0 || gamma > 1)
    throw new TypeError(`createTier(${name}): gamma is declared in (0,1], never defaulted`);
  if (!Number.isFinite(quantile) || quantile <= 0 || quantile >= 1)
    throw new TypeError(`createTier(${name}): quantile is declared in (0,1) — it is the resolution of the witness gate`);
  return { name, gamma, quantile, prior: new Map(), total: 0, felt: [], shifts: 0, observations: 0 };
};

/**
 * Observe at one tier. Returns the surprise (prior movement) and whether it
 * passed that tier's own witness gate — i.e. whether it earns propagation.
 */
export const observe = (tier, arrival, { alpha = 1 } = {}) => {
  let arrivalTotal = 0;
  for (const v of arrival.values()) arrivalTotal += v;
  if (arrivalTotal === 0) return { surprise: null, passed: false };

  const surprise = tier.total > 0
    ? bayesianSurprise(tier.prior, tier.total, arrival, arrivalTotal, { gamma: tier.gamma, alpha })
    : null;

  // ── advance: EVERY form decays, not only the arriving ones ────────────────
  // Decaying the total while leaving absent forms untouched stops the
  // distribution summing to 1 and drives KL negative. Fixed twice in this
  // repo already; asserted below so it cannot recur silently.
  for (const [k, w] of tier.prior) tier.prior.set(k, w * tier.gamma);
  tier.total *= tier.gamma;
  for (const [k, c] of arrival) {
    tier.prior.set(k, (tier.prior.get(k) ?? 0) + c);
    tier.total += c;
  }
  tier.observations++;

  // ── the witness gate: did this move the tier more than the tier usually
  // moves? Rank against its own felt history, never a fixed number.
  let passed = false;
  if (surprise != null && tier.felt.length >= 12) {
    const sorted = [...tier.felt].sort((a, b) => a - b);
    const bar = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * tier.quantile))];
    passed = surprise > bar;
  }
  if (surprise != null) {
    tier.felt.push(surprise);
    if (tier.felt.length > HISTORY) tier.felt.shift();
  }
  if (passed) tier.shifts++;

  return { surprise, passed };
};

/**
 * A stack of tiers, folded. One observation enters at tier 0; each tier that
 * is moved past its own gate hands ITS arrival upward, so a tier only ever
 * sees what genuinely disturbed the one below it.
 *
 * Returns the per-tier result, so a caller can ask "what shifted, and how
 * high did it reach" — the altitude a passage reaches IS its significance,
 * and nothing separate needs to score it.
 */
export const foldThrough = (tiers, arrival, { alpha = 1 } = {}) => {
  const results = [];
  let carried = arrival;

  // The SAME evidence rises; what differs between tiers is how slowly they
  // forget it. An atmosphere is a fast-decaying accumulation, a paradigm a
  // slow one, and evidence only reaches a slow tier by having disturbed every
  // fast tier beneath it. So a paradigm shift is not a bigger event — it is
  // an event that survived being surprising all the way up.
  for (const tier of tiers) {
    const r = observe(tier, carried, { alpha });
    results.push({ tier: tier.name, ...r });
    if (!r.passed) break; // nothing to say upward: the ground did not change
  }

  return { results, reached: results.length, top: results[results.length - 1]?.tier ?? null };
};

/** Sanity the decay must satisfy; a tier that fails this has a broken prior. */
export const massIsConsistent = (tier, epsilon = 1e-6) => {
  let sum = 0;
  for (const v of tier.prior.values()) sum += v;
  return Math.abs(sum - tier.total) <= epsilon * Math.max(1, tier.total);
};
