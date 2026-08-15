// eoreader6 · scripts/read-mnpd-network-audit — induceKinds() over the
// consolidated MNPD/Nashville network-audit master dataset (see
// ~/Documents/mnpd-network-audit/README.md).
//
// A prior pass (analysis/mnpd-induced-kinds.json/.log, this same directory)
// already ran induceKinds() once, but only over mnpd.csv's own 962 rows —
// which are ALL match_confidence:"confirmed_tn" by construction (mnpd.csv
// isn't MNPD's own file — MNPD has no ALPR network to publish a log of; it's
// every row, across many agencies' own published Flock audit logs, whose
// reason text names MNPD, so there is nothing ambiguous about the match).
// That run could only ever rediscover "which
// org searched" / "which keyword" structure — it had no way to speak to the
// actual open question: of the 259 records admitted only because their
// reason text said a bare "Nashville" (nashville.csv sweep; Nashville GA,
// IL, NC, AR, IN, MI, KS all have their own PD too), is there any recoverable
// statistical structure that separates them from the confirmed set, or do
// they look, distributionally, like a random draw from the whole?
//
// This run adds three fields the prior one never had: `confidence:*` (this
// project's own confirmed_tn / ambiguous_state_unspecified verdict, from
// analysis/mnpd-master.json's provenance), `bucket:*` (the reason-category
// rule table, analysis/mnpd.reason-kinds.method.json), and `source:*` (which
// raw file the row came from — not collinear with confidence, since
// nashville.csv contributes both 52 confirmed AND all 259 ambiguous rows).
// If `confidence:ambiguous_state_unspecified` is cohesive enough with
// anything to clear induceKinds' own two Born gates (permutation-null
// existence + constraint, family-wise corrected — see kinds.js), that IS
// real signal. If it never gets admitted into any kind, that is also a real,
// honest result: no text-recoverable signal beyond the state-mention rule
// already applied, and resolving those 259 needs something other than more
// text mining (e.g. cross-checking org_id against agencies known to
// neighbor TN).
//
// Same organ, same hyperparameters as the prior run (population renamed
// only) — nothing here was tuned by checking what it does to this
// question's own answer; see eoreader6/CLAUDE.md "never tune a parameter by
// checking what it does to a golden's own score." There is no golden here,
// but the same discipline applies: these fields and these opts were fixed
// from the source data's own columns and this project's own already-
// published rule tables, before this script was run, not chosen by trying
// variants and keeping whichever produced a kind.
//
//   node scripts/read-mnpd-network-audit.mjs [--limit N]
//
// --limit N restricts to the first N master records (smoke-test only; the
// real run takes no argument and reads all of them). Measured cost on the
// mnpd.csv-only precursor (962 records, 41 admitted fields): 57 minutes,
// because of how induceKinds' clustering search scales. This run has 1273
// records and more admitted fields (bucket/confidence/source added) —
// expect longer, not shorter.

import { readFileSync, writeFileSync } from "node:fs";
import { induceKinds } from "../packages/engine/emergence/kinds.js";

const MASTER = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master.json";
const OUT_JSON = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master-induced-kinds.json";
const OUT_LOG = "/Users/mlacy/Documents/mnpd-network-audit/analysis/mnpd-master-induced-kinds.log";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : null;

const master = JSON.parse(readFileSync(MASTER, "utf8"));
const rows = LIMIT ? master.records.slice(0, LIMIT) : master.records;

const records = rows.map((row, i) => {
  const attrs = [];
  const push = (field_id) => attrs.push({ field_id, value_type: "boolean", count: 1 });

  const reasonNorm = (row.source_record.reason ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (reasonNorm === "mnpd") push("bare_mnpd");

  const caseNum = (row.source_record.case_number ?? "").trim();
  if (caseNum.length > 0) push("has_case");

  const redaction = row.source_record.redaction_reasons ?? "";
  if (/name/i.test(String(redaction))) push("redacted_name");

  for (const kw of row.derived?.kw ?? []) push(`kw:${kw}`);

  const org = row.source_record.organization_name;
  if (org) push(`org:${org}`);

  if (row.derived?.bucket) push(`bucket:${row.derived.bucket}`);
  if (row.provenance?.match_confidence) push(`confidence:${row.provenance.match_confidence}`);
  if (row.provenance?.source_file) push(`source:${row.provenance.source_file}`);

  return { id: `row:${i}`, attributes: attrs };
});

const opts = {
  population: LIMIT ? `mnpd-network-audit-master-smoketest-${LIMIT}` : "mnpd-network-audit-master-1273",
  minPrevalence: 0.02,
  minKindSize: 8,
  permutations: 50,
  quantile: 0.95,
  seed: 42,
  reseeds: 2,
};

const log = [];
const say = (line) => {
  log.push(line);
  console.log(line);
};

const fieldCounts = new Map();
for (const r of records) for (const a of r.attributes) fieldCounts.set(a.field_id, (fieldCounts.get(a.field_id) ?? 0) + 1);
const candidateFields = [...fieldCounts.entries()].filter(([, n]) => n / records.length >= opts.minPrevalence).map(([f]) => f);

say(`records: ${records.length} opts: ${JSON.stringify(opts)}`);
say(`candidate fields at minPrevalence: ${candidateFields.length}`);
say(`start: ${new Date().toISOString()}`);
const t0 = Date.now();

const kinds = induceKinds(records, opts);

const elapsedMs = Date.now() - t0;
const mm = Math.floor(elapsedMs / 60000);
const ss = String(Math.round((elapsedMs % 60000) / 1000)).padStart(2, "0");
say(`induceKinds total: ${mm}:${ss} (m:ss.mmm)`);
say(`end: ${new Date().toISOString()}`);
say(``);
say(`kinds found: ${kinds.length}`);
say(``);

for (const k of kinds) {
  const existence = k.heightGate?.existence;
  const constraint = k.heightGate?.constraint;
  const pStr = (g) => (g && typeof g.pValue === "number" ? g.pValue : "gap");
  say(`--- ${k.core?.field_id ?? k.label} ---`);
  say(`size: ${k.members.length} cohesion: ${k.cohesion.toFixed(3)} height: ${k.height} warrant: ${k.heightGate?.warrant ?? "n/a"}`);
  say(`existence p: ${pStr(existence)} constraint p: ${pStr(constraint)}`);
  say(`core: ${JSON.stringify(k.core)}`);
  say(`sample members: ${k.members.slice(0, 8).join(", ")}`);
  say(``);
}

// The one comparison this run exists to make explicit: did ANY kind's
// members overlap the ambiguous set enough to be worth a human look, even
// among kinds whose own core field is something else entirely (org/kw/
// bucket)? A kind can clear both Born gates on a core field that is NOT
// confidence and still be worth reporting here if it is disproportionately
// ambiguous — that is a different, weaker claim than "confidence itself
// formed a kind," so it is reported separately, not conflated with it.
const ambiguousIds = new Set(
  rows.map((row, i) => [`row:${i}`, row.provenance?.match_confidence]).filter(([, c]) => c === "ambiguous_state_unspecified").map(([id]) => id),
);
const baseRate = ambiguousIds.size / records.length;
say(`── ambiguous-set overlap, every certified kind (base rate ${(baseRate * 100).toFixed(1)}%) ──`);
say(``);
for (const k of kinds) {
  const hit = k.members.filter((id) => ambiguousIds.has(id)).length;
  const rate = hit / k.members.length;
  const flag = rate > baseRate * 1.5 ? "  <-- elevated" : rate < baseRate * 0.5 ? "  <-- depressed" : "";
  say(`${(k.core?.field_id ?? k.label).padEnd(40)} ambiguous ${hit}/${k.members.length} (${(rate * 100).toFixed(1)}%)${flag}`);
}

writeFileSync(OUT_JSON, JSON.stringify({ opts, candidateFieldCount: candidateFields.length, kinds }, null, 2));
writeFileSync(OUT_LOG, log.join("\n") + "\n");
say(``);
say(`wrote ${OUT_JSON}`);
say(`wrote ${OUT_LOG}`);
