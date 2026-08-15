// eoreader6 · scripts/read-mnpd-tbi-signal-vs-rest -- "what's signal vs
// noise re: MNPD and the rest of the TBI data" (user, 2026-08-14).
//
// TWO GROUPS, KNOWN IN ADVANCE -- not unsupervised clustering. We already
// know which records are MNPD-related (mnpd-master.json's TBI subset, deduped
// via the SAME SYN.merge pattern as read-mnpd-tbi-time-signal.mjs) and which
// are "the rest" (TBI's own reverse-view log across every network it
// searches, source-data/agency-3499-2026-08-14.json). The question is which
// features distinguish the two groups beyond what a random label-shuffle of
// this same combined population would produce -- a label-shuffle permutation
// test, using kinds.js's own `partitionNull` (the same significance-testing
// primitive induceKinds() itself is built on), composed with a two-sample
// prevalence-difference statistic instead of induceKinds()' full clustering
// search. Reused organ, not a new testing paradigm; the clustering search
// itself is skipped because it doesn't fit the question (we're not
// discovering the groups, we already have them) and because at this
// population's real size (~10,000 records) the full search is not
// practically fast -- see CLAUDE.md "the rule above is 'search first,' not
// 'never write new code'" for when a scoped new composition is the right call.
//
// THE MNPD RULE, PER THE USER'S OWN WORDING: "the MNPD ones have 'MNPD' or
// 'metro nashville' somewhere on the record" -- checked against agency-3499's
// full serialized rows (every field, not just `reason`): 4 of 10,001 match,
// and all 4 are exact duplicates of rows already in mnpd.csv (verified by
// direct comparison). They are EXCLUDED from the "rest" pool below rather
// than double-counted.
//
// A REAL, UNRESOLVED CONFOUND, NAMED RATHER THAN HIDDEN: agency-3499.json is
// `capped: true` and covers only 2026-03-23..2026-07-31 (Flock's export cap),
// while the 107 canonical MNPD-TBI records span 2022-12-14..2026-07-09. Only
// 4 of the 107 fall inside the "rest" population's own window -- far too few
// to build a time-matched comparison. Every result below compares MNPD's
// FULL HISTORY against TBI's RECENT FEW MONTHS of general activity: a real
// difference could be "MNPD is different" or could be "TBI's general
// activity mix shifted over 2022-2026," and this design cannot tell those
// apart. Said once here; repeated in `caveats` in the output artifact.
//
// SCHEMA-SAFE FEATURES ONLY: mnpd.csv and agency-3499.json are different
// export schemas (agency-3499 has search_type/redactions{}/sources[] that
// mnpd.csv's rows never had, and vice versa mnpd.csv's redaction_reasons
// string format differs from agency-3499's). Any field present in one
// schema and absent in the other would trivially "distinguish" the groups
// as an artifact of which FILE a record came from, not real MNPD-vs-rest
// behavior. Candidates here are restricted to what both schemas carry
// identically: `reason` text (-> kw:* via the same extractSignature() this
// project already uses), `case_number` presence, and `search_time_utc`
// (-> day-of-week / time-of-day buckets).
//
// Output conforms to analysis/SCHEMA.md ("eoreader6-analysis-artifact",
// kind: "null-signal-result").
//
//   node scripts/read-mnpd-tbi-signal-vs-rest.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { partitionNull } from "../packages/engine/emergence/kinds.js";
import { detectExactDuplicateEvents, projectMergedRecords, exactSourceRecordSignature } from "../../../../mnpd-network-audit/analysis/lib/merge-duplicates.mjs";
import { extractSignature } from "../../../eochat/eval/agent/crispr-search.mjs";

const MASTER = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master.json";
const TBI_FULL = "/Users/mlacy/Documents/mnpd-network-audit/source-data/agency-3499-2026-08-14.json";
const OUT_JSON = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-signal-vs-rest.json";
const OUT_LOG = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-signal-vs-rest.log";
const SCRIPT_REL = "eoWebLLM/eoreader6/scripts/read-mnpd-tbi-signal-vs-rest.mjs";

const MIN_COUNT = 8;
const DRAWS = 500;
const SEED = 42;

const log = [];
const say = (line) => { log.push(line); console.log(line); };

const parseUTC = (s) => {
  let t = String(s ?? "").trim();
  if (!t) return NaN;
  if (t.includes(" ") && !t.includes("T")) t = t.replace(" ", "T");
  if (!/Z$/.test(t)) t += "Z";
  return Date.parse(t);
};
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_BUCKET = (h) => (h < 6 ? "0-5" : h < 12 ? "6-11" : h < 18 ? "12-17" : "18-23");
const MNPD_RE = /mnpd|metro nashville/i;

// ── group A: MNPD (mnpd-master.json's TBI subset, deduped via SYN.merge) ──
const master = JSON.parse(readFileSync(MASTER, "utf8"));
const mergeEventsA = detectExactDuplicateEvents(master.records, exactSourceRecordSignature);
const canonicalA = projectMergedRecords(master.records, mergeEventsA).filter((n) => !n.mergedInto);
const mnpdGroup = canonicalA
  .filter((n) => n.record.source_record.organization_name === "Tennessee Bureau of Investigation")
  .map((n) => ({ reason: n.record.source_record.reason, case_number: n.record.source_record.case_number, t: parseUTC(n.record.source_record.search_time_utc) }));
say(`group A (MNPD, TBI subset of mnpd-master.json, deduped): ${mnpdGroup.length} canonical records`);

// ── group B: "the rest" (TBI's own reverse-view, every network) ───────────
const tbiFull = JSON.parse(readFileSync(TBI_FULL, "utf8"));
say(`TBI reverse-view (${TBI_FULL.split("/").pop()}): ${tbiFull.results.length} rows, capped=${tbiFull.capped}`);
const restRaw = tbiFull.results.filter((r) => !MNPD_RE.test(JSON.stringify(r)));
const excludedMnpdDupes = tbiFull.results.length - restRaw.length;
say(`rows matching "MNPD"/"metro nashville" anywhere in the record: ${excludedMnpdDupes} (excluded from "rest" -- already counted in group A via mnpd-master.json)`);
const restGroup = restRaw.map((r) => ({ reason: r.reason, case_number: r.case_number, t: parseUTC(r.search_time_utc) }));
say(`group B (rest of TBI's activity): ${restGroup.length} records`);
say(``);

// ── build feature sets, schema-safe fields only ────────────────────────────
const featuresFor = (rec) => {
  const f = new Set();
  for (const kw of extractSignature(rec.reason ?? "", { max: 8 })) f.add(`kw:${kw}`);
  if (String(rec.case_number ?? "").trim().length > 0) f.add("has_case");
  if (Number.isFinite(rec.t)) {
    const d = new Date(rec.t);
    f.add(`dow:${DOW[d.getUTCDay()]}`);
    f.add(`hour:${HOUR_BUCKET(d.getUTCHours())}`);
  }
  return f;
};

const combined = [
  ...mnpdGroup.map((r) => ({ target: "mnpd", features: featuresFor(r) })),
  ...restGroup.map((r) => ({ target: "other", features: featuresFor(r) })),
];
const N = combined.length;
const nMnpd = mnpdGroup.length;
say(`combined population: ${N} (${nMnpd} mnpd / ${N - nMnpd} other)`);

const featureCounts = new Map();
for (const rec of combined) for (const f of rec.features) featureCounts.set(f, (featureCounts.get(f) ?? 0) + 1);
const candidates = [...featureCounts.entries()].filter(([, n]) => n >= MIN_COUNT).map(([f]) => f);
say(`candidate features (>= ${MIN_COUNT} of ${N} combined records): ${candidates.length}`);
say(``);

// membership index: feature -> array of combined-population indices carrying it
const memberIdx = new Map(candidates.map((f) => [f, []]));
combined.forEach((rec, i) => { for (const f of rec.features) if (memberIdx.has(f)) memberIdx.get(f).push(i); });

// ── seeded PRNG (LCG, same family binding.js/kinds.js already use) ────────
let state = SEED | 0;
const rnd = () => { state = (state * 1664525 + 1013904223) | 0; return (state >>> 0) / 4294967296; };
const shuffledIndices = () => {
  const arr = Array.from({ length: N }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return new Set(arr.slice(0, nMnpd)); // a random nMnpd-sized "mnpd" label set
};

const prevalenceDiff = (mnpdIdxSet, featureIdxArr) => {
  let inMnpd = 0;
  for (const idx of featureIdxArr) if (mnpdIdxSet.has(idx)) inMnpd++;
  const inOther = featureIdxArr.length - inMnpd;
  return inMnpd / nMnpd - inOther / (N - nMnpd);
};

const realMnpdSet = new Set(Array.from({ length: nMnpd }, (_, i) => i)); // combined[] built mnpd-first
const nullDraws = Array.from({ length: DRAWS }, () => shuffledIndices());

const results = candidates.map((f) => {
  const idxArr = memberIdx.get(f);
  const observedDiff = prevalenceDiff(realMnpdSet, idxArr);
  const samples = nullDraws.map((s) => Math.abs(prevalenceDiff(s, idxArr)));
  const n = partitionNull({ samples, observed: Math.abs(observedDiff), quantile: 0.95, seed: SEED + 1 });
  return {
    feature: f,
    countTotal: idxArr.length,
    countMnpd: idxArr.filter((i) => realMnpdSet.has(i)).length,
    prevalenceMnpd: idxArr.filter((i) => realMnpdSet.has(i)).length / nMnpd,
    prevalenceOther: (idxArr.length - idxArr.filter((i) => realMnpdSet.has(i)).length) / (N - nMnpd),
    diff: observedDiff,
    pValue: n.pValue,
    passed: n.passed,
  };
}).sort((a, b) => a.pValue - b.pValue || Math.abs(b.diff) - Math.abs(a.diff));

say(`-- ranked by significance (two-tailed label-shuffle, |prevalence(mnpd) - prevalence(other)| vs ${DRAWS} random relabelings) --`);
say(``);
for (const r of results) {
  const dir = r.diff > 0 ? "OVER-represented in MNPD" : "under-represented in MNPD";
  const flag = r.pValue <= 0.05 ? "  <-- p<=0.05" : "";
  say(`${r.feature.padEnd(28)} mnpd=${r.prevalenceMnpd.toFixed(3)} other=${r.prevalenceOther.toFixed(3)} diff=${r.diff >= 0 ? "+" : ""}${r.diff.toFixed(3)} (${dir}) n=${String(r.countTotal).padStart(5)} p=${r.pValue.toFixed(3)}${flag}`);
}

const artifact = {
  schema: "eoreader6-analysis-artifact",
  schema_version: "1.0.0",
  kind: "null-signal-result",
  generated_by: SCRIPT_REL,
  generated_at: new Date().toISOString(),
  inputs: [
    { path: MASTER, record_count: master.records.length },
    { path: TBI_FULL, record_count: tbiFull.results.length },
  ],
  preprocessing: {
    merge: {
      pattern: "SYN.merge -- packages/engine/referents/index.js's own event-projection shape, mirrored. See analysis/lib/merge-duplicates.mjs. Applied to mnpd-master.json's TBI subset only -- agency-3499-2026-08-14.json has zero exact duplicates (verified: 10,001 raw rows, 10,001 distinct signatures).",
      events: mergeEventsA,
      raw_count: master.records.length,
      canonical_count: canonicalA.length,
    },
    mnpd_exclusion: {
      rule: 'reason text or any other field matches /mnpd|metro nashville/i, checked against the full serialized record',
      excluded_from_rest: excludedMnpdDupes,
      note: "these rows are exact duplicates of records already in group A (mnpd-master.json) -- excluded from group B to avoid double-counting, not because they're uninformative.",
    },
  },
  population: {
    group_a: { name: "mnpd", filter: "TBI's canonical (deduped) searches whose reason text names MNPD/Metro Nashville, from mnpd-master.json -- MNPD has no ALPR network of its own; these are searches TBI ran through Flock's shared lookup, not searches of an MNPD-owned network", record_count: nMnpd, time_span: "2022-12-14 .. 2026-07-09" },
    group_b: { name: "other", filter: "TBI's reverse-view log (source-data/agency-3499-2026-08-14.json) minus MNPD-matching rows", record_count: N - nMnpd, time_span: "2026-03-23 .. 2026-07-31 (export capped: true)" },
  },
  null_model: {
    name: "label-shuffle-mnpd-vs-rest",
    description: `${DRAWS} random relabelings of the combined ${N}-record population into a ${nMnpd}/${N - nMnpd} split (preserving group sizes), same composition as kinds.js's own labelShuffleNull -- built here from the exported partitionNull rather than reimplementing the shuffle-and-rank logic.`,
    requested_by: 'user, 2026-08-14: "ok i want to know what the signal from noise is re: MNPD and the rest of the TBI data"',
  },
  organ: {
    module: "packages/engine/emergence/kinds.js",
    functions: ["partitionNull"],
    reused_unmodified: true,
    domain_mapping: {
      observed_statistic: "|prevalence(feature | mnpd) - prevalence(feature | other)|, one feature at a time",
      note: "NOT induceKinds()'s clustering search -- the two groups are given, not discovered; the clustering search step is skipped as not fitting this question, and impractically slow at this population size (~10,000 records) regardless. See script header.",
    },
  },
  parameters: [
    { name: "min_count", value: MIN_COUNT, justification: "a candidate needs at least this many occurrences across the combined population to have any statistical power." },
    { name: "draws", value: DRAWS },
    { name: "seed", value: SEED },
  ],
  output: {
    candidates: candidates.length,
    results: results.map((r) => ({
      feature: r.feature,
      count_total: r.countTotal,
      prevalence_mnpd: r.prevalenceMnpd,
      prevalence_other: r.prevalenceOther,
      diff: r.diff,
      p_value: r.pValue,
      significant_at_0_05: r.passed,
      direction: r.diff > 0 ? "over-represented-in-mnpd" : "under-represented-in-mnpd",
    })),
  },
  caveats: [
    "TIME-WINDOW CONFOUND, UNRESOLVED: group A spans 2022-12-14..2026-07-09 (MNPD's full history in this dataset); group B spans only 2026-03-23..2026-07-31 (agency-3499.json's export cap). Only 4 of group A's 107 records fall inside group B's window -- too few to build a time-matched comparison instead. Any significant feature here could reflect a real MNPD-specific pattern, OR a general shift in TBI's activity mix between 2022-2025 and mid-2026, and this design cannot distinguish the two.",
    "Schema-safe features only (kw:*, has_case, dow:*, hour:*) -- fields present in only one source schema (search_type, redactions{}, sources[]) were excluded deliberately; including them would have trivially 'distinguished' the groups as an artifact of which file a record came from.",
    "kw:* tokens come from extractSignature() (eochat/eval/agent/crispr-search.mjs), a generic keyword extractor, not this project's MNPD-specific bucket rule table (analysis/mnpd.reason-kinds.method.json) -- that table was built and calibrated on MNPD-flavored reason text and was not extended to TBI's much broader nationwide vocabulary for this run.",
    `NO MULTIPLE-COMPARISONS CORRECTION: ${candidates.length} features were tested independently at p<=0.05, so ~${Math.round(candidates.length * 0.05)} 'significant' results would be expected from chance alone even if nothing were real (unlike induceKinds() itself, which Bonferroni-corrects across simultaneous candidates -- see kinds.js's own 'FAMILY-WISE CORRECTION' comment). Read the near-0.05 results (has_case, dow:Tue/Sat/Sun, hour:18-23, kw:assault/welfare/check/battery/ongoing) as suggestive, not confirmed. The p=0.000 results at the top (kw:traffic/infraction/warrant/drugs/fugitive/wanted/arrest all at or near 0% within MNPD vs 18-34% in the rest of TBI's activity, and kw:missing/assist/silver/robbery/burglary the reverse) do not depend on this correction to be credible -- draws=500 cannot resolve a p-value finer than 1/500=0.002 regardless, but a feature sitting at 0% prevalence in a 107-record group against 18-34% elsewhere is a stark separation on its face, not a borderline call.`,
  ],
};
writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
