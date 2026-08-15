// eoreader6 · scripts/read-mnpd-tbi-motifs -- "detect the motifs" (user,
// 2026-08-14). Real induceKinds() over JUST the MNPD-related TBI records
// (a few hundred, not the ~150K+ full TBI population) -- this is the part
// of "find kinds within those" that does NOT need the giant "rest of TBI"
// population as a baseline at all, so it doesn't need chunking, sampling,
// or a timing calibration to be tractable. It's already the right size.
//
// SOURCES, MERGED: (1) mnpd-master.json's TBI subset (107 canonical, built
// from mnpd.csv/nashville.csv), (2) every row across the growing
// source-data/by-agency/3499-.../*.json backfill whose full serialized
// record matches /mnpd|metro nashville/i (429 raw hits as of this run, and
// climbing -- the backfill is still landing). Deduped together via the same
// SYN.merge pattern (analysis/lib/merge-duplicates.mjs), with a schema-
// tolerant signature (org_id + reason + case_number + PARSED time, not the
// raw time string, since the two sources format timestamps differently).
//
// THREE FEATURE AXES, PER THE USER'S OWN FRAMING ("particular types of
// things being searched for, particular times, networks used"):
//   content  kw:*      -- extractSignature() over `reason`, same as every
//                          other script here.
//   time     dow:*/hour:* -- day-of-week / 6-hour buckets of search_time_utc.
//   network  reach:*   -- total_networks_searched, bucketed from this
//                          population's OWN quantile shape (measured before
//                          writing the buckets below, not fit to look nice):
//                          8 records sit at exactly 0 (reach:zero -- worth a
//                          look on its own merits), the bulk sits either
//                          under 1,360 (10th pct) or over 5,811 (median) up
//                          to a hard ceiling at 6,450 -- reach:narrow (<1000),
//                          reach:broad (1000-4999), reach:maximal (>=5000).
//
// Output conforms to analysis/SCHEMA.md ("eoreader6-analysis-artifact",
// kind: "null-signal-result"). This IS induceKinds() itself -- the real
// emergent organ, not a hypothesis test -- so `output.kinds` here are what
// the engine actually found cohesive, not something pre-specified.
//
//   node scripts/read-mnpd-tbi-motifs.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { induceKinds } from "../packages/engine/emergence/kinds.js";
import { detectExactDuplicateEvents, projectMergedRecords } from "../../../../mnpd-network-audit/analysis/lib/merge-duplicates.mjs";
import { extractSignature } from "../../../eochat/eval/agent/crispr-search.mjs";

const MASTER = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master.json";
const TBI_DIR = "/Users/mlacy/Documents/mnpd-network-audit/source-data/by-agency/3499-tennessee-bureau-of-investigation/";
const OUT_JSON = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-motifs.json";
const OUT_LOG = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-motifs.log";
const SCRIPT_REL = "eoWebLLM/eoreader6/scripts/read-mnpd-tbi-motifs.mjs";

const MIN_COUNT = 8;
const PERMUTATIONS = 50;
const QUANTILE = 0.95;
const SEED = 42;
const RESEEDS = 2;
const MNPD_RE = /mnpd|metro nashville/i;

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
const REACH_BUCKET = (n) => (n === 0 ? "zero" : n < 1000 ? "narrow" : n < 5000 ? "broad" : "maximal");

// ── gather: mnpd-master.json's TBI subset + the growing by-agency backfill ──
const master = JSON.parse(readFileSync(MASTER, "utf8"));
const fromMaster = master.records
  .filter((r) => r.source_record.organization_name === "Tennessee Bureau of Investigation")
  .map((r) => ({
    org_id: String(r.source_record.org_id),
    reason: r.source_record.reason,
    case_number: r.source_record.case_number,
    t: parseUTC(r.source_record.search_time_utc),
    total_networks_searched: null, // mnpd.csv schema doesn't carry this
    source: "mnpd-master.json",
  }));

let skippedFiles = [];
let parsedRows = 0;
const fromBackfill = [];
for (const fn of readdirSync(TBI_DIR)) {
  if (!fn.endsWith(".json")) continue;
  let d;
  try { d = JSON.parse(readFileSync(TBI_DIR + fn, "utf8")); } catch { skippedFiles.push(fn); continue; }
  for (const r of d.results ?? []) {
    parsedRows++;
    if (!MNPD_RE.test(JSON.stringify(r))) continue;
    fromBackfill.push({
      org_id: String(r.org_id),
      reason: r.reason,
      case_number: r.case_number,
      t: parseUTC(r.search_time_utc),
      total_networks_searched: r.total_networks_searched ?? null,
      source: `by-agency/${fn}`,
    });
  }
}
say(`mnpd-master.json TBI subset: ${fromMaster.length}`);
say(`by-agency backfill: ${parsedRows} rows parsed across ${readdirSync(TBI_DIR).filter((f) => f.endsWith(".json")).length - skippedFiles.length} month-files (${skippedFiles.length} still being written, skipped: ${skippedFiles.join(", ") || "none"}), ${fromBackfill.length} MNPD/metro-nashville hits`);

// ── dedup across BOTH sources: schema-tolerant signature (parsed time, not
// the raw string -- the two sources format timestamps differently) ────────
const all = [...fromMaster, ...fromBackfill];
const sig = (r) => `${r.org_id}|${(r.reason ?? "").trim().toLowerCase()}|${(r.case_number ?? "").trim()}|${Number.isFinite(r.t) ? r.t : "NaT"}`;
const events = detectExactDuplicateEvents(all, sig);
const projected = projectMergedRecords(all, events);
const byId = new Map(projected.map((n) => [n.id, n]));
const canonical = projected.filter((n) => !n.mergedInto);

// ENRICH, don't just pick-and-discard: referents/index.js's own SYN.merge
// case unions `surfaces` across every merged-in id -- it never keeps only
// the first-seen payload. mnpd-master.json's records happened to be first
// in `all` and never carry total_networks_searched at all, so a naive
// "canonical = first occurrence" silently threw away that field on every
// event that ALSO appears in the richer by-agency backfill. Adopt it from
// whichever duplicate (including the canonical record itself) actually has it.
let enriched = 0;
for (const n of canonical) {
  if (n.record.total_networks_searched !== null) continue;
  for (const fromId of n.mergedFrom) {
    const v = byId.get(fromId)?.record.total_networks_searched;
    if (v !== null && v !== undefined) { n.record = { ...n.record, total_networks_searched: v }; enriched++; break; }
  }
}
say(`combined: ${all.length} raw -> ${canonical.length} canonical (${all.length - canonical.length} merged away, ${events.length} merge event(s) across both sources)`);
say(`enriched ${enriched} canonical record(s) with total_networks_searched recovered from a merged-away duplicate`);
say(``);

// ── build induceKinds() records: content + time + network-reach ───────────
const records = canonical.map((n, i) => {
  const r = n.record;
  const attrs = [];
  const push = (field_id) => attrs.push({ field_id, value_type: "boolean", count: 1 });
  for (const kw of extractSignature(r.reason ?? "", { max: 8 })) push(`kw:${kw}`);
  if (String(r.case_number ?? "").trim().length > 0) push("has_case");
  if (Number.isFinite(r.t)) {
    const d = new Date(r.t);
    push(`dow:${DOW[d.getUTCDay()]}`);
    push(`hour:${HOUR_BUCKET(d.getUTCHours())}`);
  }
  if (r.total_networks_searched !== null && r.total_networks_searched !== undefined) push(`reach:${REACH_BUCKET(r.total_networks_searched)}`);
  return { id: `row:${i}`, attributes: attrs };
});

const N = records.length;
const MIN_PREVALENCE = MIN_COUNT / N;
const opts = { population: `mnpd-tbi-motifs-${N}`, minPrevalence: MIN_PREVALENCE, minKindSize: MIN_COUNT, permutations: PERMUTATIONS, quantile: QUANTILE, seed: SEED, reseeds: RESEEDS };

const fieldCounts = new Map();
for (const r of records) for (const a of r.attributes) fieldCounts.set(a.field_id, (fieldCounts.get(a.field_id) ?? 0) + 1);
const candidateFieldCount = [...fieldCounts.values()].filter((c) => c / N >= MIN_PREVALENCE).length;

say(`records: ${N}  minPrevalence: ${MIN_PREVALENCE.toFixed(4)} (=${MIN_COUNT}/${N})  candidate fields: ${candidateFieldCount}`);
say(`opts: ${JSON.stringify(opts)}`);
say(`start: ${new Date().toISOString()}`);
const t0 = Date.now();

const kinds = induceKinds(records, opts);

const elapsedMs = Date.now() - t0;
say(`induceKinds total: ${Math.floor(elapsedMs / 60000)}:${String(Math.round((elapsedMs % 60000) / 1000)).padStart(2, "0")} (m:ss), ${elapsedMs}ms`);
say(`end: ${new Date().toISOString()}`);
say(``);
say(`kinds (motifs) found: ${kinds.length}`);
say(``);

for (const k of kinds) {
  say(`--- ${k.core?.field_id ?? k.label} ---`);
  say(`size: ${k.members.length} cohesion: ${k.cohesion.toFixed(3)} height: ${k.height} warrant: ${k.heightGate?.warrant ?? "n/a"}`);
  say(`core: ${JSON.stringify(k.core)}`);
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
    { path: TBI_DIR, record_count: parsedRows, note: `snapshot of an in-progress backfill; ${skippedFiles.length} file(s) mid-write at read time` },
  ],
  preprocessing: {
    merge: { pattern: "SYN.merge, mirrored from referents/index.js -- see analysis/lib/merge-duplicates.mjs", rule: "org_id + reason + case_number + PARSED search time equal (schema-tolerant across mnpd-master.json and by-agency's differently-formatted timestamps)", events, raw_count: all.length, canonical_count: canonical.length },
  },
  population: { filter: "every TBI record (either source) matching /mnpd|metro nashville/i anywhere on the record, deduped", record_count: N },
  null_model: {
    name: "induceKinds-unsupervised-within-mnpd",
    description: "No comparison group -- real emergent discovery within the MNPD-related set alone. Answers 'what recurring structure exists inside this set' (motifs), not 'how does this set differ from TBI's other activity' (that's the separate mnpd-tbi-vs-rest / mnpd-tbi-vs-rest-induced-kinds artifacts).",
    requested_by: 'user, 2026-08-14: "we need to use the hundreds of MNPD related TBI as our set, but also find kinds withn those" / "detect the motifs"',
  },
  organ: { module: "packages/engine/emergence/kinds.js", functions: ["induceKinds"], reused_unmodified: true,
    domain_mapping: { field_axes: { content: "kw:* via extractSignature() over `reason`", time: "dow:*, hour:* from search_time_utc", network: "reach:* from total_networks_searched, bucketed from THIS population's own quantiles (zero/narrow <1000/broad <5000/maximal)" } } },
  parameters: [
    { name: "minPrevalence", value: MIN_PREVALENCE, justification: `MIN_COUNT/N = ${MIN_COUNT}/${N} -- this project's standing >=8-occurrence floor, scaled to this population's actual size, fixed before candidate fields were counted.` },
    { name: "minKindSize", value: MIN_COUNT },
    { name: "permutations", value: PERMUTATIONS },
    { name: "quantile", value: QUANTILE },
    { name: "seed", value: SEED },
    { name: "reseeds", value: RESEEDS },
  ],
  output: { candidate_field_count: candidateFieldCount, kinds: kinds.map((k) => ({ core: k.core, size: k.members.length, cohesion: k.cohesion, height: k.height, warrant: k.heightGate?.warrant ?? null, members: k.members })) },
  caveats: [
    "SNAPSHOT, NOT FINAL: the by-agency TBI backfill was still landing when this ran (see inputs[1].note) -- rerun once it stabilizes; kind membership and possibly which kinds exist at all may change as more months arrive.",
    "total_networks_searched is populated on every hit checked; sources[].source_org_name (which SPECIFIC other network corroborated a search) was checked and found null on effectively all MNPD-matching rows in this data -- not usable as a feature here, which is why 'network' is represented by search breadth (reach:*) rather than named target networks.",
  ],
};
writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
