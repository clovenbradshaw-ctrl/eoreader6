import { difference, admissible, isGap, reZero, volume } from "../nul/index.js";

const CONTESTED_THRESHOLD = 0.1;

const rankVerdict = (observed, g) => {
  const fig = difference(observed, g);
  if (isGap(fig)) {
    if (fig.gap === "exceeds_witness") return { verdict: "contested", ...fig };
    return { verdict: "void", ...fig };
  }
  if (fig.rank < CONTESTED_THRESHOLD || fig.rank > 1 - CONTESTED_THRESHOLD) {
    return { verdict: "contested", ...fig };
  }
  return { verdict: "supported", ...fig };
};

const checkStability = (observed, g, reseeds) => {
  const base = rankVerdict(observed, g);
  if (base.verdict !== "supported") return false;
  const spec = g.spec;
  if (!spec) return false;
  for (let r = 1; r <= reseeds; r++) {
    const reseeded = reZero(g, { material: null, seed: spec.seed + r * spec.draws });
    if (isGap(reseeded)) return false;
    const v = rankVerdict(observed, reseeded);
    if (v.verdict !== "supported") return false;
  }
  return true;
};

export const verdict = (observed, g, options = {}) => {
  const { plural = [], reseeds = 0, spec } = options;
  const bad = admissible(g);
  if (bad && isGap(bad)) return { verdict: "void", ...bad };

  const v = rankVerdict(observed, g);
  if (v.verdict === "void") return v;

  if (plural.length > 0) {
    const all = [g, ...plural];
    const types = all.map((pg) => rankVerdict(observed, pg).verdict);
    const unique = new Set(types);
    if (unique.size > 1) {
      return Object.freeze({ verdict: "thrash", constituents: types, ground: g.spec ?? g.provenance });
    }
  }

  if (reseeds > 0 && v.verdict === "supported") {
    const stable = checkStability(observed, g, reseeds);
    if (stable) {
      return Object.freeze({
        verdict: "settled",
        spec: spec ?? g.spec ?? null,
        rank: v.rank,
        observed: v.observed,
        support: v.support,
        volume: v.volume,
      });
    }
  }

  return Object.freeze({ verdict: v.verdict, rank: v.rank, observed: v.observed, support: v.support, volume: v.volume });
};

export { CONTESTED_THRESHOLD };
