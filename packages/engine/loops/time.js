// eoreader6 · loops/time — not grain, not level: TIME. A growing fraction of
// the SAME material, read successively — more of the real thing seen each
// pass, same document, same identity throughout. This is the reader-
// assimilation loop (K passes). Extracted out of what was an unnamed loop
// inside scripts/aperture-run.mjs — same mechanism, now a first-class,
// reusable thing instead of one script's private implementation detail.

import { ground, pattern, volume, isGap } from "../../../nul/index.js";

// The cell this organ occupies on the operator grid (engine/operators.js):
// EVA · Paradigm · Tracing — the reader-assimilation loop: a growing fraction
// of the same material. Declared, checked by conformance.
export const CELL = Object.freeze({ op: "EVA", grain: "Pattern" });

// A large prime seed step: reseeds*draws must never equal it, or pattern()'s
// reseeding-null trial silently reconstructs the next pass's own ground —
// a real bug found and fixed this session (see git history).
const SEED_STEP = 104729;

export const timeLoop = ({ reduce, units, passes, window, draws, reseeds }) => {
  if (!Number.isInteger(passes) || passes < 1)
    throw new TypeError("timeLoop: passes is declared, never defaulted — how many growing-fraction reads to take is counted, not chosen");
  if (!Number.isInteger(window) || window < 2)
    throw new TypeError("timeLoop: window is the reach of the present — declared, never derived from material length");
  if (!Number.isInteger(draws) || draws < 2)
    throw new TypeError("timeLoop: draws is the resolution of testimony — the finest rank sayable is 1/draws");
  if (!Number.isInteger(reseeds) || reseeds < 2)
    throw new TypeError("timeLoop: reseeds is the resolution of pattern — declared, never defaulted");

  const results = [];
  let prevGround = null;
  // The PREVIOUS pass's material, retained because pattern()'s null is
  // before's — not after's. Passing the current pass's material made every
  // null draw a same-material sibling of `after` differing only by seed, so
  // `moved` came out a coin landing true about 1/(reseeds+1) of the time
  // whatever the document did. nul now refuses that call outright
  // (incommensurate_extent) instead of quietly answering it.
  let prevMaterial = null;

  for (let p = 0; p < passes; p++) {
    const fraction = (p + 1) / passes;
    const material = reduce(units, { fraction });

    // MINIMUM VIABLE GROUND — the same near-degenerate-null concern
    // loops/atmosphere's `groundFrom` and loops/turn's `buildAt` carry a fix
    // for, re-measured here rather than copied: at `window + 2` elements,
    // `burstiness` (the default statistic) has only 3 candidate sub-window
    // positions, so its bootstrap null comes back too narrow. There this
    // narrowness is read directly by `difference()` against an independent
    // next observation, which is what makes it a false REC/DEF almost by
    // construction. This loop never calls `difference()` — its only use of a
    // ground is `pattern()`, comparing THIS pass's ground to the previous
    // pass's — and pattern()'s own reseeding null (mean + 3·std of
    // reseed-displacement samples, nul/index.js) is built from the SAME
    // narrow-ground machinery over the SAME material, so a narrow ground
    // narrows the null right along with the signal. That mostly — not
    // entirely — cancels the effect.
    //
    // MEASURED, 2026-08-05: comparing `pattern().moved` at the old floor
    // (window+2) against a settled plateau (5*window) on iid noise, 300
    // trials each, `window + 2` is elevated but by far less than
    // difference()'s version of this defect: 7.3% vs 3.7% (window=5,
    // draws=256, reseeds=16, z=1.97), 6.3% vs 2.0% (window=6, draws=96,
    // reseeds=16, z=2.66), 6.7% vs 3.7% (window=12, draws=200, reseeds=5 —
    // scripts/aperture-run.mjs's own production SPEC, z=1.66) — real and
    // significant in two of three parameter sets, borderline in the third.
    // At `3 * window` the same comparison drops to z=0.42/1.01/-0.45 (all
    // non-significant, rates within a point of the plateau) — independently
    // confirming the multiplier atmosphere.js and turn.js also settled on,
    // not assuming it transfers.
    if (material.length < 3 * window) {
      results.push({ pass: p, fraction, gap: { reason: "not enough real material read yet", have: material.length, need: 3 * window } });
      continue;
    }

    const seed = p * SEED_STEP + 7;
    const g = ground({ material, draws, window, seed });
    if (isGap(g)) {
      results.push({ pass: p, fraction, gap: g });
      continue;
    }

    let patternResult = null;
    if (prevGround) {
      const pr = pattern({ before: prevGround, after: g, material: prevMaterial, reseeds });
      patternResult = isGap(pr)
        ? { gap: pr }
        : { moved: pr.moved, opened: pr.opened, displacement: pr.displacement, reseedNull: pr.reseedNull, grewBy: pr.grewBy };
    }

    results.push({ pass: p, fraction, chunks: material.length, aperture: volume(g), pattern: patternResult, ground: g });
    prevGround = g;
    prevMaterial = material;
  }

  return results;
};
