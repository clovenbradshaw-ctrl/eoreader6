// eoreader6 · emergence/kinds — KINDS INDUCED, WITH A DISCOVERED HOLONIC HEIGHT.
//
// The "entities" of eoreader5's kind builder are, here, the relation terms a
// reading observed (sister, brother, daughter, wife, husband, sister-in-law,
// in-love-with, friend). Their attributes are structural facts earned from
// the text — a shared parent anchor, a shared subject, a conjunct pairing —
// never a stored taxonomy. The kinds that cohere are the neurons that make
// correlative structure readable at all: "brother" and "sister" join one kind
// only when the material says so, and "friend" stays out for exactly the same
// measurement.
//
// THE WHOLE ORGAN IS ONE OPERATOR CHAIN, in dependency order, and every stage
// is aimed at a target at a holonic height (eoreader6/packages/engine/operators.js):
//
//   SIG  sig()   differentiate attribute signals from the population
//   CON  con()   relate records into candidate kinds (profile Jaccard)
//   EVA  eva()   generate the two Born gates, null against chance
//   DEF  def()   differentiate what survived into a definition
//   INS  ins()   instantiate the kind's members from the material
//   SYN  syn()   synthesize the vocabulary the kinds require
//   REC  —        recognize rules; not applied here — the reading's reframes
//                 are the rule learner (see the clause-reading harness)
//
// HEIGHT IS DISCOVERED, NEVER ASSIGNED (holon-level.md). A kind that earns
// BOTH Born gates has its members below it — the kind cannot dissolve into
// equal random partitions (existence-dependency) and its core constrains
// membership (possibility-constraint). A kind that earns neither sits at its
// members' level: PEER is a first-class result, the null the pair tests fall
// to. These two gates are the attribute-material shape of the same Born pair
// holon_level/index.js runs over time series — same tests, same null
// discipline, nulls shaped to the material. There is no universal clock: a
// kind ticks on its own signal-from-noise, never on a shared epoch.
//
// KINDS ARE READ BY KEY *AND* VALUE (emergence/values.js). This organ began
// key-only: a profile was a binary key vector and similarity was Jaccard over
// key sets. That is exactly right when kind-identity coincides with
// key-identity, which is what Emma's relation terms gave it — `anchor_shared`
// and `subject_shared` are different KEYS. It is blind, totally rather than
// partially, on material whose kinds share a key pool and differ only in
// fillers: identical profiles, an all-1.0 similarity matrix, a cohesion null of
// zero width, `degenerate_ground` at every cluster. That is the omnimodal case
// and not an edge case — a leitmotif shares every key with every other motif,
// and only values differ. `valuedJaccard` generalises the old statistic and
// reduces to it exactly on valueless material, so nothing that was induced
// before is induced differently now.
//
// The core field is chosen by DISCRIMINATION, not prevalence, whenever values
// are being read. Under a shared key pool every field has prevalence 1 in every
// kind, so prevalence cannot tell two kinds apart and would hand all of them the
// same label. The discriminating field is the one whose within-kind agreement
// most exceeds the population's — a difference against a ground, like
// everything else here. Presence-only material keeps the prevalence rule and
// keeps its old labels.
//
// Declared numbers are options, never defaults (SEED.md #7): population,
// minPrevalence, minKindSize, permutations, quantile, seed — and `reseeds`,
// the resolution of pattern, which valued material additionally requires
// because its search must be nulled against itself (`searchCohesions`).

import { gap, isGap } from "../../../nul/index.js";
import { CURRENT_OPERATOR_EPOCH, OPERATORS, validateChain } from "../operators.js";
import {
  fieldScales,
  valuedSimilarity,
  agreement,
  readsValues,
  scaleGaps,
  permuteAllValues,
} from "./values.js";

// The cells this organ occupies on the operator grid (engine/operators.js):
// the chain's vocabulary synthesis, SYN · Network · Composing, and its
// instantiation of members, INS · Kind · Composing — both at Pattern grain,
// where the kind's correlative structure becomes readable. Declared, checked
// by conformance.
export const CELLS = Object.freeze([
  Object.freeze({ op: "SYN", grain: "Pattern" }),
  Object.freeze({ op: "INS", grain: "Pattern" }),
]);

const prng = (seed) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const fisherYates = (n, rnd) => {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
};

const randomSubset = (n, k, rnd) => {
  const perm = fisherYates(n, rnd);
  return perm.slice(0, k).sort((a, b) => a - b);
};

/** A Born gate over samples: the observed statistic against a null. Degenerate
 * nulls are gaps. The pass/fail is an empirical p-value — the fraction of null
 * samples that meet or beat the observation — so a small identical block does
 * not saturate a percentile rank into falsely refusing a real kind. */
export const partitionNull = ({ samples, observed, quantile = 0.95, seed = 0 }) => {
  if (!Array.isArray(samples) || samples.length === 0)
    return gap("empty_material", { reason: "no null samples" });
  if (!Number.isFinite(observed)) return gap("empty_material", { reason: "observed must be finite" });
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1])
    return gap("degenerate_ground", { reason: `all ${samples.length} null samples equal (${sorted[0]})` });
  const n = sorted.length;
  const h = (n - 1) * quantile;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  const threshold = sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
  let atOrAbove = 0;
  for (const s of samples) if (s >= observed) atOrAbove++;
  const pValue = atOrAbove / (n + 1);
  return Object.freeze({
    observed,
    threshold,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    pValue,
    passed: pValue <= 1 - quantile + 1e-9,
  });
};

// ── SIG · differentiate attribute signals from the population ───────────────

const labelShuffleNull = (records, fieldId, permutations, seed) => {
  const n = records.length;
  const hasField = records.map((r) => (r.attributes ?? []).some((a) => a.field_id === fieldId));
  const observed = hasField.filter(Boolean).length / n;
  const rnd = prng(seed ^ 0x51ab1e);
  const samples = [];
  for (let p = 0; p < permutations; p++) {
    const perm = fisherYates(n, rnd);
    let hits = 0;
    for (let i = 0; i < n; i++) if (hasField[perm[i]]) hits++;
    samples.push(hits / n);
  }
  return partitionNull({ samples, observed, seed: seed + 1 });
};

export const sig = (records, { minPrevalence, permutations, quantile, seed }) => {
  const total = records.length;
  const byField = new Map();
  for (const rec of records) {
    for (const attr of rec.attributes ?? []) {
      let entry = byField.get(attr.field_id);
      if (!entry) {
        entry = { field_id: attr.field_id, value_type: attr.value_type, ids: new Set(), totalCount: 0 };
        byField.set(attr.field_id, entry);
      }
      entry.ids.add(rec.id);
      entry.totalCount += attr.count ?? 1;
    }
  }
  const params = [];
  for (const entry of byField.values()) {
    const prevalence = entry.ids.size / total;
    if (prevalence < minPrevalence) continue;
    params.push({
      field_id: entry.field_id,
      value_type: entry.value_type,
      prevalence,
      ids: [...entry.ids],
      totalCount: entry.totalCount,
      null: labelShuffleNull(records, entry.field_id, permutations, seed),
    });
  }
  return params.sort((a, b) => b.prevalence - a.prevalence || b.totalCount - a.totalCount);
};

// ── CON · relate records into candidate kinds ───────────────────────────────

export const parameterProfiles = (records, params) => {
  const keys = params.map((p) => p.field_id);
  const profiles = new Map();
  for (const rec of records) {
    const has = new Set((rec.attributes ?? []).map((a) => a.field_id));
    const vec = keys.map((k) => (has.has(k) ? 1 : 0));
    if (vec.some((v) => v === 1)) profiles.set(rec.id, vec);
  }
  return { profiles, keys };
};

export const profileJaccard = (a, b) => {
  const nz = (v) => v.reduce((s, x) => s + x, 0);
  const A = nz(a);
  const B = nz(b);
  if (A + B === 0) return 0;
  let common = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === 1 && b[i] === 1) common++;
  return common / (A + B - common);
};

const simKey = (i, j) => (i < j ? `${i}\u0000${j}` : `${j}\u0000${i}`);

export const conSimilarity = (profiles) => {
  const ids = [...profiles.keys()];
  const sim = new Map();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sim.set(simKey(i, j), profileJaccard(profiles.get(ids[i]), profiles.get(ids[j])));
    }
  }
  return { sim, idxOf: new Map(ids.map((id, i) => [id, i])) };
};

const simBetween = (sim, a, b) => sim.get(simKey(a, b)) ?? 0;

const meanPairwiseSim = (cluster, sim, idxOf) => {
  if (cluster.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      sum += simBetween(sim, idxOf.get(cluster[i]), idxOf.get(cluster[j]));
    }
  }
  return sum / (cluster.length * (cluster.length - 1) / 2);
};

const meanPairwiseSimOf = (indices, sim) => {
  if (indices.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) sum += simBetween(sim, indices[i], indices[j]);
  }
  return sum / (indices.length * (indices.length - 1) / 2);
};

/** The clustering threshold is DERIVED from the material, never declared: random
 * subsets of the population set the bar the way they are. */
export const deriveCohesionThreshold = ({ sim, count, permutations, quantile, seed }) => {
  if (count < 4) return 0.25;
  const k = Math.max(2, Math.floor(count / 2));
  const rnd = prng(seed ^ 0xc0ffee);
  const samples = [];
  for (let p = 0; p < permutations; p++) {
    samples.push(meanPairwiseSimOf(randomSubset(count, k, rnd), sim));
  }
  const result = partitionNull({ samples, observed: 0, quantile, seed: seed + 1 });
  return isGap(result) ? 0.25 : result.threshold;
};

const meanBetween = (a, b, sim, idxOf) => {
  let sum = 0;
  for (const x of a) {
    for (const y of b) sum += simBetween(sim, idxOf.get(x), idxOf.get(y));
  }
  return a.size * b.size > 0 ? sum / (a.size * b.size) : 0;
};

/** Average-linkage agglomeration: merge the two clusters with the highest
 * inter-cluster mean sim, and stop when even the best merge is below the
 * derived threshold. Block-pure material forms blocks; a dense block cannot
 * dilute a stranger in. */
const conCluster = (profiles, sim, idxOf, threshold, minKindSize) => {
  const ids = [...profiles.keys()];
  let clusters = ids.map((id) => new Set([id]));
  while (clusters.length > 1) {
    let bestI = -1;
    let bestJ = -1;
    let bestSim = -Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const mean = meanBetween(clusters[i], clusters[j], sim, idxOf);
        if (mean > bestSim) {
          bestSim = mean;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestSim < threshold) break;
    const merged = new Set([...clusters[bestI], ...clusters[bestJ]]);
    clusters = clusters.filter((_, x) => x !== bestI && x !== bestJ);
    clusters.push(merged);
  }
  return clusters.filter((c) => c.size >= minKindSize).map((c) => [...c]);
};

export const con = (profiles, sim, idxOf, { minKindSize, permutations, quantile, seed }) => {
  const threshold = deriveCohesionThreshold({ sim, count: profiles.size, permutations, quantile, seed });
  return { clusters: conCluster(profiles, sim, idxOf, threshold, minKindSize), threshold };
};

// ── EVA · the two Born gates, null against chance ────────────────────────────
//
// Existence-dependency: the kind's cohesion cannot dissolve into equal random
// partitions of the population — it cannot exist without its membership.
// Possibility-constraint: the kind's core attribute constrains membership more
// than a random partition would. Both null-gated; a degenerate null is a gap.

export const eva = (profiles, sim, cluster, idxOf, { permutations, quantile, seed }) => {
  const count = profiles.size;
  const rnd = prng(seed ^ 0x51ab1e);
  const cohesion = meanPairwiseSim(cluster, sim, idxOf);

  const cohesionSamples = [];
  for (let p = 0; p < permutations; p++) {
    const sub = randomSubset(count, cluster.length, rnd);
    cohesionSamples.push(meanPairwiseSimOf(sub, sim));
  }
  const existence = partitionNull({ samples: cohesionSamples, observed: cohesion, quantile, seed: seed + 1 });

  return { cohesion, existence };
};

// ── DEF · differentiate what survived into a definition ─────────────────────

/** Mean pairwise agreement on one field across a set of records. The ground for
 *  a kind's agreement is the whole population's agreement on the same field. */
const meanAgreement = (recs, fieldId, scale) => {
  const vals = recs
    .map((r) => (r.attributes ?? []).find((a) => a.field_id === fieldId))
    .filter((a) => a !== undefined)
    .map((a) => a.value);
  if (vals.length < 2) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      sum += agreement(vals[i], vals[j], scale);
      n++;
    }
  }
  return n === 0 ? null : sum / n;
};

/** What this kind's core field is CENTRED on — the thing that makes it this
 *  kind and not its neighbour. Testimony, never identity: a kind's identity is
 *  its member set (`id` below), so naming the regime here fabricates nothing. */
const centralValue = (recs, fieldId, scale) => {
  const vals = recs
    .map((r) => (r.attributes ?? []).find((a) => a.field_id === fieldId))
    .filter((a) => a !== undefined && a.value !== undefined)
    .map((a) => a.value);
  if (vals.length === 0) return null;
  if (scale?.value_type === "numeric") {
    const nums = vals.filter(Number.isFinite).sort((a, b) => a - b);
    if (nums.length === 0) return null;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  }
  if (scale?.value_type === "vector") return null; // no scalar name for a centroid
  const counts = new Map();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
};

export const def = ({ cluster, cohesion, existence, searched = null, warrant = null, sim, records, params, population, minPrevalence, permutations, quantile, seed, scales, valued }) => {
  const members = cluster;
  const memberIds = new Set(members);
  const memberRecords = records.filter((r) => memberIds.has(r.id));
  const kindParams = [];
  for (const p of params) {
    const prevalenceInKind = [...memberIds].filter((id) => p.ids.includes(id)).length / members.length;
    if (prevalenceInKind < minPrevalence) continue;
    kindParams.push({ field_id: p.field_id, value_type: p.value_type, prevalence: prevalenceInKind });
  }

  // Prevalence picks the core only when there are no values to read. Under a
  // shared key pool every admitted field sits at prevalence 1 in every kind, so
  // prevalence is constant and would label every kind identically. What
  // separates them is where their values agree with themselves more than the
  // population agrees with itself.
  let coreField = null;
  if (kindParams.length > 0) {
    if (!valued) {
      coreField = kindParams.reduce((a, b) => (b.prevalence > a.prevalence ? b : a), kindParams[0]);
    } else {
      let best = null;
      for (const p of kindParams) {
        const scale = scales.get(p.field_id);
        const within = meanAgreement(memberRecords, p.field_id, scale);
        const ground = meanAgreement(records, p.field_id, scale);
        if (within === null || ground === null) continue;
        const lift = within - ground;
        if (best === null || lift > best.lift || (lift === best.lift && p.prevalence > best.prevalence)) {
          best = { ...p, within, ground, lift };
        }
      }
      coreField = best ?? kindParams.reduce((a, b) => (b.prevalence > a.prevalence ? b : a), kindParams[0]);
    }
  }

  const coreScale = coreField ? scales?.get(coreField.field_id) : null;
  const coreCentre = coreField && valued ? centralValue(memberRecords, coreField.field_id, coreScale) : null;
  const label = coreField
    ? (coreCentre === null ? coreField.field_id : `${coreField.field_id}=${coreCentre}`)
    : population;

  // POSSIBILITY-CONSTRAINT — does the kind's core constrain membership more
  // than a random partition of the population would?
  //
  // Asked of PRESENCE, this question is vacuous under a shared key pool: every
  // record carries every admitted field, so the observed fraction is 1, every
  // null sample is 1, and `partitionNull` correctly refuses a null of zero
  // width — returning `unstable` for kinds that are in fact sharply
  // constrained. The constraint was never about carrying the key. It is about
  // the core's REGIME: members agree with each other on the core field, and a
  // subset drawn across kinds does not.
  //
  // Presence-only material keeps the presence form exactly, because there is no
  // regime to ask about and the fraction is then genuinely informative.
  const allIds = records.map((r) => r.id);
  const memberIndexes = members.map((id) => allIds.indexOf(id)).sort((a, b) => a - b);
  const coreIsValued = Boolean(coreField && valued && scales?.get(coreField.field_id)?.mode === "value");
  const rnd = prng(seed ^ 0xdeadbeef);
  const constraintSamples = [];
  let observedCore;

  if (coreIsValued) {
    const scale = scales.get(coreField.field_id);
    observedCore = meanAgreement(memberRecords, coreField.field_id, scale) ?? 0;
    for (let p = 0; p < permutations; p++) {
      const sub = randomSubset(records.length, members.length, rnd);
      constraintSamples.push(meanAgreement(sub.map((i) => records[i]), coreField.field_id, scale) ?? 0);
    }
  } else {
    const hasCore = (rec) => (coreField ? (rec.attributes ?? []).some((a) => a.field_id === coreField.field_id) : false);
    observedCore = memberIndexes.filter((i) => hasCore(records[i])).length / members.length;
    for (let p = 0; p < permutations; p++) {
      const sub = randomSubset(records.length, members.length, rnd);
      constraintSamples.push(sub.filter((i) => hasCore(records[i])).length / members.length);
    }
  }
  const constraint = partitionNull({ samples: constraintSamples, observed: observedCore, quantile, seed: seed + 1 });

  const relation = (() => {
    if (isGap(existence) || isGap(constraint)) return "unstable";
    const e = existence.passed;
    const c = constraint.passed;
    if (e && c) return "above";
    if (!e && !c) return "peer";
    return "unstable";
  })();

  const chain = validateChain(["SIG", "CON", "EVA", "DEF", "INS", "SYN"]);
  const stages = [
    { operator: "SIG", target: `population:${population}`, height: 0 },
    { operator: "CON", target: `candidate:${members.join("|")}`, height: null },
    { operator: "EVA", target: `kind:${label}`, height: relation },
    { operator: "DEF", target: `kind:${label}`, height: relation },
    { operator: "INS", target: members.length > 1 ? `members:${members.length}` : members[0], height: relation === "above" ? "below" : relation },
    { operator: "SYN", target: "vocabulary", height: null },
  ];

  return Object.freeze({
    id: `kind:${population}:${[...members].sort().join("|")}`,
    label,
    population,
    members: Object.freeze([...members].sort()),
    core: coreField ? Object.freeze({
      field_id: coreField.field_id,
      value_type: coreField.value_type,
      prevalence: coreField.prevalence,
      // Present only when values were read: what the kind is centred on, and
      // how much more it agrees with itself there than the population does.
      ...(coreCentre === null ? {} : { centre: coreCentre }),
      ...(coreField.lift === undefined ? {} : { agreement: coreField.within, ground_agreement: coreField.ground, lift: coreField.lift }),
    }) : null,
    cohesion,
    height: relation,
    heightGate: Object.freeze({ existence, constraint, relation, ...(searched ? { searched } : {}), ...(warrant ? { warrant } : {}) }),
    operator_chain: Object.freeze({ ...chain, stages: Object.freeze(stages) }),
  });
};

// ── the search null · what the Born gates cannot see ────────────────────────
//
// MEASURED, AND THE REASON THIS EXISTS. On composed material with FOUR kinds
// collapsed into ONE regime (`goldens/kinds`, valueDivergence 0 — there is
// nothing to find), induction reported three kinds, every one of them `above`,
// both Born gates passing, core lift up to 0.476. That is confabulation, and
// the seed names it as one of the two deaths.
//
// The reason is a selection effect, not a bad statistic. `eva` and `def`
// compare a cluster against RANDOM SUBSETS of the population — but the cluster
// was not random, it was CHOSEN by agglomeration for being the most cohesive
// subset available. "The best subset I could find" beats "a subset drawn at
// random" whether or not there is any structure, so the gates pass on noise.
//
// The key-only organ was protected from this by accident: Jaccard over a
// handful of keys takes only a few distinct values, so cohesion is quantised,
// null samples come out all-equal, and `degenerate_ground` refused. Continuous
// values remove that accident. Nothing was wrong before and nothing was right
// before either — the null was never licensed for this material (Amendment I).
//
// So the perturbation has to destroy what the statistic actually exploits,
// which is the search. This null RE-RUNS THE WHOLE SEARCH — same spec, same
// material, fresh seed, values permuted within their keys so every key profile
// survives exactly — and asks whether the real search found more cohesion than
// the same search finds in material where the values are no longer bound to
// the records that earned them. SEED.md's own words for the pattern null:
// "same spec, same material, fresh seed."

const searchCohesions = (records, params, keys, scales, { minKindSize, permutations, quantile, seed, reseeds }) => {
  const samples = [];
  for (let r = 0; r < reseeds; r++) {
    const rnd = prng((seed ^ 0x5ea2c4) + r * 0x9e3779b1);
    const permuted = permuteAllValues(records, keys, rnd);
    const { profiles } = parameterProfiles(permuted, params);
    if (profiles.size < minKindSize) continue;
    const { sim, idxOf } = valuedSimilarity(profiles, permuted, keys, scales);
    const { clusters } = con(profiles, sim, idxOf, { minKindSize, permutations, quantile, seed: seed + r });
    for (const c of clusters) samples.push(meanPairwiseSim(c, sim, idxOf));
  }
  return samples;
};

// ── the organ entry point ────────────────────────────────────────────────────

export const induceKinds = (records, opts = {}) => {
  const {
    population,
    minPrevalence,
    minKindSize,
    permutations,
    quantile,
    seed,
    reseeds,
  } = opts;
  if (typeof population !== "string" || population.length === 0)
    throw new TypeError("induceKinds: population is declared, never defaulted");
  for (const [name, v] of [["minPrevalence", minPrevalence], ["minKindSize", minKindSize], ["permutations", permutations], ["quantile", quantile], ["seed", seed]]) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(`induceKinds: ${name} is declared, never defaulted (got ${v})`);
  }
  if (!Array.isArray(records) || records.length < minKindSize)
    throw new TypeError(`induceKinds: records must be an array of at least minKindSize (${minKindSize})`);

  const params = sig(records, { minPrevalence, permutations, quantile, seed });
  if (params.length === 0) return [];
  const { profiles, keys } = parameterProfiles(records, params);
  if (profiles.size < minKindSize) return [];

  // The value channel. `valuedSimilarity` is a strict generalisation of
  // `conSimilarity` — on presence-only material the two agree exactly — so it
  // is used unconditionally rather than switched on, and conformance pins the
  // agreement rather than trusting it.
  const scales = fieldScales(records);
  const valued = readsValues(keys, scales);
  const { sim, idxOf } = valuedSimilarity(profiles, records, keys, scales);
  const { clusters, threshold } = con(profiles, sim, idxOf, { minKindSize, permutations, quantile, seed });

  // Valued induction searches a continuous space and must be nulled against its
  // own search (`searchCohesions` above). Presence-only induction does not
  // declare `reseeds` and does not run it — its cohesion is quantised and the
  // existing gates already refuse where this would.
  let search = null;
  if (valued) {
    if (!Number.isInteger(reseeds) || reseeds < 2)
      throw new TypeError("induceKinds: valued material requires a declared `reseeds` (the resolution of pattern) of at least 2 — the Born gates alone certify clusters found in noise");
    search = searchCohesions(records, params, keys, scales, { minKindSize, permutations, quantile, seed, reseeds });
  }

  // PLURAL GROUNDS, AND EACH IS LICENSED FOR ONE PERTURBATION (SEED.md #6,
  // Amendment I). A cluster can rest on key structure, on value structure, or
  // on both, and the two claims have different nulls:
  //
  //   key channel    nulled by the label shuffle — which is what `eva` runs,
  //                  over the key-only similarity.
  //   value channel  nulled by the re-run search over within-key value
  //                  permutation, which PRESERVES key structure exactly and so
  //                  cannot speak to it at all.
  //
  // MEASURED, and the reason this is a branch rather than one gate: on material
  // with DISJOINT key pools the permuted search finds the same clusters at the
  // same cohesion — correctly, because the key structure survives the
  // permutation untouched. Gating membership on that null discarded kinds that
  // were entirely key-carried, which is the Emma case and the case this organ
  // was built for. The null was not wrong; it was answering "do values add
  // anything here?" and being read as "does this kind exist?"
  //
  // So a kind needs warrant from at least ONE channel. Where the key channel
  // independently supports the cluster the kind stands and the search null is
  // reportage; where it cannot — a shared key pool leaves key-similarity
  // degenerate and it never can — the value channel is the only warrant on
  // offer and the search null gates.
  const keySim = conSimilarity(profiles);

  const kinds = [];
  for (const cluster of clusters) {
    const { cohesion, existence } = eva(profiles, sim, cluster, idxOf, { permutations, quantile, seed });
    if (isGap(existence)) continue;
    if (!existence.passed) continue;

    let searched = null;
    let warrant = "key";
    if (search) {
      searched = partitionNull({ samples: search, observed: cohesion, quantile, seed: seed + 2 });
      const keyGate = eva(profiles, keySim.sim, cluster, keySim.idxOf, { permutations, quantile, seed });
      const keySupported = !isGap(keyGate.existence) && keyGate.existence.passed;
      const valueSupported = !isGap(searched) && searched.passed;
      if (!keySupported && !valueSupported) continue;
      warrant = keySupported && valueSupported ? "both" : keySupported ? "key" : "value";
    }

    kinds.push(def({ cluster, cohesion, existence, searched, warrant, sim, records, params, population, minPrevalence, permutations, quantile, seed, scales, valued }));
  }
  return kinds.sort((a, b) => b.cohesion - a.cohesion);
};

/** The induction's own account of how it read the material: which fields
 *  contributed values, which fell back to presence, and why. A gap is a result
 *  (SEED.md #8) — a field whose values could not be read is reportable, not
 *  silently dropped. */
export const inductionReading = (records, opts = {}) => {
  const { minPrevalence, permutations, quantile, seed } = opts;
  const params = sig(records, { minPrevalence, permutations, quantile, seed });
  const { keys } = parameterProfiles(records, params);
  const scales = fieldScales(records);
  return Object.freeze({
    keys: Object.freeze([...keys]),
    valued: readsValues(keys, scales),
    fields: Object.freeze(keys.map((k) => {
      const s = scales.get(k);
      return Object.freeze({ field_id: k, value_type: s?.value_type ?? null, mode: s?.mode ?? "presence", scale: s?.scale ?? null });
    })),
    gaps: Object.freeze(scaleGaps(scales)),
  });
};

// ── SYN · synthesize the vocabulary the kinds require ────────────────────────

export const buildVocabulary = (kinds, { population, requiredQuantile = 0.5 } = {}) => {
  if (!Array.isArray(kinds) || kinds.length === 0)
    throw new TypeError("buildVocabulary: kinds must be a non-empty array");
  const all = kinds.flatMap((k) => k.members.map((m) => ({ kind: k.label, member: m })));
  return Object.freeze({
    population,
    kinds: kinds.map((k) => k.label),
    members: Object.freeze(all),
  });
};

// ── pair height: correlatives are peers ──────────────────────────────────────
//
// The pair tests carry no shuffle null by design: with two holons the null IS
// peerhood. A term whose attribute set equals another's has no level between
// them (sister / brother); a strict superset constrains (sister-in-law above
// its sister part, composition); no overlap is the peer null (friend).

export const pairHeight = (a, b, { population } = {}) => {
  const aSet = new Set((a.attributes ?? []).map((x) => x.field_id));
  const bSet = new Set((b.attributes ?? []).map((x) => x.field_id));
  if (aSet.size === 0 || bSet.size === 0)
    return { relation: "peer", heightGate: { reason: "an empty attribute set is no evidence of structure — peer is the null result" } };
  const aSup = aSet.size > bSet.size && [...bSet].every((f) => aSet.has(f));
  const bSup = bSet.size > aSet.size && [...aSet].every((f) => bSet.has(f));
  if (aSup) return { relation: "above", heightGate: { reason: "a strictly contains b — a constrains, b enables" } };
  if (bSup) return { relation: "below", heightGate: { reason: "b strictly contains a — b constrains, a enables" } };
  return { relation: "peer", heightGate: { reason: "equal or no overlap — peer is the null result" } };
};

export const operator_epoch = CURRENT_OPERATOR_EPOCH;
export { OPERATORS };
