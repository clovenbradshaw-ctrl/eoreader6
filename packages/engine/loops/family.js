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
export const crossFamilyLevel = ({ ownMaterial, targetMaterial, window, draws, seed = 0 }) => {
  const relations = [];
  for (const perturbation of FAMILIES) {
    const ownG = ground({ material: ownMaterial, draws, window, seed, perturbation });
    const targetG = ground({ material: targetMaterial, draws, window, seed: seed + 1, perturbation });
    if (isGap(ownG) || isGap(targetG)) {
      relations.push({ perturbation, gap: isGap(ownG) ? ownG : targetG });
      continue;
    }
    const observed = ownG.samples[Math.floor(ownG.samples.length / 2)]; // median of own's own achievable range
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
