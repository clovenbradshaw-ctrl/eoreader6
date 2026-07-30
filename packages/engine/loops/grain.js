// eoreader6 · loops/grain — not time, not level: GRAIN. The Von Neumann
// containment chain, validated as its own conformance suite
// (conformance/voidification.test.js): Figure requires one real Ground.
// Pattern requires two real Grounds (Figure's own ground and the next one).
// Witness requires a KEPT ground, a real Figure, and a MOVED Pattern — all
// three, together, or it refuses (SEED.md: "All three terms, or it is not
// a record"). This walks that chain explicitly, one call, instead of
// leaving every call site to re-derive the ordering by hand — which is how
// the same incommensurate-comparison mistake got made four separate times
// this session before being caught.

import { difference, pattern, witness, keep, isGap } from "../../../nul/index.js";

// Walks as far up the grain ladder as the data honestly supports. The
// result names which grain it reached (figure / pattern / witness) and
// whether that grain's own claim succeeded or gapped — never silently
// promoted past a level that didn't hold.
export const grainWalk = ({ observed, ownGround, priorGround, material, reseeds }) => {
  const figure = difference(observed, ownGround);
  if (isGap(figure)) return { grain: "figure", result: figure };

  if (!priorGround) return { grain: "figure", result: figure };

  const pat = pattern({ before: priorGround, after: ownGround, material, reseeds });
  if (isGap(pat)) return { grain: "pattern", figure, result: pat };

  const w = witness({ ground: keep(ownGround), figure, pattern: pat });
  return { grain: "witness", figure, pattern: pat, result: w };
};
