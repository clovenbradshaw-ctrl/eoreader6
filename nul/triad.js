// eoreader6 · the unit of record.
//
// Ground, figure, pattern. A ground is a nothing constructed by perturbing what
// is present; a figure is what differed from it; a pattern is the recurrence by
// which this difference is the same as another difference.
//
// There is no raw tier. `validateTriad` has no branch that admits a figure
// without its ground's perturbation, which is the point: an unearned claim is
// not refused here, it is unrepresentable.
//
// Nothing in this file mentions offsets, spans, characters, or names. A span is
// evidence inside a figure, in one modality, and it is not the unit. See SEED.md.

export const GAP_TYPES = Object.freeze([
  // structural — free to detect, checked before anything is measured
  "no_ground",
  "sealed_ground",
  "unreceived_origin",
  "wrong_phase",
  "unknown_perturbation",
  "empty_material",
  // measured
  "unresolved_pattern",
  "exceeds_witness",
]);

const GAP = Symbol.for("eoreader6.gap");

/**
 * A gap is a result, not a failure. It is the return value, never a throw —
 * throwing would make absence exceptional, and absence is the normal case.
 */
export const gap = (type, detail = {}) => {
  if (!GAP_TYPES.includes(type)) throw new TypeError(`unknown gap type: ${type}`);
  return Object.freeze({ [GAP]: true, gap: type, ...detail });
};

export const isGap = (x) => Boolean(x && x[GAP] === true);

/**
 * A ground is admissible iff it either cites the material it perturbed
 * (`constructed`) or declares where it was given from (`received`). The first
 * ground cannot be derived — that wall has been measured — so `received` is not
 * a fallback, it is the origin case.
 */
export const validateGround = (g) => {
  if (!g || typeof g !== "object") return gap("no_ground", { at: "validateGround" });
  if (!Array.isArray(g.samples) || g.samples.length === 0)
    return gap("no_ground", { reason: "a ground with no samples is a claim about nothing-in-general" });
  if (g.kind === "constructed") {
    if (!g.perturbation?.id) return gap("no_ground", { reason: "constructed ground without a perturbation" });
    if (g.from == null) return gap("unreceived_origin", { reason: "constructed ground cites no material" });
    return null;
  }
  if (g.kind === "received") {
    if (!g.provenance) return gap("unreceived_origin", { reason: "received ground names no giver" });
    return null;
  }
  return gap("no_ground", { reason: `unknown ground kind: ${g.kind}` });
};

export const validateFigure = (f) => {
  if (!f || typeof f !== "object") return gap("no_ground", { at: "validateFigure" });
  if (!Array.isArray(f.grounds) || f.grounds.length === 0)
    return gap("no_ground", { reason: "no figure without a ground" });
  for (const g of f.grounds) {
    const bad = validateGround(g);
    if (bad) return bad;
  }
  return null;
};

/**
 * A triad may carry `pattern: null`. That is not incompleteness — a difference
 * whose recurrence has not been established is honestly a `unresolved_pattern`
 * gap, and saying so is testimony.
 */
export const validateTriad = (t) => {
  if (!t || typeof t !== "object") return gap("no_ground", { at: "validateTriad" });
  const bad = validateFigure(t.figure);
  if (bad) return bad;
  for (const g of t.figure.grounds) {
    if (!g.sealed) return gap("no_ground", { reason: "testimony from an unsealed ground" });
  }
  return null;
};
