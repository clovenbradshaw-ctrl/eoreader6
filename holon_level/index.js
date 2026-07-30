import { ground, admissible, isGap, gap, reZero, volume, level } from "../nul/index.js";

const prng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const regimeNull = (series, regime, spec, reseeds) => {
  const maxDisplacements = [];
  for (let r = 0; r < reseeds; r++) {
    const start = Math.floor(prng(r + 999)(series.length - (regime.end - regime.start)));
    const window = { start, end: start + (regime.end - regime.start) };
    const perturbed = [...series.slice(0, start), ...series.slice(start + (regime.end - regime.start))];
    const punctured = [...perturbed.slice(0, window.start), ...Array(window.end - window.start).fill(0), ...perturbed.slice(window.start)];
    const gNull = ground({ material: punctured, draws: spec.draws, window: spec.window, seed: r + 99999 });
    if (isGap(gNull)) continue;
    const gFull = ground({ material: series, draws: spec.draws, window: spec.window, seed: spec.seed });
    if (isGap(gFull)) continue;
    const disp = Math.abs(volume(gFull) - volume(gNull));
    maxDisplacements.push(disp);
  }
  return maxDisplacements.length > 0
    ? maxDisplacements.sort((a, b) => a - b)[Math.floor(maxDisplacements.length * 0.95)]
    : 0;
};

export const existenceDependencyTest = (series, regime, options = {}) => {
  const { draws = 128, window = 5, reseeds = 16 } = options;
  if (!Array.isArray(series) || series.length < 2) return gap("empty_material", { reason: "series too short" });
  if (regime.start < 0 || regime.end > series.length || regime.end <= regime.start)
    return gap("empty_material", { reason: "invalid regime range" });

  const spec = { perturbation: "shuffle", statistic: "burstiness", draws, window, seed: 0 };
  const gFull = ground({ material: series, ...spec });
  if (isGap(gFull)) return gFull;

  const degraded = [
    ...series.slice(0, regime.start),
    ...series.slice(regime.end),
  ];
  if (degraded.length < 2) return gap("empty_material", { reason: "regime covers too much of series" });
  const gDegraded = ground({ material: degraded, ...spec, seed: 1 });
  if (isGap(gDegraded)) return gDegraded;

  const null95 = regimeNull(series, regime, spec, reseeds);
  const actualDisp = Math.abs(volume(gFull) - volume(gDegraded));
  const exists = actualDisp > null95;

  return Object.freeze({
    exists,
    statistic: actualDisp,
    nullThreshold: null95,
    fullVolume: volume(gFull),
    degradedVolume: volume(gDegraded),
    regime,
  });
};

const regimeShuffled = (series, regime, spec, reseeds) => {
  const maxShifts = [];
  for (let r = 0; r < reseeds; r++) {
    const start = Math.floor(prng(r + 8888)() * Math.max(1, series.length - (regime.end - regime.start)));
    const window = { start, end: start + (regime.end - regime.start) };
    const inside = series.slice(regime.start, regime.end);
    const outside = [...series.slice(0, window.start), ...series.slice(window.end)];
    if (outside.length < 2) continue;
    const insideMean = inside.reduce((s, v) => s + v, 0) / inside.length;
    const outsideMean = outside.reduce((s, v) => s + v, 0) / outside.length;
    maxShifts.push(Math.abs(insideMean - outsideMean));
  }
  return maxShifts.length > 0
    ? maxShifts.sort((a, b) => a - b)[Math.floor(maxShifts.length * 0.95)]
    : 0;
};

export const possibilityConstraintTest = (series, regime, options = {}) => {
  const { reseeds = 16 } = options;
  if (!Array.isArray(series) || series.length < 2) return gap("empty_material", { reason: "series too short" });
  if (regime.start < 0 || regime.end > series.length || regime.end <= regime.start)
    return gap("empty_material", { reason: "invalid regime range" });

  const inside = series.slice(regime.start, regime.end);
  if (inside.length < 2) return gap("empty_material", { reason: "regime too small" });

  const outside = [...series.slice(0, regime.start), ...series.slice(regime.end)];
  if (outside.length < 2) return gap("empty_material", { reason: "no outside data" });

  const insideMean = inside.reduce((s, v) => s + v, 0) / inside.length;
  const outsideMean = outside.reduce((s, v) => s + v, 0) / outside.length;
  const actualShift = Math.abs(insideMean - outsideMean);

  const null95 = regimeShuffled(series, regime, {}, reseeds);

  return Object.freeze({
    constrains: actualShift > null95,
    insideMean,
    outsideMean,
    shift: actualShift,
    nullThreshold: null95,
    regime,
  });
};

export const holonLevelRelation = (existence, constraint) => {
  if (isGap(existence) || isGap(constraint)) return "unstable";
  const e = existence.exists;
  const c = constraint.constrains;
  if (e && c) return "above";
  if (!e && !c) return "peer";
  return "unstable";
};
