// eoreader6 · scripts/read-mnpd-cross-agency-motifs -- "we have lots more
// data now for more NULs, lets discover structure of how MNPD stands out
// from what's happening there, they have different relationship with
// different PDs, lets see what we can uncover" (user, 2026-08-14).
//
// Generalizes read-mnpd-tbi-motifs.mjs from TBI alone to every agency with
// a populated source-data/by-agency/ folder. Real induceKinds() over the
// pooled MNPD/metro-nashville-tagged rows from ALL of them, with `org:*`
// (which agency) as an explicit candidate field alongside content/time/
// network-reach -- so if different agencies' MNPD-related activity really
// does cohere differently (Murfreesboro's shaped one way, Mt. Juliet's
// another), that's discovered, not assumed or tested one hypothesis at a
// time. Same organ, same non-destructive SYN.merge dedup, same "MNPD has no
// network of its own" framing as everywhere else in this project now.
//
//   node scripts/read-mnpd-cross-agency-motifs.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { induceKinds } from "../packages/engine/emergence/kinds.js";
import { detectExactDuplicateEvents, projectMergedRecords } from "../../../../mnpd-network-audit/analysis/lib/merge-duplicates.mjs";
import { extractSignature } from "../../../eochat/eval/agent/crispr-search.mjs";

const BY_AGENCY = "/Users/mlacy/Documents/mnpd-network-audit/source-data/by-agency/";
const OUT_JSON = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-cross-agency-motifs.json";
const OUT_LOG = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-cross-agency-motifs.log";
const SCRIPT_REL = "eoWebLLM/eoreader6/scripts/read-mnpd-cross-agency-motifs.mjs";

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

// ── gather every agency's MNPD-tagged rows ─────────────────────────────────
const agencies = readdirSync(BY_AGENCY).filter((f) => statSync(BY_AGENCY + f).isDirectory());
const raw = [];
let totalRowsScanned = 0;
const perAgencySummary = [];
for (const agencyDir of agencies) {
  const orgLabel = agencyDir.replace(/^\d+-/, "").replace(/-/g, " ");
  let agencyTotal = 0, agencyHits = 0;
  for (const fn of readdirSync(BY_AGENCY + agencyDir)) {
    if (!fn.endsWith(".json")) continue;
    let d;
    try { d = JSON.parse(readFileSync(BY_AGENCY + agencyDir + "/" + fn, "utf8")); } catch { continue; }
    for (const r of d.results ?? []) {
      agencyTotal++;
      totalRowsScanned++;
      if (!MNPD_RE.test(JSON.stringify(r))) continue;
      agencyHits++;
      raw.push({
        org_id: agencyDir.match(/^\d+/)?.[0] ?? agencyDir,
        org_label: orgLabel,
        reason: r.reason, case_number: r.case_number, t: parseUTC(r.search_time_utc),
        total_networks_searched: r.total_networks_searched ?? null,
      });
    }
  }
  perAgencySummary.push({ org_id: agencyDir.match(/^\d+/)?.[0] ?? agencyDir, org_label: orgLabel, rows_scanned: agencyTotal, mnpd_hits_raw: agencyHits });
  say(`${orgLabel.padEnd(28)} rows=${String(agencyTotal).padStart(7)}  mnpd_hits_raw=${String(agencyHits).padStart(4)}`);
}
say(``);
say(`total rows scanned across ${agencies.length} agencies: ${totalRowsScanned}, raw mnpd/metro-nashville hits: ${raw.length}`);

// ── dedup (SYN.merge), schema-tolerant signature, ENRICHING not discarding
// (the read-mnpd-tbi-motifs.mjs lesson -- keep whichever duplicate's fields
// are most complete rather than picking the first-seen and dropping the rest) ──
const sig = (r) => `${r.org_id}|${(r.reason ?? "").trim().toLowerCase()}|${(r.case_number ?? "").trim()}|${Number.isFinite(r.t) ? r.t : "NaT"}`;
const events = detectExactDuplicateEvents(raw, sig);
const projected = projectMergedRecords(raw, events);
const byId = new Map(projected.map((n) => [n.id, n]));
const canonical = projected.filter((n) => !n.mergedInto);
let enriched = 0;
for (const n of canonical) {
  if (n.record.total_networks_searched !== null) continue;
  for (const fromId of n.mergedFrom) {
    const v = byId.get(fromId)?.record.total_networks_searched;
    if (v !== null && v !== undefined) { n.record = { ...n.record, total_networks_searched: v }; enriched++; break; }
  }
}
say(`combined: ${raw.length} raw -> ${canonical.length} canonical (${raw.length - canonical.length} merged away, ${events.length} merge event(s)), enriched ${enriched} with recovered total_networks_searched`);
say(``);

const byAgencyCanonicalCount = new Map();
for (const n of canonical) byAgencyCanonicalCount.set(n.record.org_label, (byAgencyCanonicalCount.get(n.record.org_label) ?? 0) + 1);
say(`canonical MNPD-tagged records per agency:`);
for (const [label, n] of [...byAgencyCanonicalCount.entries()].sort((a, b) => b[1] - a[1])) say(`  ${label}: ${n}`);
say(``);

// ── build induceKinds() records: content + time + network-reach + AGENCY ──
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
  push(`org:${r.org_label}`);
  return { id: `row:${i}`, attributes: attrs };
});

const N = records.length;
const MIN_PREVALENCE = MIN_COUNT / N;
const opts = { population: `mnpd-cross-agency-motifs-${N}`, minPrevalence: MIN_PREVALENCE, minKindSize: MIN_COUNT, permutations: PERMUTATIONS, quantile: QUANTILE, seed: SEED, reseeds: RESEEDS };

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
say(``);
say(`kinds (motifs) found: ${kinds.length}`);
say(``);

const orgById = new Map(records.map((r, i) => [`row:${i}`, canonical[i].record.org_label]));
for (const k of kinds) {
  const orgCounts = new Map();
  for (const id of k.members) { const o = orgById.get(id); orgCounts.set(o, (orgCounts.get(o) ?? 0) + 1); }
  const orgBreakdown = [...orgCounts.entries()].sort((a, b) => b[1] - a[1]).map(([o, c]) => `${o}:${c}`).join(", ");
  say(`--- ${k.core?.field_id ?? k.label} ---`);
  say(`size: ${k.members.length} cohesion: ${k.cohesion.toFixed(3)} height: ${k.height} warrant: ${k.heightGate?.warrant ?? "n/a"}`);
  say(`core: ${JSON.stringify(k.core)}`);
  say(`agency breakdown: ${orgBreakdown}`);
  say(`sample members: ${k.members.slice(0, 8).join(", ")}`);
  say(``);
}

const artifact = {
  schema: "eoreader6-analysis-artifact",
  schema_version: "1.0.0",
  kind: "null-signal-result",
  generated_by: SCRIPT_REL,
  generated_at: new Date().toISOString(),
  inputs: [{ path: BY_AGENCY, agencies: perAgencySummary, total_rows_scanned: totalRowsScanned }],
  preprocessing: {
    merge: { pattern: "SYN.merge, mirrored from referents/index.js -- see analysis/lib/merge-duplicates.mjs, enriched not just first-wins", events, raw_count: raw.length, canonical_count: canonical.length },
  },
  population: { filter: "every row across all agencies in source-data/by-agency/ matching /mnpd|metro nashville/i anywhere on the record, deduped", record_count: N, by_agency: Object.fromEntries(byAgencyCanonicalCount) },
  null_model: {
    name: "induceKinds-unsupervised-cross-agency",
    description: "Real emergent discovery across ALL agencies' MNPD-related activity pooled together, with org:* as one candidate field among the rest -- tests whether different agencies' relationships to MNPD are structurally distinct (their own cohesive kind) or indistinguishable, rather than assuming either.",
    requested_by: 'user, 2026-08-14: "we have lots more data now for more NULs, lets discover structure of how MNPD stands out from whats happening there, they have different relationship with different PDs, lets see what we can uncover"',
  },
  organ: { module: "packages/engine/emergence/kinds.js", functions: ["induceKinds"], reused_unmodified: true },
  parameters: [
    { name: "minPrevalence", value: MIN_PREVALENCE, justification: `MIN_COUNT/N = ${MIN_COUNT}/${N}, this project's standing floor scaled to this population's size.` },
    { name: "minKindSize", value: MIN_COUNT }, { name: "permutations", value: PERMUTATIONS }, { name: "quantile", value: QUANTILE }, { name: "seed", value: SEED }, { name: "reseeds", value: RESEEDS },
  ],
  output: { candidate_field_count: candidateFieldCount, kinds: kinds.map((k) => ({ core: k.core, size: k.members.length, cohesion: k.cohesion, height: k.height, warrant: k.heightGate?.warrant ?? null, members: k.members, agency_breakdown: Object.fromEntries([...new Map(k.members.map((id) => [orgById.get(id), 0])).keys()].map((o) => [o, k.members.filter((id) => orgById.get(id) === o).length])) })) },
  caveats: [
    "MNPD has no ALPR network of its own -- every record here is a search an agency ran through Flock's shared lookup, tagged because its own reason text names MNPD/Metro Nashville, not a search of an MNPD-owned network.",
    "Kansas Highway Patrol, Gary IN PD, Manor TX PD, and Beaumont CA PD each had exactly 1 raw MNPD-mention despite hundreds of thousands of total rows scanned -- essentially no relationship, not included as meaningful per-agency signal, kept in the pool for completeness.",
    "Snapshot of an in-progress backfill -- some agencies' by-agency history may not extend as far back as others yet; rerun once all agencies stabilize.",
  ],
};
writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
