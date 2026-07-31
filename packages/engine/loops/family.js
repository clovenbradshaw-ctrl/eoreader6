// eoreader6 · loops/family — the cross-family check level() is missing.
// Not a reseed loop (same perturbation, fresh seed — still one algebraic
// family, no matter how deep). This asks whether an above/below/peer
// relationship survives being built from a STRUCTURALLY DIFFERENT
// perturbation (shuffle vs resample), the same two families disagreement()
// already compares for a single figure — just never extended to level().
//
// SEED.md #6, re-read in this light: "Plural grounds for one figure are
// legal, and their disagreement is the only self-check... a bad
// perturbation fails invisibly and globally." That was written for figure.
// This is the same move, one grain up.

import { ground, level, isGap } from "../../../nul/index.js";

const FAMILIES = ["shuffle", "resample"];

// level() (unlike pattern(), which only ever compares two grounds' own
// distributions to each other) needs an externally supplied observed
// scalar — which is exactly what broke every attempt at this tonight: any
// hand-picked or raw-statistic observed value is liable to exceed a
// shuffle-null's witness range before the cross-family question is even
// reached. The reliable fix: draw observed from ownGround's OWN samples —
// guaranteed within its support by construction — so figure always
// resolves, and what's actually being tested (does the relationship
// against targetGround hold across families) is what surfaces.
export const crossFamilyLevel = ({ ownMaterial, targetMaterial, window, draws, seed = 0, statistic = "burstiness", observedAt = null }) => {
  const relations = [];
  for (const perturbation of FAMILIES) {
    const ownG = ground({ material: ownMaterial, draws, window, seed, perturbation, statistic });
    const targetG = ground({ material: targetMaterial, draws, window, seed: seed + 1, perturbation, statistic });
    if (isGap(ownG) || isGap(targetG)) {
      relations.push({ perturbation, gap: isGap(ownG) ? ownG : targetG });
      continue;
    }
    // With a statistic whose null a real observation can inhabit (see
    // nul::windowedMean), a REAL moment can be used and the question becomes
    // about the material rather than about the null's own median. Falls back
    // to the median of own's achievable range when no moment is supplied,
    // which is all that was possible while burstiness was the only statistic.
    const observed = observedAt ?? ownG.samples[Math.floor(ownG.samples.length / 2)];
    const lv = level(observed, ownG, targetG);
    relations.push(isGap(lv) ? { perturbation, gap: lv } : { perturbation, relationship: lv.relationship, displacement: lv.displacement });
  }

  const resolved = relations.filter((r) => !r.gap);
  const distinctRelationships = new Set(resolved.map((r) => r.relationship));
  const stable = resolved.length === FAMILIES.length && distinctRelationships.size === 1;

  return {
    relations,
    resolvedCount: resolved.length,
    stable, // survived being asked by a structurally different family
    split: resolved.length === FAMILIES.length && distinctRelationships.size > 1,
  };
};
