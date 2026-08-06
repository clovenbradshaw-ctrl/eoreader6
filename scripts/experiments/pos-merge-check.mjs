// eoreader6 · scripts/experiments/pos-merge-check — EXPERIMENTAL, unwired.
//
// Checks whether a self-discovered CATEGORY (a role-fold-verb-island /
// role-fold-tp-chunk kind that already reached induceKinds' height=above)
// corresponds to a real, independently-attested part of speech — using
// POSPrior@1 (scripts/build-pos-prior.mjs, Universal Dependencies gold
// data) as the reference, never a live tagger. No ML runs here: this is a
// lookup against real human-annotated counts, the same standing
// perceiver/text/morphology.js already holds for UniMorph.
//
// THE QUESTION THIS ASKS IS DELIBERATELY ONE LEVEL UP FROM
// resolveSpanRole's. resolveSpanRole asks, causally, per real occurrence:
// "does THIS instance bind to an already-evidenced kind?" — and stays
// instance-level on purpose (FINDINGS.md §5: a surface span is never
// itself a part of speech, only its referent is). This script asks a
// different, legitimately type-level question about the CATEGORY ITSELF,
// never about any one occurrence: "does this whole discovered cluster of
// distinct surface forms correspond to a real UD tag?" Conflating these
// two questions was the exact defect goldens/agency-civic/data/
// pos-superposition.json's own type-level aggregation had (majority tag
// share PER WORD, blurring what a specific occurrence is with what the
// word-type does on average) — this script never claims anything about an
// occurrence; that stays resolveSpanRole's job, untouched.
//
// COVERAGE IS DELIBERATELY VERB-AGNOSTIC. Every surviving height=above kind
// in both saved registries is checked, including the ones already known to
// actually be prepositions (role-fold-verb-island.mjs's own "verb"
// discovery has no POS filter — "by", "under", "at", "as", "with" are in
// there). The merge-check doesn't care what discovered the cluster; it
// only asks whether the cluster's members cohere on a real UD tag.
//
// Usage: node scripts/experiments/pos-merge-check.mjs [pos-prior.json]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRIOR_PATH = process.argv[2] || join(HERE, "..", "corpus", "pos-eng.json");

// ── load POSPrior@1 — same discipline loadMorphology already states ───────
const loadPOSPrior = (path) => {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw.schema !== "POSPrior@1") throw new TypeError(`loadPOSPrior: expected POSPrior@1, got ${raw.schema}`);
  if (!raw.provenance?.source) throw new TypeError("loadPOSPrior: a prior must name its giver");
  return { language: raw.language, giver: raw.provenance.source, forms: raw.forms };
};

// ── cluster coherence: normalize each member's own distribution to 1,
// sum across members, report the top tag's share of the summed mass ──────
// Normalizing per member first is deliberate: a cluster containing one very
// high-frequency word (e.g. "act", thousands of UD occurrences) and several
// rare ones should not have its verdict decided by that one member's raw
// volume — each member gets an equal vote on the SHAPE of its own
// ambiguity, not a vote weighted by how often UD happened to see it.
const clusterCoherence = (members, prior) => {
  const summed = {};
  let covered = 0;
  for (const m of members) {
    const dist = prior.forms[m.toLowerCase()];
    if (!dist) continue;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    covered++;
    for (const [tag, count] of Object.entries(dist)) summed[tag] = (summed[tag] ?? 0) + count / total;
  }
  const entries = Object.entries(summed).sort((a, b) => b[1] - a[1]);
  const totalMass = entries.reduce((s, [, v]) => s + v, 0);
  if (entries.length === 0) return { topTag: null, share: 0, nominalShare: 0, covered, total: members.length, distribution: {} };
  const [topTag, topMass] = entries[0];
  // NOUN and PROPN are reported separately by UD (a fine-grained distinction
  // English orthography's capitalization physics already tracks elsewhere in
  // this codebase — extractSurfaces' own capitalized-run gate), but both are
  // nominal. A cluster split 46% NOUN / 28% PROPN is 74% nominal, not 46%
  // coherent — checked empirically before adding this: 13 of the 39 kinds
  // that missed the single-tag cutoff are genuinely nominal once combined
  // (verb-island:has's near-before actor cluster: NOUN .463 + PROPN .278 =
  // .74). Reported as its own figure, never silently substituted for the
  // strict single-tag share.
  const NOMINAL = new Set(["NOUN", "PROPN"]);
  const nominalMass = entries.filter(([t]) => NOMINAL.has(t)).reduce((s, [, v]) => s + v, 0);
  return {
    topTag,
    share: totalMass > 0 ? topMass / totalMass : 0,
    nominalShare: totalMass > 0 ? nominalMass / totalMass : 0,
    covered,
    total: members.length,
    distribution: Object.fromEntries(entries.map(([t, v]) => [t, +(v / totalMass).toFixed(3)])),
  };
};

// ── self-check: a synthetic cluster with a known answer ───────────────────
{
  const miniPrior = { forms: {
    dog: { NOUN: 10 }, cat: { NOUN: 8 }, house: { NOUN: 12 }, fish: { NOUN: 3, VERB: 1 },
    run: { VERB: 9 }, jump: { VERB: 5 },
  } };
  const nounish = clusterCoherence(["dog", "cat", "house", "fish"], miniPrior);
  const mixed = clusterCoherence(["dog", "run", "jump"], miniPrior);
  const ok = nounish.topTag === "NOUN" && nounish.share > 0.85 && mixed.share < nounish.share;
  console.log(`self-check: known-NOUN cluster -> top="${nounish.topTag}" share=${nounish.share.toFixed(2)}; known-mixed cluster -> share=${mixed.share.toFixed(2)} -> ${ok ? "coherence computation confirmed correct" : "REGRESSION — investigate before trusting results below"}\n`);
}

const prior = loadPOSPrior(PRIOR_PATH);
console.log(`loaded POSPrior@1: ${Object.keys(prior.forms).length.toLocaleString()} word forms, giver="${prior.giver}"\n`);

// ── load both registries, check every surviving kind ──────────────────────
const REGISTRY_SOURCES = [
  { path: join(HERE, "..", "..", "goldens", "agency-civic", "data", "role-fold-verb-island.experiment.json"), prefix: "verb-island" },
  { path: join(HERE, "..", "..", "goldens", "agency-civic", "data", "role-fold-tp-chunk.experiment.json"), prefix: "tp-chunk" },
];

const results = [];
for (const { path, prefix } of REGISTRY_SOURCES) {
  const island = JSON.parse(readFileSync(path, "utf8"));
  for (const r of island.results ?? []) {
    const recs = new Map((r.records ?? []).map((rec) => [rec.id, rec]));
    for (const k of r.kinds ?? []) {
      if (k.height !== "above") continue;
      const memberLabels = k.members.map((m) => (recs.get(m)?.label ?? m).replace(/\s+/g, " ")).filter((w) => !w.includes(" ")); // single tokens only — UD lexical lookup is per-word-form
      if (memberLabels.length < 2) continue;
      const coherence = clusterCoherence(memberLabels, prior);
      const isNominalTop = coherence.topTag === "NOUN" || coherence.topTag === "PROPN";
      results.push({
        source: prefix,
        verb: r.verb,
        kindLabel: k.label,
        memberCount: memberLabels.length,
        udCoveredCount: coherence.covered,
        topTag: coherence.topTag,
        share: +coherence.share.toFixed(3),
        nominalShare: +coherence.nominalShare.toFixed(3),
        effectiveTag: isNominalTop && coherence.nominalShare > coherence.share ? "NOUN+PROPN" : coherence.topTag,
        effectiveShare: +(isNominalTop ? Math.max(coherence.share, coherence.nominalShare) : coherence.share).toFixed(3),
        distribution: coherence.distribution,
        sampleMembers: memberLabels.slice(0, 8),
      });
    }
  }
}

results.sort((a, b) => b.effectiveShare - a.effectiveShare);
console.log(`${results.length} surviving kinds checked against the UD reference\n`);

const MERGE_THRESHOLD = 0.6;
const merged = results.filter((r) => r.effectiveShare >= MERGE_THRESHOLD && r.udCoveredCount >= 2);
const unmerged = results.filter((r) => !(r.effectiveShare >= MERGE_THRESHOLD && r.udCoveredCount >= 2));
const nominalRescued = merged.filter((r) => r.effectiveTag === "NOUN+PROPN").length;
console.log(`${merged.length} merged onto a coherent UD tag (>=${MERGE_THRESHOLD * 100}% mass, >=2 members covered) — ${nominalRescued} of those only by combining NOUN+PROPN as one nominal supercategory, disclosed per-row below — ${unmerged.length} did not\n`);

console.log("strongest merges:");
for (const r of merged.slice(0, 15)) {
  console.log(`  ${r.source}:${r.verb} "${r.kindLabel}" -> ${r.effectiveTag} (${(r.effectiveShare * 100).toFixed(0)}% of ${r.udCoveredCount}/${r.memberCount} covered members): ${r.sampleMembers.join(", ")}`);
}

console.log("\nthe passive-participle prediction (FINDINGS.md: complement-position fillers near 'by' should skew VERB, not a nominal tag):");
const byKinds = results.filter((r) => r.verb === "by");
for (const r of byKinds) {
  console.log(`  by:"${r.kindLabel}" -> ${r.effectiveTag} (${(r.effectiveShare * 100).toFixed(0)}%): ${r.sampleMembers.join(", ")}`);
}

console.log(`\nsample of what did NOT merge (no coherent UD tag, or too few members in the UD reference):`);
for (const r of unmerged.slice(0, 8)) {
  console.log(`  ${r.source}:${r.verb} "${r.kindLabel}" -> top="${r.effectiveTag}" share=${(r.effectiveShare * 100).toFixed(0)}% (${r.udCoveredCount}/${r.memberCount} covered): ${r.sampleMembers.join(", ")}`);
}

mkdirSync(join(HERE, "..", "..", "goldens", "agency-civic", "data"), { recursive: true });
const outPath = join(HERE, "..", "..", "goldens", "agency-civic", "data", "pos-merge-check.experiment.json");
writeFileSync(outPath, JSON.stringify({ priorGiver: prior.giver, mergeThreshold: MERGE_THRESHOLD, kindsChecked: results.length, mergedCount: merged.length, nominalRescuedCount: nominalRescued, unmergedCount: unmerged.length, results }, null, 2));
console.log(`\nwrote ${outPath}`);
