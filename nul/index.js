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
  "incommensurate_extent", // a null built over a different amount of material than the thing it is the null FOR
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
 * A windowed mean, with the order destroyed — the null a real windowed mean can
 * actually live inside.
 *
 * `burstiness` is a MAX over windows, so its null's support sits at the top of
 * the range and an ordinary real window falls below it. That is correct and
 * documented for clearing, where only surfeit counts. It is fatal for `level`,
 * which needs a RANK: measured on Frankenstein, 639 of 742 real windowed means
 * censored below the burstiness support and only 102 landed inside, so every
 * level() call gapped before the level question was reached. SEED.md lists
 * `level` under "not yet earned"; this is why. It was never missing an
 * implementation, it was missing a statistic its own figures could inhabit.
 *
 * Taking the first window of a PERTURBED series is exactly a windowed mean with
 * the order destroyed: under shuffle it is the mean of `window` elements drawn
 * without regard to position. Real windowed means depart from that null when
 * neighbouring values are correlated — which is what clustering IS — so
 * shuffling genuinely destroys what this measures, and SEED.md #4 is satisfied.
 * It is not shuffle-invariant the way a whole-series mean is: that returns the
 * same number for every draw and yields a null of zero width, the lineage's
 * most expensive dead end.
 *
 * Cheap as a side effect: O(window) rather than O(n·window).
 */
export const windowedMean = (series, { window }) => {
  if (!Number.isInteger(window) || window < 2 || window > series.length) return NaN;
  let s = 0;
  for (let i = 0; i < window; i++) s += series[i];
  return s / window;
};

export const STATISTICS = Object.freeze({ burstiness, windowedMean });

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
  if (samples.some((v) => !Number.isFinite(v))) return gap("unknown_spec", { reason: "window exceeds material", window });
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1])
    return gap("degenerate_ground", { reason: "zero width: this null would clear anything", statistic, perturbation });

  return Object.freeze({
    spec: Object.freeze({ perturbation, statistic, seed, draws, window }),
    from: fingerprint(material),
    // How much material this nothing was built by perturbing. Recorded because
    // SEED.md #5 turns out to bite harder than it reads: `window` is declared
    // so the statistic means one thing throughout, but the EXTENT still grows,
    // and a max-over-windows statistic grows with it. Two grounds over
    // different extents are not comparable unless the null grows the same way.
    extent: material.length,
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
 * Continue a material by drawing from what is already in it. Not a third
 * perturbation: it is `resample` asked for a length instead of the length it
 * happened to have. What it produces is the same regime, carried on — which is
 * exactly the counterfactual a growing ground needs its null to be.
 */
const continueBy = (material, k, seed) => {
  const next = rng(seed);
  const out = material.slice();
  for (let i = 0; i < k; i++) out.push(material[Math.floor(next() * material.length)]);
  return out;
};

/**
 * A difference that makes a difference.
 *
 * Did the figure move the next ground further than it would have moved anyway?
 * `opened` carries the sign: a difference that narrows the ground is still a
 * pattern, and it is extraction. Only widening is encounter.
 *
 * THE NULL MUST GROW THE WAY `after` GREW. This is the correction that cost the
 * most to find, so it is written down at length.
 *
 * SEED.md's statement of the null is "same spec, same material, fresh seed,"
 * and that is right for the case it was written for: two grounds over the SAME
 * material, where the only thing that moved them apart is the figure. But the
 * commonest real use is a reader accumulating material, where `after` is built
 * over MORE material than `before` — and burstiness is a max over windows, so
 * its expectation rises with extent for no reason but extent. Held at before's
 * n, the null then measures seed noise while `moved_by` measures seed noise
 * PLUS growth, and growth wins.
 *
 * What that looks like when you go and check: wired into atmosphere clearing,
 * this fired on homogeneous noise at almost exactly even spacing — boundaries
 * 28 apart, a clock, not a perception — and recovered 23 of Frankenstein's 24
 * chapter boundaries while ALSO recovering 21–23 of them from the same series
 * SHUFFLED. A statistic that scores the same on material whose order has been
 * destroyed is reading its own arithmetic. (scripts/two-clearings.mjs)
 *
 * So the null is grown to `after`'s extent by drawing from `before`'s own
 * material: the same regime, continued. Any displacement it shows is what
 * growth alone contributes, and `moved` is what survives subtracting it. This
 * is a CONDITIONAL null in the sense the lineage keeps having to relearn — it
 * varies along the exact axis the artefact exploits, where an unconditional one
 * is only a change of units. When the extents are equal it reduces to the
 * reseeding null with nothing added.
 *
 * `material` is BEFORE's own material, and that is checked rather than trusted:
 * handing in AFTER's material instead makes every null draw a sibling of
 * `after` — same material, different seed — so `moved` becomes a coin that
 * lands true about 1/(reseeds+1) of the time no matter what the material does.
 * That is a real bug this check was written to catch, and it caught one.
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
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});

  // Type error before null, both ways round (SEED.md #7).
  if (material.length !== before.extent)
    return gap("incommensurate_extent", {
      reason: "the null must be built over BEFORE's own material — anything else measures the wrong thing",
      given: material.length,
      before: before.extent,
      after: after.extent,
    });
  if (after.extent < before.extent)
    return gap("incommensurate_extent", {
      reason: "the later ground was built over LESS material: there is no growth for the null to match",
      before: before.extent,
      after: after.extent,
    });

  // A median is too robust to see reseeding at all: on a quantised statistic it
  // returns the same value for every seed, so the null comes out zero-width and
  // any displacement whatsoever reads as a pattern. Compare the whole shape.
  const displacement = (a, b) => {
    const grid = [0.1, 0.25, 0.5, 0.75, 0.9];
    return grid.reduce((s, q) => s + Math.abs(quantile(a.samples, q) - quantile(b.samples, q)), 0) / grid.length;
  };

  const grewBy = after.extent - before.extent;
  const moved_by = displacement(after, before);
  let nullMax = 0;
  for (let r = 1; r <= reseeds; r++) {
    const seed = before.spec.seed + r * before.spec.draws;
    const nullMaterial = grewBy === 0 ? material : continueBy(material, grewBy, seed);
    const g = reZero(before, { material: nullMaterial, seed });
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
    grewBy,
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

  // TWO FIGURES, NOT ONE OBSERVATION SHARED BETWEEN THEM.
  //
  // SEED.md's table says level is a difference against "another FIGURE's
  // ground" — two figures. This took one scalar and pushed it through both,
  // which is only meaningful when the two grounds are on the same scale, and
  // the case the growth rule exists for is exactly the case where they are
  // not: a candidate organ measures something else, in other units, by
  // definition. Causal surprisal is in microbits (~1e6); how many prior
  // passages answered is a count (~30). Every cross-measurement censored and
  // every organ came back `unstable` — 12 book-channel pairs, uniformly,
  // which is what a broken instrument looks like rather than a finding.
  //
  // So `observed` may be {own, target}: the same MOMENT, measured in each
  // series' own units. The comparison stays rank-based and is now genuinely
  // scale-free, which is what this was always documented to be.
  const paired = observed !== null && typeof observed === "object";
  const ownObserved = paired ? observed.own : observed;
  const targetObserved = paired ? observed.target : observed;

  const fig = difference(ownObserved, ownGround);
  if (isGap(fig)) return fig;

  const cross = difference(targetObserved, targetGround);
  if (isGap(cross)) return gap("unstable", { reason: "cross-measurement failed", detail: cross, paired });

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
