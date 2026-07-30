// eoreader6 · nul — the only module.
//
// NUL is `Differentiate · Existence · Ground` — clearing the ground of
// existence. It is the first cell and, for now, the whole engine. Everything
// else waits until the level test says it is above this.
//
// Pure by construction: no Date.now, no Math.random, no I/O, no ambient state.
// A perturbation takes an explicit seed because a ground that cannot be
// replayed cannot be testimony. Phase is a parameter, never a global.
//
// The three refusals that are enforced here rather than described:
//   · a figure cannot exist without the perturbation that made its ground
//   · a sealed (kept) ground cannot be perceived through, only testified from
//   · witness and zeroing cannot happen in the same act
//
// Read SEED.md first. Especially before adding anything.

import { gap, isGap, validateGround, validateFigure, validateTriad } from "./triad.js";

export { gap, isGap } from "./triad.js";
export { GAP_TYPES, validateGround, validateFigure, validateTriad } from "./triad.js";

/**
 * Witness on the return, zero in the silence, never both at once. Two phases,
 * so there is no arbitration to design.
 */
export const PHASES = Object.freeze(["zeroing", "witnessing"]);

/** Deterministic PRNG. Purity is inherited, not negotiated. */
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
 * Perturbations of what is present. No parametric family, no z-table, no global
 * mean and sd: an unconditional null is a units change and preserves everything
 * it was meant to test. The nothing must be built out of this material.
 */
export const PERTURBATIONS = Object.freeze({
  shuffle: {
    id: "shuffle",
    apply(material, seed) {
      const next = rng(seed);
      const out = material.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  },
  resample: {
    id: "resample",
    apply(material, seed) {
      const next = rng(seed);
      return material.map(() => material[Math.floor(next() * material.length)]);
    },
  },
});

const fingerprint = (material) =>
  `n${material.length}:${material.reduce((h, v) => (Math.imul(h ^ Math.round(v * 1e6), 16777619) | 0), 2166136261) >>> 0}`;

/**
 * The statistic must be sensitive to the structure the perturbation destroys, or
 * the ground is vacuous. A mean is shuffle-invariant: perturb-then-average
 * yields the identical number every draw, a null of width zero that would
 * cheerfully clear anything. `burstiness` — the largest windowed mean — is the
 * simplest honest choice for a series, and shuffling genuinely destroys it.
 * Order-blind statistic plus order-destroying perturbation is the same error as
 * an unconditional null, wearing a different hat.
 */
export const burstiness = (series) => {
  const w = Math.max(2, Math.floor(series.length / 4));
  let best = -Infinity;
  for (let i = 0; i + w <= series.length; i++) {
    let s = 0;
    for (let j = i; j < i + w; j++) s += series[j];
    best = Math.max(best, s / w);
  }
  return best;
};

export const STATISTICS = Object.freeze({ burstiness });

/**
 * Construct a ground by perturbing present material. Illegal during witnessing:
 * you cannot re-zero and testify in the same act.
 */
export const constructGround = ({
  material,
  perturbation = "shuffle",
  statistic = "burstiness",
  seed = 0,
  draws = 64,
  phase = "zeroing",
}) => {
  if (phase !== "zeroing") return gap("wrong_phase", { attempted: "constructGround", phase });
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  const p = PERTURBATIONS[perturbation];
  if (!p) return gap("unknown_perturbation", { perturbation });
  const stat = STATISTICS[statistic];
  if (!stat) return gap("unknown_perturbation", { statistic });

  const samples = [];
  for (let d = 0; d < draws; d++) samples.push(stat(p.apply(material, seed + d)));
  return Object.freeze({
    kind: "constructed",
    perturbation: Object.freeze({ id: p.id, statistic, seed, draws }),
    from: fingerprint(material),
    samples: Object.freeze(samples),
    sealed: false,
  });
};

/**
 * The first ground is received, never derived. Deriving the origin is the wall
 * three independent mechanisms hit at r ≈ 0.974 — every one of them collapsed
 * toward the material's own vocabulary. A received ground is a gift and must
 * name its giver.
 */
export const receiveGround = ({ samples, provenance, phase = "zeroing" }) => {
  if (phase !== "zeroing") return gap("wrong_phase", { attempted: "receiveGround", phase });
  if (!Array.isArray(samples) || samples.length === 0) return gap("no_ground", { reason: "received nothing" });
  if (!provenance) return gap("unreceived_origin", { reason: "received ground names no giver" });
  return Object.freeze({
    kind: "received",
    provenance,
    samples: Object.freeze(samples.slice()),
    sealed: false,
  });
};

/** Sealing is what makes a ground testimony — and what makes it unfit to perceive through. */
export const seal = (ground) => Object.freeze({ ...ground, sealed: true });

/** Re-zero: a fresh ground over the same material, never the stored one reused. */
export const reZero = (ground, { material, phase = "zeroing" }) =>
  constructGround({
    material,
    perturbation: ground?.perturbation?.id ?? "shuffle",
    statistic: ground?.perturbation?.statistic ?? "burstiness",
    seed: (ground?.perturbation?.seed ?? 0) + (ground?.perturbation?.draws ?? 64),
    draws: ground?.perturbation?.draws ?? 64,
    phase,
  });

/**
 * Ananda is the volume of the ground: the room left to be surprised in.
 * Extraction narrows it, encounter widens it. Never a gate, never a score —
 * a vital sign.
 */
export const volume = (ground) => {
  if (!ground?.samples?.length) return 0;
  return Math.max(...ground.samples) - Math.min(...ground.samples);
};

/**
 * Sclerosis detector. A ground series that only ever tightens is a system on
 * its way to becoming an oracle: fluent, sourced, correct, and unable to be met.
 */
export const volumeTrend = (grounds) => {
  const vs = grounds.map(volume);
  if (vs.length < 2) return "indeterminate";
  return vs.every((v, i) => i === 0 || v <= vs[i - 1]) ? "closing" : "open";
};

/**
 * `exceeds_witness` is returned when the difference falls outside the ground's
 * entire support. That reads like the strongest possible finding and is
 * deliberately not reported as one: no retained sample can carry it, so
 * quantifying it would be fabrication. The honest utterance of a witness who
 * was present and cannot testify is a gap — and it is the trigger to re-zero.
 * Silence from surfeit, not from absence.
 */
export const difference = (observed, ground) => {
  const bad = validateGround(ground);
  if (bad) return bad;
  const { samples } = ground;
  const lo = Math.min(...samples);
  const hi = Math.max(...samples);
  if (observed > hi || observed < lo)
    return gap("exceeds_witness", { observed, support: [lo, hi], reZero: true });
  const beyond = samples.filter((s) => s >= observed).length / samples.length;
  return Object.freeze({ observed, support: [lo, hi], beyond, volume: volume(ground) });
};

/**
 * Perceive by difference from a ground you rebuild.
 *
 * Structural refusals are exhausted before anything is measured — type error
 * before null, always. A sealed ground is refused here without a single
 * arithmetic operation, because a system that perceives through a cached
 * nothing is a system whose nothing has become a thing.
 */
export const perceive = ({
  material,
  observed,
  grounds,
  perturbation,
  statistic = "burstiness",
  seed,
  phase = "zeroing",
}) => {
  if (phase !== "zeroing") return gap("wrong_phase", { attempted: "perceive", phase });

  let live = grounds;
  if (live) {
    for (const g of live) if (g?.sealed) return gap("sealed_ground", { reason: "cannot perceive through a kept ground" });
  } else {
    const g = constructGround({ material, perturbation, statistic, seed, phase });
    if (isGap(g)) return g;
    live = [g];
  }
  if (observed == null) {
    if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
    const stat = STATISTICS[statistic];
    if (!stat) return gap("unknown_perturbation", { statistic });
    observed = stat(material);
  }
  for (const g of live) {
    const bad = validateGround(g);
    if (bad) return bad;
  }

  const differences = live.map((g) => difference(observed, g));
  const surfeit = differences.find((d) => isGap(d) && d.gap === "exceeds_witness");
  if (surfeit) return surfeit;
  const anyGap = differences.find(isGap);
  if (anyGap) return anyGap;

  return Object.freeze({ observed, grounds: Object.freeze(live), differences: Object.freeze(differences) });
};

/**
 * Plural grounds for one figure are legal, and their disagreement is the only
 * self-check this system has. All judgement now lives in the choice of
 * perturbation; a bad perturbation fails invisibly and globally, which is worse
 * than a bad heuristic. This is the mitigation, and it is here from the start.
 */
export const disagreement = (figure) => {
  const ds = (figure?.differences ?? []).filter((d) => !isGap(d));
  if (ds.length < 2) return gap("unresolved_pattern", { reason: "one ground cannot disagree" });
  const bs = ds.map((d) => d.beyond);
  return Object.freeze({ spread: Math.max(...bs) - Math.min(...bs), n: ds.length });
};

/**
 * Testify from a ground you kept. Legal only on the return — speech is
 * structurally impossible inside the reset, which is what Ramakrishna's silence
 * actually was.
 */
export const witness = ({ figure, pattern = null, phase = "witnessing" }) => {
  if (phase !== "witnessing") return gap("wrong_phase", { attempted: "witness", phase });
  const bad = validateFigure(figure);
  if (bad) return bad;

  const sealedFigure = Object.freeze({ ...figure, grounds: Object.freeze(figure.grounds.map(seal)) });
  const triad = Object.freeze({ figure: sealedFigure, pattern });
  const invalid = validateTriad(triad);
  if (invalid) return invalid;
  if (pattern == null) return Object.freeze({ ...triad, gaps: Object.freeze([gap("unresolved_pattern", {})]) });
  return triad;
};
