// eoreader6 · loops/time — not grain, not level: TIME. A growing fraction of
// the SAME material, read successively — more of the real thing seen each
// pass, same document, same identity throughout. This is the reader-
// assimilation loop (K passes). Extracted out of what was an unnamed loop
// inside scripts/ananda-run.mjs — same mechanism, now a first-class,
// reusable thing instead of one script's private implementation detail.

import { ground, pattern, volume, isGap } from "../../../nul/index.js";

// A large prime seed step: reseeds*draws must never equal it, or pattern()'s
// reseeding-null trial silently reconstructs the next pass's own ground —
// a real bug found and fixed this session (see git history).
const SEED_STEP = 104729;

export const timeLoop = ({ reduce, units, passes = 8, window = 12, draws = 200, reseeds = 5 }) => {
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

    if (material.length < window + 2) {
      results.push({ pass: p, fraction, gap: { reason: "not enough real material read yet", have: material.length, need: window + 2 } });
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

    results.push({ pass: p, fraction, chunks: material.length, ananda: volume(g), pattern: patternResult, ground: g });
    prevGround = g;
    prevMaterial = material;
  }

  return results;
};
