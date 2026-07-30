// eoreader6 · nul — the only module.
//
// One operation: difference against a nothing constructed by perturbing what is
// present. Three uses, distinguished only by what the difference is measured
// against:
//
//   figure   — difference from its own ground
//   pattern  — the difference that figure made to the next ground
//   level    — the difference one figure makes to another's ground   (not here yet)
//
// Pattern is Bateson's: a difference that makes a difference. Not "the same
// difference again" — that would need identity, which needs matching, which is
// string-thinking in a numeric coat. A figure earns pattern by changing what
// happens next, and the only next available is the ground.
//
// Two numbers are declared, never defaulted, because together they are the whole
// physiology: `draws` is the resolution of testimony (the finest rank sayable is
// 1/draws), and `reseeds` is the resolution of pattern. The third — how much
// material a ground is built over — is NOT the seed's to choose. Whoever hands
// material in has already declared the extent.
//
// Pure: no clock, no randomness, no I/O, no ambient state.
//
// Read SEED.md first. Especially before adding anything.

const GAP = Symbol.for("eoreader6.gap");

// Every entry below is the same act at a different grain: refusing a claim.
// See CUBE.md, "why this instrument earns its keep" — checked against real
// exemplars, not asserted.
export const GAP_TYPES = Object.freeze([
  "no_ground", // a figure without the perturbation that made its ground
  "kept_ground", // asked to perceive through a ground held for testimony
  "unreceived_origin", // cites neither the material it perturbed nor a giver
  "degenerate_ground", // zero width: a null that would clear anything
  "undeclared", // a resolution was left to a default
  "unknown_spec", // no such perturbation or statistic
  "empty_material",
  "exceeds_witness", // the rank is censored — the ground cannot place it
  "made_no_difference", // perceived, and therefore not testimony
  "unstable", // level()'s cross-measurement failed — the two grounds share no comparable footing
]);

export const gap = (type, detail = {}) => {
  if (!GAP_TYPES.includes(type)) throw new TypeError(`unknown gap type: ${type}`);
  return Object.freeze({ [GAP]: true, gap: type, ...detail });
};

export const isGap = (x) => Boolean(x && x[GAP] === true);

/** Deterministic. A ground that cannot be replayed cannot be testimony. */
const rng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Perturbations of what is present. No parametric family, no global mean and sd:
 * an unconditional null is a units change and preserves everything it was meant
 * to test.
 */
export const PERTURBATIONS = Object.freeze({
  shuffle: (material, seed) => {
    const next = rng(seed);
    const out = material.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  },
  resample: (material, seed) => {
    const next = rng(seed);
    return material.map(() => material[Math.floor(next() * material.length)]);
  },
});

/**
 * The statistic must be sensitive to what the perturbation destroys or the
 * ground is vacuous. A mean is shuffle-invariant: every draw returns the same
 * number, a ground of width zero that clears anything put in front of it — an
 * unconditional null wearing a different hat. Largest windowed mean is the
 * simplest honest choice for a series, and shuffling genuinely destroys it.
 */
export const burstiness = (series, { window }) => {
  if (!Number.isInteger(window) || window < 2 || window > series.length) return NaN;
  let best = -Infinity;
  for (let i = 0; i + window <= series.length; i++) {
    let s = 0;
    for (let j = i; j < i + window; j++) s += series[j];
    best = Math.max(best, s / window);
  }
  return best;
};

/**
 * Ordinal patterns (Bandt-Pompe). A window of `window` values is reduced to the
 * permutation that sorts it — magnitudes discarded, order kept. Ties break by
 * index, which is the standard choice and matters only on quantised material.
 */
const ordinalKey = (series, t, d) => {
  const idx = Array.from({ length: d }, (_, i) => i);
  idx.sort((a, b) => series[t + a] - series[t + b] || a - b);
  return idx.join(",");
};

/**
 * Reversing the series reverses each window, so the sorting permutation is read
 * backwards: position p becomes d-1-p. An involution on the pattern space, which
 * is what makes the reversed distribution a relabelling of the forward one
 * rather than a separate measurement.
 */
const reversedKey = (key, d) =>
  key.split(",").map((p) => d - 1 - Number(p)).join(",");

const patternCounts = (series, d) => {
  const counts = new Map();
  const slots = series.length - d + 1;
  for (let t = 0; t < slots; t++) {
    const k = ordinalKey(series, t, d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { counts, slots };
};

const factorial = (n) => {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
};

/**
 * The pattern space must be populable or the estimate is noise: fewer windows
 * than possible patterns means most bins are empty by arithmetic, not by
 * structure. Refused (NaN) rather than reported, so `ground` gaps instead of
 * building a null out of a counting artefact.
 */
const patternSpaceAdmissible = (series, d) =>
  Number.isInteger(d) && d >= 2 && d <= 8 && series.length - d + 1 >= factorial(d);

/**
 * ORDER. Normalised permutation entropy, in [0,1].
 *
 * Shuffle-sensitive by construction, and one-sided by theorem: shuffling a
 * series destroys dependence, and for a stationary source subadditivity gives
 * block entropy of the shuffled series >= that of the real one, with equality
 * iff independent. So a real series can only sit at or BELOW its own shuffle
 * null. Sitting below is `exceeds_witness` with direction "below" — regularity,
 * which SEED.md #8 warns must not be mistaken for surfeit. Here regularity is
 * the finding: the index is load-bearing.
 *
 * Note what this does NOT see: the pattern space is closed under reversal, so
 * reversing a series permutes the bins without changing the distribution's
 * entropy. This statistic is exactly blind to time's arrow. See `irreversibility`.
 */
export const permutationEntropy = (series, { window }) => {
  if (!patternSpaceAdmissible(series, window)) return NaN;
  const { counts, slots } = patternCounts(series, window);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / slots;
    h -= p * Math.log(p);
  }
  return h / Math.log(factorial(window));
};

/**
 * ARROW. Divergence between the ordinal-pattern distribution and its own
 * reversal image, in [0,1].
 *
 * Zero exactly when the distribution is reversal-symmetric — which is what a
 * time-reversible process has, however much memory it carries. A stationary
 * Gaussian AR process and a sine wave are both strongly ordered and both read
 * zero here; a ratchet does not.
 *
 * The quantity that literally is entropy production is the KL divergence
 * between forward and reverse path distributions (Crooks). This uses the
 * Jensen-Shannon form instead: same zero set, bounded, and finite when a
 * pattern occurs forward but never in reverse — which on finite material is
 * common and would send KL to infinity. A bounded surrogate for a real
 * thermodynamic quantity, named as such rather than passed off as the thing.
 *
 * On shuffled material the pattern distribution is uniform, uniform is its own
 * reversal image, so the null sits near zero and a real arrow is censored ABOVE
 * it: surfeit, in the sense the seed already uses.
 */
export const irreversibility = (series, { window }) => {
  if (!patternSpaceAdmissible(series, window)) return NaN;
  const { counts, slots } = patternCounts(series, window);
  const keys = new Set(counts.keys());
  for (const k of [...keys]) keys.add(reversedKey(k, window));

  let js = 0;
  for (const k of keys) {
    const p = (counts.get(k) ?? 0) / slots;
    const q = (counts.get(reversedKey(k, window)) ?? 0) / slots;
    const m = (p + q) / 2;
    if (p > 0) js += 0.5 * p * Math.log(p / m);
    if (q > 0) js += 0.5 * q * Math.log(q / m);
  }
  return js / Math.log(2);
};

export const STATISTICS = Object.freeze({ burstiness, permutationEntropy, irreversibility });

/**
 * `window` is the reach of the present — how much of the material is contemporary
 * with itself. It is declared, never derived from the material's length: a
 * statistic whose window follows `n` means a different thing before and after
 * material arrives, so the two grounds are silently incomparable and every
 * comparison between them is an artefact of growth. It is the third and last
 * declared number.
 */
const sameSpec = (a, b) =>
  a.perturbation === b.perturbation &&
  a.statistic === b.statistic &&
  a.draws === b.draws &&
  a.window === b.window;

const fingerprint = (m) =>
  `n${m.length}:${m.reduce((h, v) => (Math.imul(h ^ Math.round(v * 1e6), 16777619) | 0), 2166136261) >>> 0}`;

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
};

/** Construct a nothing by perturbing present material. */
export const ground = ({ material, draws, window, perturbation = "shuffle", statistic = "burstiness", seed = 0 }) => {
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });
  const perturb = PERTURBATIONS[perturbation];
  const stat = STATISTICS[statistic];
  if (!perturb) return gap("unknown_spec", { perturbation });
  if (!stat) return gap("unknown_spec", { statistic });

  const samples = [];
  for (let d = 0; d < draws; d++) samples.push(stat(perturb(material, seed + d), { window }));
  if (samples.some((v) => !Number.isFinite(v)))
    return gap("unknown_spec", { reason: "the statistic could not be formed at this window", statistic, window });
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1])
    return gap("degenerate_ground", { reason: "zero width: this null would clear anything", statistic, perturbation });

  return Object.freeze({
    spec: Object.freeze({ perturbation, statistic, seed, draws, window }),
    from: fingerprint(material),
    samples: Object.freeze(sorted),
    kept: false,
  });
};

/**
 * The origin cannot be derived. Three independent mechanisms tried and every one
 * collapsed toward the material's own vocabulary at r ≈ 0.974. A first ground is
 * a gift and must name its giver.
 */
export const received = ({ samples, provenance }) => {
  if (!Array.isArray(samples) || samples.length < 2) return gap("no_ground", { reason: "received nothing" });
  if (!provenance) return gap("unreceived_origin", { reason: "names no giver" });
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1]) return gap("degenerate_ground", { provenance });
  return Object.freeze({ provenance, samples: Object.freeze(sorted), kept: false });
};

export const admissible = (g) => {
  if (!g || typeof g !== "object" || !Array.isArray(g.samples) || g.samples.length < 2)
    return gap("no_ground", {});
  if (!g.spec && !g.provenance) return gap("unreceived_origin", { reason: "cites neither material nor giver" });
  if (g.spec && g.from == null) return gap("unreceived_origin", { reason: "constructed but cites no material" });
  return null;
};

/**
 * Keeping is what makes a ground testimony — and what makes it unfit to perceive
 * through. Replay reconstructs a ground from its retained spec; it never reuses
 * the kept samples. That is why this one boolean is the whole phase rule: an
 * unkept ground is still in the silence, a kept one has returned and may speak.
 */
export const keep = (g) => Object.freeze({ ...g, kept: true });

/**
 * A fresh nothing over the same material — never the stored one reused.
 * The named trigger for this ("censored above is surfeit") is the Ramakrishna
 * cell in CUBE.md: unravel the frame, return and cultivate.
 */
export const reZero = (g, { material, seed }) =>
  ground({ ...g.spec, material, seed: seed ?? g.spec.seed + g.spec.draws });

/**
 * Ananda is the room left to be surprised in. Interquartile, not range: range
 * grows without bound in `draws`, which would make the vital sign partly a
 * measure of how many times we sampled.
 */
export const volume = (g) => (g?.samples?.length ? quantile(g.samples, 0.75) - quantile(g.samples, 0.25) : 0);

/**
 * Where the observation sits in its own nothing.
 *
 * Outside the support the rank is CENSORED, not unmeasurable — the magnitude is
 * right there and reporting it is honest; what the ground cannot supply is a
 * place. Censored above is surfeit and is the trigger to re-zero: the honest
 * silence of a witness who was present and cannot say how much. Censored below
 * is its opposite, regularity, and must not be mistaken for it.
 */
export const difference = (observed, g) => {
  const bad = admissible(g);
  if (bad) return bad;
  if (g.kept) return gap("kept_ground", { reason: "cannot perceive through a ground held for testimony" });
  if (!Number.isFinite(observed)) return gap("empty_material", { observed });

  const s = g.samples;
  const [lo, hi] = [s[0], s[s.length - 1]];
  const censoredAt = 1 / s.length;
  if (observed > hi) return gap("exceeds_witness", { observed, support: [lo, hi], direction: "above", censoredAt, reZero: true });
  if (observed < lo) return gap("exceeds_witness", { observed, support: [lo, hi], direction: "below", censoredAt });
  return Object.freeze({
    observed,
    support: Object.freeze([lo, hi]),
    rank: s.filter((v) => v >= observed).length / s.length,
    volume: volume(g),
  });
};

/**
 * A difference that makes a difference.
 *
 * Did the figure move the next ground further than merely re-zeroing would? The
 * null is the ground's own reseeding variation — same spec, same material, fresh
 * seed. `opened` carries the sign: a difference that narrows the ground is still
 * a pattern, and it is extraction. Only widening is encounter.
 */
export const pattern = ({ before, after, material, reseeds }) => {
  for (const g of [before, after]) {
    const bad = admissible(g);
    if (bad) return bad;
  }
  if (!Number.isInteger(reseeds) || reseeds < 2)
    return gap("undeclared", { what: "reseeds", why: "the resolution of pattern is never a default" });
  if (!before.spec || !after.spec) return gap("unreceived_origin", { reason: "a received ground has no reseeding null" });
  if (!sameSpec(before.spec, after.spec))
    return gap("unknown_spec", { reason: "two grounds built to different specs were never comparable" });

  // A median is too robust to see reseeding at all: on a quantised statistic it
  // returns the same value for every seed, so the null comes out zero-width and
  // any displacement whatsoever reads as a pattern. Compare the whole shape.
  const displacement = (a, b) => {
    const grid = [0.1, 0.25, 0.5, 0.75, 0.9];
    return grid.reduce((s, q) => s + Math.abs(quantile(a.samples, q) - quantile(b.samples, q)), 0) / grid.length;
  };

  const moved_by = displacement(after, before);
  let nullMax = 0;
  for (let r = 1; r <= reseeds; r++) {
    const g = reZero(before, { material, seed: before.spec.seed + r * before.spec.draws });
    if (isGap(g)) return g;
    nullMax = Math.max(nullMax, displacement(g, before));
  }
  if (nullMax === 0)
    return gap("degenerate_ground", {
      reason: "reseeding moves this ground not at all: a null of zero width would clear any displacement",
      reseeds,
    });

  const moved = moved_by > nullMax;
  return Object.freeze({
    moved,
    displacement: moved_by,
    reseedNull: nullMax,
    censoredAt: 1 / reseeds,
    opened: volume(after) > volume(before),
  });
};

/**
 * The third use of the one operation: another figure's ground.
 *
 * Two figures are measured by the SAME observation against two different grounds.
 * The relationship between the grounds is determined by how differently the
 * observation ranks. If the observation is more extreme against the target ground
 * than the figure's own, the figure's ground is "above" (it constrains what can
 * be perceived). If less extreme, it's "below" (the target enables more). If the
 * displacement is negligible, the grounds are "peer" — no level exists between
 * them. This is the first sheath: identity by consequence, never by appearance.
 *
 * For the growth rule: a candidate organ is "above" the core if its observation
 * ranks higher (more extreme) against the core's ground than against its own —
 * the core's ground cannot anticipate what the organ perceives.
 *
 * Returns { relationship, displacement, rank, cross } or a gap.
 */
export const level = (observed, ownGround, targetGround) => {
  const own = admissible(ownGround);
  if (own && isGap(own)) return own;
  const tgt = admissible(targetGround);
  if (tgt && isGap(tgt)) return tgt;
  if (ownGround.kept) return gap("kept_ground", { reason: "cannot level through a ground held for testimony" });
  if (targetGround.kept) return gap("kept_ground", { reason: "cannot level against a ground held for testimony" });

  const fig = difference(observed, ownGround);
  if (isGap(fig)) return fig;

  const cross = difference(observed, targetGround);
  if (isGap(cross)) return gap("unstable", { reason: "cross-measurement failed", detail: cross });

  const displacement = cross.rank - fig.rank;
  const threshold = 2 / ownGround.samples.length;

  let relationship;
  if (Math.abs(displacement) < threshold) relationship = "peer";
  else if (displacement > 0) relationship = "above";
  else relationship = "below";

  return Object.freeze({ relationship, displacement, threshold, rank: fig.rank, cross: cross.rank });
};

/**
 * Plural grounds for one figure are legal and their disagreement is the only
 * self-check here — all judgement now lives in the choice of perturbation, and a
 * bad perturbation fails invisibly and globally. Censored differences are kept,
 * not dropped: one perturbation calling something surfeit while another does not
 * is the most informative signal this system can produce.
 */
export const disagreement = (differences) => {
  const censored = differences.filter((d) => isGap(d) && d.gap === "exceeds_witness").length;
  const ranks = differences.filter((d) => !isGap(d)).map((d) => d.rank);
  if (differences.length < 2) return gap("no_ground", { reason: "one ground cannot disagree" });
  return Object.freeze({
    n: differences.length,
    censored,
    split: censored > 0 && ranks.length > 0,
    spread: ranks.length > 1 ? Math.max(...ranks) - Math.min(...ranks) : null,
  });
};

/**
 * Testify from a ground you kept.
 *
 * A difference that made no difference is not information, so it is not
 * testimony either. That refusal is the witness gate, rederived: the system may
 * perceive anything and may speak only of what changed the ground.
 *
 * Succeeding here requires binding to independent evidence (pattern.moved),
 * never generating an unsupported claim — see CUBE.md, "why this instrument
 * earns its keep."
 */
export const witness = ({ ground: g, figure, pattern: p }) => {
  const bad = admissible(g);
  if (bad) return bad;
  if (!g.kept) return gap("no_ground", { reason: "testimony from a ground that was never kept" });
  if (isGap(figure)) return figure;
  if (!figure || !Number.isFinite(figure.observed)) return gap("no_ground", { reason: "no figure" });
  if (!p || typeof p.moved !== "boolean") return gap("made_no_difference", { reason: "pattern not established" });
  if (!p.moved) return gap("made_no_difference", { displacement: p.displacement, reseedNull: p.reseedNull });
  return Object.freeze({ ground: g, figure, pattern: p });
};
