// eoreader6 · prediction/scoring — proper scoring rules.
//
// Re-earned from eoreader5's packages/engine/prediction/scoring. The rules
// themselves are mathematics and do not change between repos; what is re-earned
// is the refusal discipline, which lands exactly on SEED.md #7 ("refusal has
// two tiers: type error before null"). A malformed distribution is an algebra
// violation and THROWS. A well-formed distribution whose kind has no proper
// rule is not an error — it returns { loss: null, proper: false } and the
// caller must decide, in the open, whether to fall back to a point loss. A
// point forecast is never laundered into a proper score.
//
// The predictive output is a tagged union so one reveal path serves every
// modality this engine perceives:
//
//   { kind: "point",       value }                    — a bare point estimate
//   { kind: "gaussian",    mean, sd }                 — a continuous density
//   { kind: "categorical", probs: { label: p, ... } } — a finite event mass
//   { kind: "quantiles",   levels: [{ tau, value }] } — predictive quantiles
//   { kind: "samples",     values: [n, ...] }         — an empirical ensemble
//
// "samples" matters more here than it did in v5: a nul ground IS an empirical
// ensemble — `ground().samples` is already a sorted draw from a constructed
// nothing — so this is the kind by which this engine's own organs enter a
// scored comparison at all. See ./candidates.js.
//
// Pure: no clock, no randomness, no I/O, no ambient state.

const TWO_PI = Math.PI * 2;

const assertFinite = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`scoring: ${label} must be a finite number`);
};

const assertDistribution = (dist) => {
  if (!dist || typeof dist !== "object" || Array.isArray(dist))
    throw new TypeError("scoring: predictive output must be an object");
  if (typeof dist.kind !== "string") throw new TypeError("scoring: predictive output needs a kind");
};

const normalPdf = (y, mean, sd) => {
  const z = (y - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(TWO_PI));
};

/** Standard normal cdf, Abramowitz & Stegun 7.1.26. */
const normalCdf = (x) => {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return 0.5 * (1 + Math.sign(x) * y);
};

const stdNormalPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(TWO_PI);

const improper = (rule, kind, note) => Object.freeze({ rule, loss: null, proper: false, kind, note });

/**
 * Logarithmic loss: −log p(observed). Lower is better. Proper for a density or
 * a finite mass; undefined for anything else, and reported as such.
 */
export const logLoss = (dist, observed) => {
  assertDistribution(dist);
  if (dist.kind === "gaussian") {
    assertFinite(dist.mean, "gaussian.mean");
    assertFinite(dist.sd, "gaussian.sd");
    if (dist.sd <= 0) throw new RangeError("scoring: gaussian.sd must be positive");
    assertFinite(observed, "observed");
    const density = normalPdf(observed, dist.mean, dist.sd);
    // log(0) underflow: the loss is enormous but must stay finite, or one
    // unlucky step would make every cumulative comparison downstream NaN.
    return Object.freeze({
      rule: "log-loss",
      loss: density > 0 ? -Math.log(density) : -Math.log(Number.MIN_VALUE),
      proper: true,
      kind: dist.kind,
    });
  }
  if (dist.kind === "categorical") {
    const p = dist.probs?.[observed];
    if (typeof p !== "number" || p < 0)
      throw new TypeError(`scoring: categorical output has no probability for ${JSON.stringify(observed)}`);
    return Object.freeze({
      rule: "log-loss",
      loss: p > 0 ? -Math.log(p) : -Math.log(Number.MIN_VALUE),
      proper: true,
      kind: dist.kind,
    });
  }
  return improper("log-loss", dist.kind, `log-loss undefined for a ${dist.kind} output`);
};

/** Brier: sum over labels of (p_k − 1[observed = k])². Lower is better; proper for a categorical. */
export const brierScore = (dist, observed) => {
  assertDistribution(dist);
  if (dist.kind !== "categorical") return improper("brier", dist.kind, "brier requires a categorical output");
  const probs = dist.probs ?? {};
  let loss = 0;
  for (const label of Object.keys(probs)) {
    assertFinite(probs[label], `probs.${label}`);
    loss += (probs[label] - (label === observed ? 1 : 0)) ** 2;
  }
  // An observed label that carried no probability at all still costs (0 − 1)².
  if (!(observed in probs)) loss += 1;
  return Object.freeze({ rule: "brier", loss, proper: true, kind: dist.kind });
};

/**
 * Continuous Ranked Probability Score. Closed form for a gaussian, empirical
 * estimator for an ensemble. Lower is better; proper.
 *
 * CRPS is the rule the comparisons in this repo default to, for a reason that
 * is about nul rather than about taste: a ground-derived candidate emits a
 * spread it derived itself, and an early, momentarily miscalibrated spread
 * sends log-loss to a near-infinite value that dominates every later step of a
 * cumulative sum. CRPS is in the units of the observable and degrades
 * gracefully, so a candidate that is well-located but badly scaled is
 * penalised proportionately instead of being annihilated by one step.
 */
export const crps = (dist, observed) => {
  assertDistribution(dist);
  assertFinite(observed, "observed");
  if (dist.kind === "gaussian") {
    assertFinite(dist.mean, "gaussian.mean");
    assertFinite(dist.sd, "gaussian.sd");
    if (dist.sd <= 0) throw new RangeError("scoring: gaussian.sd must be positive");
    const z = (observed - dist.mean) / dist.sd;
    return Object.freeze({
      rule: "crps",
      loss: dist.sd * (z * (2 * normalCdf(z) - 1) + 2 * stdNormalPdf(z) - 1 / Math.sqrt(Math.PI)),
      proper: true,
      kind: dist.kind,
    });
  }
  if (dist.kind === "samples") {
    const xs = dist.values;
    if (!Array.isArray(xs) || xs.length === 0) throw new TypeError("scoring: samples.values must be non-empty");
    // CRPS = E|X − y| − ½E|X − X'|, over the ensemble.
    let term1 = 0;
    for (const x of xs) {
      assertFinite(x, "samples.value");
      term1 += Math.abs(x - observed);
    }
    term1 /= xs.length;
    let term2 = 0;
    for (const a of xs) for (const b of xs) term2 += Math.abs(a - b);
    term2 /= 2 * xs.length * xs.length;
    return Object.freeze({ rule: "crps", loss: term1 - term2, proper: true, kind: dist.kind });
  }
  return improper("crps", dist.kind, "crps requires a gaussian or samples output");
};

/** Pinball loss over the declared quantile levels. Lower is better; proper. */
export const pinballLoss = (dist, observed) => {
  assertDistribution(dist);
  assertFinite(observed, "observed");
  if (dist.kind !== "quantiles" || !Array.isArray(dist.levels) || dist.levels.length === 0)
    return improper("pinball", dist.kind, "pinball requires a quantiles output");
  let loss = 0;
  for (const { tau, value } of dist.levels) {
    assertFinite(tau, "quantile tau");
    assertFinite(value, "quantile value");
    if (tau <= 0 || tau >= 1) throw new RangeError("scoring: quantile tau must be in (0, 1)");
    const diff = observed - value;
    loss += diff >= 0 ? tau * diff : (tau - 1) * diff;
  }
  return Object.freeze({ rule: "pinball", loss: loss / dist.levels.length, proper: true, kind: dist.kind });
};

/** Collapse any distribution to its central value. */
const pointOf = (dist) => {
  switch (dist.kind) {
    case "point":
      assertFinite(dist.value, "point.value");
      return dist.value;
    case "gaussian":
      assertFinite(dist.mean, "gaussian.mean");
      return dist.mean;
    case "samples": {
      if (!Array.isArray(dist.values) || dist.values.length === 0)
        throw new TypeError("scoring: samples.values must be non-empty");
      return dist.values.reduce((a, b) => a + b, 0) / dist.values.length;
    }
    case "quantiles": {
      const mid = dist.levels?.find((l) => l.tau === 0.5) ?? dist.levels?.[Math.floor((dist.levels.length - 1) / 2)];
      if (!mid) throw new TypeError("scoring: quantiles output has no levels");
      return mid.value;
    }
    default:
      throw new TypeError(`scoring: cannot take a point of a ${dist.kind} output`);
  }
};

/** Squared error of the central value. Not proper — flagged, never laundered. */
export const squaredError = (dist, observed) => {
  assertDistribution(dist);
  assertFinite(observed, "observed");
  return Object.freeze({ rule: "squared-error", loss: (pointOf(dist) - observed) ** 2, proper: false, kind: dist.kind });
};

/** Absolute error of the central value. Not proper — flagged, never laundered. */
export const absoluteError = (dist, observed) => {
  assertDistribution(dist);
  assertFinite(observed, "observed");
  return Object.freeze({
    rule: "absolute-error",
    loss: Math.abs(pointOf(dist) - observed),
    proper: false,
    kind: dist.kind,
  });
};

export const SCORING_RULES = Object.freeze({
  "log-loss": logLoss,
  brier: brierScore,
  crps,
  pinball: pinballLoss,
  "squared-error": squaredError,
  "absolute-error": absoluteError,
});

/**
 * Score `observed` under `dist` by a named rule. Returns a frozen
 * { rule, loss, proper, kind, note? }. `loss` is null when the rule does not
 * apply to the emitted kind; the caller records that limitation rather than
 * treating an improper score as a proper one.
 */
export const score = (dist, observed, { rule = "crps" } = {}) => {
  const fn = SCORING_RULES[rule];
  if (!fn) throw new TypeError(`scoring: unknown scoring rule ${rule}`);
  return fn(dist, observed);
};
