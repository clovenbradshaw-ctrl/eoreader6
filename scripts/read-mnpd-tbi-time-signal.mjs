// eoreader6 · scripts/read-mnpd-tbi-time-signal -- the NUL is "all of TBI's
// own MNPD-network searches, shuffled." User's framing (2026-08-14): define
// the null population as TBI specifically (org_id 3499, all
// match_confidence:"confirmed_tn" since they come straight from mnpd.csv) --
// the single biggest, steadiest searcher of MNPD's network -- rather than
// the whole 22-agency, wildly-uneven population. Then see what, if
// anything, clusters in TIME beyond what a random reshuffle of TBI's own
// search timestamps across TBI's own reasons would predict.
//
// THE ORGAN, NOT A NEW ONE: emergence/binding.js's bindLinks/displacementNull
// -- already built, already validated (goldens/network) -- reads modality-
// blind "arrivals" (integer positions) per entity and, for every co-arriving
// pair, holds A's arrivals fixed and shuffles B's within their shared span,
// exactly the "shuffle the records" null the user named, just executed
// per-pair rather than as one global shuffle.
//
// DEDUPLICATION IS A SYN ("its a SYN" -- user, 2026-08-14): mnpd-master.json
// turned out to hold 51.8% exact-duplicate rows dataset-wide (75% within
// TBI specifically -- 424 raw rows, 107 distinct). Collapsing those is the
// SAME event-projection shape referents/index.js's own SYN.merge case
// already uses: non-destructive, mergedInto chains, nothing deleted. See
// analysis/lib/merge-duplicates.mjs (mirrors that file's pattern; does not
// import it, since its `surfaces` payload doesn't fit arbitrary records).
// mnpd-master.json on disk is never touched -- this script re-derives the
// deduplicated view in memory, every run, from the raw records.
//
// A SEPARATE CONFOUND, FOUND BY RUNNING IT ONCE AND READING THE OUTPUT:
// even after dedup, TBI's activity is genuinely bursty (real re-queries
// within one case, minutes apart), which floors the mechanically-derived
// window at 1h. At that window, two keywords extracted from the SAME reason
// string (e.g. "STOLEN VEHICLE" -> kw:stolen + kw:vehicle) always co-arrive
// at distance zero -- vocabulary co-occurrence within one record, not two
// events clustering in time. bindLinks/displacementNull only ever see
// positions, not record identity, so they cannot tell the difference by
// themselves; `crossRecordBreakdown` below adds that distinction back as a
// diagnostic computed OUTSIDE the organ (the p-value itself is still 100%
// the organ's own, unmodified).
//
// PARAMETERS FIXED BEFORE LOOKING AT ANY PAIRWISE RESULT (CLAUDE.md: never
// tune a parameter by checking what it does to the answer):
//   window    = TBI's own median inter-search gap (hours, post-dedup), floored at 1.
//   MIN_COUNT = 6 -- a candidate needs at least this many of TBI's canonical
//               records to carry it, or there is no statistical power to
//               say anything about its timing at all.
//   draws = 500, seed = 42 -- declared, matches this project's existing
//               convention (read-mnpd-network-audit.mjs uses seed 42).
//
// Output conforms to analysis/SCHEMA.md ("eoreader6-analysis-artifact",
// kind: "null-signal-result").
//
//   node scripts/read-mnpd-tbi-time-signal.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { bindLinks } from "../packages/engine/emergence/binding.js";
import { detectExactDuplicateEvents, projectMergedRecords, exactSourceRecordSignature } from "../../../../mnpd-network-audit/analysis/lib/merge-duplicates.mjs";

const MASTER = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master.json";
const OUT_JSON = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-time-signal.json";
const OUT_LOG = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-tbi-time-signal.log";
const SCRIPT_REL = "eoWebLLM/eoreader6/scripts/read-mnpd-tbi-time-signal.mjs";

const MIN_COUNT = 6;
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

// ── load + non-destructive dedup (SYN.merge over the FULL master, so row:N
// ids match the convention read-mnpd-network-audit.mjs already uses) ──────
const master = JSON.parse(readFileSync(MASTER, "utf8"));
const mergeEvents = detectExactDuplicateEvents(master.records, exactSourceRecordSignature);
const projected = projectMergedRecords(master.records, mergeEvents);
const canonical = projected.filter((n) => !n.mergedInto);
say(`dedup (SYN.merge, exact source_record equality): ${master.records.length} raw -> ${canonical.length} canonical (${master.records.length - canonical.length} merged away, ${mergeEvents.length} merge event(s))`);

// ── population: TBI's canonical MNPD-network searches ─────────────────────
const tbi = canonical.filter((n) => n.record.source_record.organization_name === "Tennessee Bureau of Investigation");
say(`TBI canonical records: ${tbi.length} (${tbi.reduce((s, n) => s + n.mergedFrom.length, 0)} raw duplicates folded in)`);
say(`match_confidence breakdown: ${JSON.stringify(
  tbi.reduce((acc, n) => { const k = n.record.provenance?.match_confidence ?? "?"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}),
)}`);

const withTime = tbi
  .map((n) => ({ n, t: parseUTC(n.record.source_record.search_time_utc) }))
  .filter((x) => Number.isFinite(x.t));
if (withTime.length !== tbi.length) say(`dropped ${tbi.length - withTime.length} record(s) with unparseable search_time_utc`);
withTime.sort((a, b) => a.t - b.t);

const HOUR = 3600 * 1000;
const t0 = withTime[0].t;
const positioned = withTime.map(({ n, t }) => ({ id: n.id, r: n.record, pos: Math.round((t - t0) / HOUR) }));
say(`time span: ${positioned[0].pos}h - ${positioned.at(-1).pos}h (${(positioned.at(-1).pos / 24).toFixed(0)} days), first search ${new Date(t0).toISOString()}`);

// window: TBI's OWN median inter-search gap (post-dedup), in hours -- fixed
// before any feature-level test runs.
const allPos = positioned.map((p) => p.pos).sort((a, b) => a - b);
const gaps = [];
for (let i = 1; i < allPos.length; i++) gaps.push(allPos[i] - allPos[i - 1]);
gaps.sort((a, b) => a - b);
const medianGap = gaps[Math.floor(gaps.length / 2)];
const WINDOW = Math.max(1, medianGap);
say(`TBI's own median inter-search gap (post-dedup): ${medianGap}h -> window = ${WINDOW}h`);

const featuresFor = (row) => {
  const f = [];
  const reasonNorm = (row.source_record.reason ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (reasonNorm === "mnpd") f.push("bare_mnpd");
  const caseNum = (row.source_record.case_number ?? "").trim();
  if (caseNum.length > 0) f.push("has_case");
  const redaction = row.source_record.redaction_reasons ?? "";
  if (/name/i.test(String(redaction))) f.push("redacted_name");
  for (const kw of row.derived?.kw ?? []) f.push(`kw:${kw}`);
  if (row.derived?.bucket) f.push(`bucket:${row.derived.bucket}`);
  return f;
};

// Each canonical record keeps a stable recordIndex (its rank in `positioned`)
// so the diagnostic below can tell "two DIFFERENT records landed in the same
// hour" apart from "one record's reason text produced two keywords" --
// bindLinks/displacementNull only ever see positions, never record identity.
const byFeature = new Map();      // feature -> [pos, ...]
const byFeatureRec = new Map();   // feature -> [recordIndex, ...] (same order)
positioned.forEach(({ r, pos }, recordIndex) => {
  for (const feat of featuresFor(r)) {
    if (!byFeature.has(feat)) { byFeature.set(feat, []); byFeatureRec.set(feat, []); }
    byFeature.get(feat).push(pos);
    byFeatureRec.get(feat).push(recordIndex);
  }
});

const sortByPos = (id) => {
  const idx = byFeature.get(id).map((pos, i) => [pos, byFeatureRec.get(id)[i]]).sort((a, b) => a[0] - b[0]);
  return { arrivals: idx.map((x) => x[0]), recs: idx.map((x) => x[1]) };
};

const entities = [...byFeature.keys()]
  .filter((id) => byFeature.get(id).length >= MIN_COUNT)
  .map((id) => ({ id, ...sortByPos(id) })); // {id, arrivals, recs}
say(`candidate features (>= ${MIN_COUNT} of TBI's ${positioned.length} canonical records): ${entities.length}`);
say(entities.map((e) => `  ${e.id}: ${e.arrivals.length}`).join("\n"));
say(``);

// bindLinks/displacementNull get ONLY {id, arrivals} -- the real,
// unmodified organ. `recs` rides along outside it for the diagnostic below.
const { pairs, nulls } = bindLinks(entities.map(({ id, arrivals }) => ({ id, arrivals })), { window: WINDOW, draws: DRAWS, seed: SEED });
say(`co-arriving pairs within ${WINDOW}h of each other: ${pairs.length}`);
say(``);

const crossRecordBreakdown = (aId, bId) => {
  const { arrivals: aPos, recs: aRec } = sortByPos(aId);
  const { arrivals: bPos, recs: bRec } = sortByPos(bId);
  let same = 0, cross = 0, bi = 0;
  for (let i = 0; i < aPos.length; i++) {
    const ai = aPos[i];
    while (bi < bPos.length && bPos[bi] < ai - WINDOW) bi++;
    let bj = bi;
    while (bj < bPos.length && bPos[bj] <= ai + WINDOW) {
      if (bRec[bj] === aRec[i]) same++; else cross++;
      bj++;
    }
  }
  return { same, cross };
};

const results = pairs.map((p) => {
  const key = `${p.a.id} ${p.b.id}`; // MUST match binding.js's own key exactly
  const n = nulls.get(key);
  const { same, cross } = crossRecordBreakdown(p.a.id, p.b.id);
  return { a: p.a.id, b: p.b.id, observed: p.overlap, sameRecord: same, crossRecord: cross, ...n };
}).sort((x, y) => x.pValue - y.pValue || y.crossRecord - x.crossRecord);

say(`-- ranked by significance, WITH same-record-vs-cross-record breakdown --`);
say(`(sameRecord = both features came from one record's own reason text -- vocabulary, not timing.`);
say(` crossRecord = two DIFFERENT records landed within ${WINDOW}h of each other -- the actual time claim.)`);
say(``);
for (const res of results) {
  const nullMedian = res.samples?.length ? res.samples[Math.floor(res.samples.length / 2)] : "n/a";
  const flag = res.pValue <= 0.05 ? "  <-- p<=0.05" : "";
  const kind = res.crossRecord === 0 ? "  [vocabulary-only, 0 cross-record]" : res.sameRecord === 0 ? "  [pure cross-record]" : "";
  say(`${res.a} <-> ${res.b}`.padEnd(46) + ` observed=${String(res.observed).padStart(3)} (same=${res.sameRecord} cross=${res.crossRecord}) null-median=${String(nullMedian).padStart(3)} p=${res.pValue.toFixed(3)}${flag}${kind}`);
}

// ── SCHEMA.md-conformant artifact ──────────────────────────────────────────
const artifact = {
  schema: "eoreader6-analysis-artifact",
  schema_version: "1.0.0",
  kind: "null-signal-result",
  generated_by: SCRIPT_REL,
  generated_at: new Date().toISOString(),
  inputs: [{ path: MASTER, record_count: master.records.length }],
  preprocessing: {
    merge: {
      pattern: "SYN.merge -- packages/engine/referents/index.js's own event-projection shape, mirrored (not imported). See analysis/lib/merge-duplicates.mjs.",
      rule: "exact source_record equality (org_id, organization_name, reason, case_number, search_time_utc, redaction_reasons all equal)",
      events: mergeEvents,
      raw_count: master.records.length,
      canonical_count: canonical.length,
      merged_away: master.records.length - canonical.length,
    },
  },
  population: {
    filter: "organization_name === 'Tennessee Bureau of Investigation', canonical (post-dedup) records only",
    record_count: positioned.length,
  },
  null_model: {
    name: "shuffled-tbi",
    description: "For each candidate feature pair, B's arrivals are shuffled within the pair's shared time extent (TBI's own timeline), A's held fixed -- displacementNull's own null, applied to TBI specifically rather than the whole 22-agency population.",
    requested_by: 'user, 2026-08-14: "lets define our NUL: all TBI records shuffled. lets see what signal we can find"',
  },
  organ: {
    module: "packages/engine/emergence/binding.js",
    functions: ["bindLinks", "displacementNull"],
    reused_unmodified: true,
    domain_mapping: {
      arrival_position: "integer hours since TBI's first MNPD-network search in this dataset (post-dedup)",
      entity: "a candidate reason-feature within TBI's canonical records (kw:*, bucket:*, bare_mnpd, has_case, redacted_name)",
    },
  },
  parameters: [
    { name: "window", value: WINDOW, unit: "hours", justification: "TBI's own median inter-search gap (post-dedup), floored at 1h -- a property of this population's cadence, fixed before any feature-level test ran." },
    { name: "min_count", value: MIN_COUNT, justification: "a candidate needs at least this many canonical TBI records to have any statistical power to say anything about its timing." },
    { name: "draws", value: DRAWS },
    { name: "seed", value: SEED },
  ],
  output: {
    entities: entities.map((e) => ({ id: e.id, count: e.arrivals.length })),
    results: results.map(({ a, b, observed, sameRecord, crossRecord, pValue, samples }) => ({
      a, b,
      observed_overlap: observed,
      same_record_overlap: sameRecord,
      cross_record_overlap: crossRecord,
      null_median: samples?.length ? samples[Math.floor(samples.length / 2)] : null,
      p_value: pValue,
      significant_at_0_05: pValue <= 0.05,
      interpretation: crossRecord === 0 ? "vocabulary-only" : sameRecord === 0 ? "pure-cross-record" : "mixed",
    })),
  },
  caveats: [
    "Every pair here is dominated by same-record vocabulary co-occurrence (see cross_record_overlap per result) -- window=1h floored by TBI's own genuinely bursty cadence makes within-record keyword pairs and true cross-event clustering statistically indistinguishable to bindLinks itself; only the cross_record_overlap diagnostic (computed outside the organ) separates them.",
    "A pair with p<=0.05 and cross_record_overlap==0 is NOT evidence of temporal clustering -- it says these two words tend to appear in the same reason string, a vocabulary fact already visible in analysis/mnpd.reason-kinds.method.json's bucket rules, not a new finding.",
    "This tests pairwise co-arrival between FEATURES, not whether TBI's overall activity is bursty (already known qualitatively -- median gap 0h) nor whether any single feature's own arrivals are self-clustering (a different statistic, not computed here).",
  ],
};
writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
