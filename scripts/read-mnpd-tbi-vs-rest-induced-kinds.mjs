// eoreader6 · scripts/read-mnpd-tbi-vs-rest-induced-kinds -- "eoreader6
// should be able to have all signal from noise emerge" (user, 2026-08-14).
//
// read-mnpd-tbi-signal-vs-rest.mjs tested a hypothesis I already had
// (target:mnpd vs target:other) feature by feature. This is the actual
// discovery organ: induceKinds() over the SAME combined population, with
// `target:*` as just one candidate field among ~170 -- free to cohere with
// whatever the algorithm finds cohesive on its own, or not, rather than
// something tested in isolation against a null I built for that one
// question. Same population-construction and dedup as the sibling script
// (SYN.merge, schema-safe fields only) -- see that file's header for why.
//
// MIN_PREVALENCE IS SCALED, NOT REUSED VERBATIM, AND HERE IS WHY: this
// project's prior induceKinds() runs used minPrevalence=0.02, calibrated on
// populations where the interesting substructure is a meaningful fraction
// of the whole (a book's own recurring cast). Here the group of interest
// (MNPD, 107 records) is ~1% of the combined 10,104-record population BY
// CONSTRUCTION -- 0.02 would silently refuse kw:silver (77 total),
// kw:robbery (31), kw:burglary (15) as candidates before induceKinds() ever
// sees them, not because they're not real (the label-shuffle sibling script
// found them significant at p=0.000) but because a 2%-of-10,104 floor is
// the wrong instrument for a population shaped like this one. minPrevalence
// is set instead to reproduce this project's actual standing floor -- at
// least MIN_COUNT=8 occurrences, the same number every other script here
// has used -- expressed as the fraction appropriate to THIS population's
// size. This is a structural correction, not a value chosen by checking
// what it does to the result (CLAUDE.md's own rule): the math (subgroup
// size / population size) is fixed before any candidate field is counted.
//
//   node scripts/read-mnpd-tbi-vs-rest-induced-kinds.mjs [--limit N] [--seed-rest S]
//
// --limit N: cap the "rest" population to N randomly-sampled records (seeded,
// reproducible) instead of all 9,997 -- for timing calibration before
// committing to the full run. Omit for the real run.

import { readFileSync, writeFileSync } from "node:fs";
import { induceKinds } from "../packages/engine/emergence/kinds.js";
import { detectExactDuplicateEvents, projectMergedRecords, exactSourceRecordSignature } from "../../../../mnpd-network-audit/analysis/lib/merge-duplicates.mjs";
import { extractSignature } from "../../../eochat/eval/agent/crispr-search.mjs";

const MASTER = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master.json";
const TBI_FULL = "/Users/mlacy/Documents/mnpd-network-audit/source-data/agency-3499-2026-08-14.json";
const SCRIPT_REL = "eoWebLLM/eoreader6/scripts/read-mnpd-tbi-vs-rest-induced-kinds.mjs";

const MIN_COUNT = 8;
const PERMUTATIONS = 50;
const QUANTILE = 0.95;
const SEED = 42;
const RESEEDS = 2;

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : null;
const OUT_JSON = LIMIT
  ? `/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-vs-rest-induced-kinds.smoketest-${LIMIT}.json`
  : `/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-vs-rest-induced-kinds.json`;
const OUT_LOG = OUT_JSON.replace(/\.json$/, ".log");

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

// ── population (identical construction to read-mnpd-tbi-signal-vs-rest.mjs) ─
const master = JSON.parse(readFileSync(MASTER, "utf8"));
const mergeEvents = detectExactDuplicateEvents(master.records, exactSourceRecordSignature);
const canonical = projectMergedRecords(master.records, mergeEvents).filter((n) => !n.mergedInto);
const mnpdGroup = canonical
  .filter((n) => n.record.source_record.organization_name === "Tennessee Bureau of Investigation")
  .map((n) => ({ reason: n.record.source_record.reason, case_number: n.record.source_record.case_number, t: parseUTC(n.record.source_record.search_time_utc) }));

const tbiFull = JSON.parse(readFileSync(TBI_FULL, "utf8"));
const restAll = tbiFull.results.filter((r) => !MNPD_RE.test(JSON.stringify(r))).map((r) => ({ reason: r.reason, case_number: r.case_number, t: parseUTC(r.search_time_utc) }));

// seeded sample for --limit (reproducible, not cherry-picked)
let state = SEED | 0;
const rnd = () => { state = (state * 1664525 + 1013904223) | 0; return (state >>> 0) / 4294967296; };
const restGroup = LIMIT
  ? [...restAll].sort(() => rnd() - 0.5).slice(0, Math.max(0, LIMIT - mnpdGroup.length))
  : restAll;

say(`group A (mnpd): ${mnpdGroup.length}  group B (rest${LIMIT ? `, seeded sample of ${restGroup.length}/${restAll.length}` : ""}): ${restGroup.length}`);

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

const records = [
  ...mnpdGroup.map((r, i) => ({ id: `mnpd:${i}`, features: featuresFor(r), target: "mnpd" })),
  ...restGroup.map((r, i) => ({ id: `other:${i}`, features: featuresFor(r), target: "other" })),
].map((rec) => ({
  id: rec.id,
  attributes: [...rec.features, `target:${rec.target}`].map((field_id) => ({ field_id, value_type: "boolean", count: 1 })),
}));

const N = records.length;
const MIN_PREVALENCE = MIN_COUNT / N; // structural correction -- see header
const opts = {
  population: LIMIT ? `mnpd-vs-rest-tbi-smoketest-${N}` : `mnpd-vs-rest-tbi-${N}`,
  minPrevalence: MIN_PREVALENCE,
  minKindSize: MIN_COUNT,
  permutations: PERMUTATIONS,
  quantile: QUANTILE,
  seed: SEED,
  reseeds: RESEEDS,
};

const fieldCounts = new Map();
for (const r of records) for (const a of r.attributes) fieldCounts.set(a.field_id, (fieldCounts.get(a.field_id) ?? 0) + 1);
const candidateFieldCount = [...fieldCounts.values()].filter((n) => n / N >= MIN_PREVALENCE).length;

say(`records: ${N}  minPrevalence: ${MIN_PREVALENCE.toFixed(6)} (= ${MIN_COUNT}/${N})  candidate fields: ${candidateFieldCount}`);
say(`opts: ${JSON.stringify(opts)}`);
say(`start: ${new Date().toISOString()}`);
const t0 = Date.now();

const kinds = induceKinds(records, opts);

const elapsedMs = Date.now() - t0;
const mm = Math.floor(elapsedMs / 60000);
const ss = String(Math.round((elapsedMs % 60000) / 1000)).padStart(2, "0");
say(`induceKinds total: ${mm}:${ss} (m:ss), ${elapsedMs}ms`);
say(`end: ${new Date().toISOString()}`);
say(``);
say(`kinds found: ${kinds.length}`);
say(``);

const mnpdIds = new Set(records.filter((r) => r.id.startsWith("mnpd:")).map((r) => r.id));
for (const k of kinds) {
  const hit = k.members.filter((id) => mnpdIds.has(id)).length;
  const rate = (hit / k.members.length) * 100;
  say(`--- ${k.core?.field_id ?? k.label} ---`);
  say(`size: ${k.members.length} cohesion: ${k.cohesion.toFixed(3)} height: ${k.height} warrant: ${k.heightGate?.warrant ?? "n/a"}`);
  say(`core: ${JSON.stringify(k.core)}`);
  say(`mnpd-group membership: ${hit}/${k.members.length} (${rate.toFixed(1)}%, base rate ${((mnpdGroup.length / N) * 100).toFixed(1)}%)`);
  say(`sample members: ${k.members.slice(0, 8).join(", ")}`);
  say(``);
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
    merge: { pattern: "SYN.merge, mirrored from referents/index.js -- see analysis/lib/merge-duplicates.mjs", events: mergeEvents, raw_count: master.records.length, canonical_count: canonical.length },
    sampling: LIMIT ? { rest_population_sampled: true, sample_size: restGroup.length, of_total: restAll.length, seed: SEED, note: "timing-calibration run, not the full population" } : { rest_population_sampled: false },
  },
  population: {
    group_a: { name: "mnpd", record_count: mnpdGroup.length },
    group_b: { name: "other", record_count: restGroup.length, of_total_available: restAll.length },
    combined_record_count: N,
  },
  null_model: {
    name: "induceKinds-unsupervised",
    description: "Real emergent discovery, not a pre-specified hypothesis test: target:mnpd/target:other is one candidate field among many, admitted or not on the same terms as every kw:*/dow:*/hour:*/has_case field. See sibling script mnpd-tbi-signal-vs-rest.json for the confirmatory version of this same question.",
    requested_by: 'user, 2026-08-14: "eoreader6 should be able to have all signal from noise emerge"',
  },
  organ: {
    module: "packages/engine/emergence/kinds.js",
    functions: ["induceKinds"],
    reused_unmodified: true,
  },
  parameters: [
    { name: "minPrevalence", value: MIN_PREVALENCE, justification: `MIN_COUNT/N = ${MIN_COUNT}/${N} -- reproduces this project's standing >=8-occurrence floor (every other script here uses MIN_COUNT=8) correctly scaled to this population's size, rather than reusing 0.02 (calibrated for book-length populations where the group of interest is a large fraction of the whole, not ~1% as MNPD is here). Fixed by this arithmetic before any candidate field was counted -- not chosen by looking at which kinds it produced.` },
    { name: "minKindSize", value: MIN_COUNT },
    { name: "permutations", value: PERMUTATIONS },
    { name: "quantile", value: QUANTILE },
    { name: "seed", value: SEED },
    { name: "reseeds", value: RESEEDS },
  ],
  output: {
    candidate_field_count: candidateFieldCount,
    kinds: kinds.map((k) => ({
      core: k.core,
      size: k.members.length,
      cohesion: k.cohesion,
      height: k.height,
      warrant: k.heightGate?.warrant ?? null,
      mnpd_membership: { count: k.members.filter((id) => mnpdIds.has(id)).length, of: k.members.length, base_rate: mnpdGroup.length / N },
      members: k.members,
    })),
  },
  caveats: LIMIT ? ["TIMING-CALIBRATION RUN: group B is a seeded random sample, not the full 'rest' population -- not the answer, a measurement of how long the answer will take."] : [
    "Same time-window mismatch as mnpd-tbi-signal-vs-rest.json: group A spans 2022-12-14..2026-07-09, group B (agency-3499.json, capped:true) spans only 2026-03-23..2026-07-31.",
  ],
};
writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
