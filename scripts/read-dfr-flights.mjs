// eoreader6 · scripts/read-dfr-flights — read a police DFR (drone-as-first-
// responder) program's public flight feed with the engine's own organs.
//
// The question, per city: what KINDS of flights does this program fly (are
// non-call-indexed kinds — planned operations, officer-initiated, overwatch —
// real kinds or just labels), and which flights belong to one MATTER (one
// real-world situation minting several CAD numbers / several flights).
//
// Organs used, per CLAUDE.md's search-first rule:
//   emergence/kinds.js::induceKinds     — flight-kind induction, its own
//                                         permutation-null gates throughout
//   emergence/binding.js::displacementNull — same-matter co-arrival test over
//                                         the program's own flight-order
//                                         positions (the reading's reach
//                                         units), exactly as bindLinks reads
//                                         co-arrival in a text
//
// What is deliberately NOT an organ call: medians, calendars, endpoint
// clustering — descriptive arithmetic, no significance claimed.
//
// THE FOLD'S OWN LIMIT, DISCLOSED (II.21, and the seam Alexander watches):
// induction runs SIDEWAYS first — once per local calendar week — and only the
// kinds a week certifies are reified and folded upward. This is NOT equivalent
// to inducing over the whole population: a DIFFUSE kind (say two flights a
// week for a year, cohering only in aggregate) is certified by no single week,
// is therefore never reified, and CANNOT appear at any altitude. What the
// ladder finds is "kinds visible within a week, that recur across weeks" —
// never "kinds of the year." The gain is that this runs at all (flat induction
// on 8,823 records did not finish; folded, 11.5 min), and every altitude keeps
// its way back down (members are carried at every level, below). The loss is
// real and is named here rather than left for a reader to discover.
//
// Known defect, declared: displacementNull builds its pool EXCLUDING A's
// occupied positions (binding.js line ~152), the same restricted-pool shape
// shown to inflate reversalNull's false-positive rate 2-3x (null-first
// measurement paper §5, 2026-08-15). Every established pair is therefore
// cross-checked against an unrestricted-pool variant, labeled as the paper's
// corrected pool; a pair is only reported established if BOTH agree.
//
// Declared numbers (never tuned against results):
//   induceKinds opts   — the same declared set scripts/read-kinds-networked.mjs
//                        uses: minPrevalence .25, minKindSize 3,
//                        permutations 200, quantile .95, seed 42, reseeds 24
//   draws 199, seed 42 — binding family convention in this repo
//   E2 window          — MEASURED from the ground-truth-positive class: the
//                        p95 of flight-order gaps among same-citation
//                        (relaunch) pairs in this same feed. Not hand-set.
//   CAD-like citation  — >= 6 digits after splitting on , / ; ("TEST",
//                        "TRNG" purpose-words chain unrelated test flights
//                        into one fake matter otherwise; measured on LAPD:
//                        56,518 spurious shared-citation pairs).
//   launch exclusion   — ZERO tuned constants: each flight excludes only its
//                        OWN endpoint cell of highest global frequency (its
//                        launch/return point — the dock is the cell shared
//                        with the most other flights). A shared destination
//                        can never be swallowed by this rule, because for any
//                        flight visiting both its dock and a popular
//                        destination, the dock's global frequency dominates.
//                        (A first draft excluded all endpoint cells >= 0.5%
//                        share; on a 315-flight feed that made 47 "launch
//                        sites" and risked blinding real repeat
//                        destinations.) Reported launch_sites remain
//                        descriptive only.
//
// Usage: node scripts/read-dfr-flights.mjs <feed.jsonl> <label> <IANA-tz> <outdir>

import { readFileSync, writeFileSync } from "node:fs";
import { induceKinds } from "../packages/engine/emergence/kinds.js";
import { foldHolons, reify } from "../packages/engine/emergence/jati.js";
import { displacementNull, shuffle } from "../packages/engine/emergence/binding.js";

const [feedPath, label, tzName, outdir] = process.argv.slice(2);
if (!feedPath || !label || !tzName || !outdir) {
  console.error("usage: node scripts/read-dfr-flights.mjs <feed.jsonl> <label> <tz> <outdir>");
  process.exit(1);
}

const CELL = 0.0004;   // ~45 m — endpoint/launch grid (matches the feed reducer)
const LOC = 0.0013;    // ~150 m — property-scale destination grid
const DOCK_EXCL_KM = 0.15;
const OPTS = { minPrevalence: 0.25, minKindSize: 3, permutations: 200, quantile: 0.95, seed: 42, reseeds: 24 };
const DRAWS = 199;
const SEED = 42;
const ALPHA = 0.05;

const kmDist = (la1, lo1, la2, lo2) => {
  const R = 6371.0;
  const dl = ((la2 - la1) * Math.PI) / 180;
  const dn = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dl / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// ── load the reduced feed ───────────────────────────────────────────────────
const flights = readFileSync(feedPath, "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((r) => r.takeoff && r.landing)
  .sort((a, b) => a.takeoff - b.takeoff);
console.log(`[${label}] ${flights.length} flights`);

// ── launch sites: endpoint cells >= 0.5% share, merged under 200 m ──────────
const epc = new Map();
let epTotal = 0;
for (const r of flights)
  for (const [lat, lon] of r.endpoints) {
    const k = `${Math.round(lat / CELL)},${Math.round(lon / CELL)}`;
    epc.set(k, (epc.get(k) ?? 0) + 1);
    epTotal++;
  }
const sites = [];
for (const [k, n] of [...epc.entries()].sort((a, b) => b[1] - a[1])) {
  const [ci, cj] = k.split(",").map(Number);
  const lat = ci * CELL, lon = cj * CELL;
  const home = sites.find((s) => kmDist(lat, lon, s.lat, s.lon) < 0.2);
  if (home) home.n += n;
  else sites.push({ lat, lon, n });
}
const launchSites = sites.filter((s) => s.n / epTotal >= 0.02).slice(0, 8)
  .map((s) => ({ lat: s.lat, lon: s.lon, share: +(s.n / epTotal).toFixed(4) }));
console.log(`[${label}] ${launchSites.length} major launch site(s) (descriptive only)`);

// ── per-flight destination: densest cell clear of the flight's OWN home ─────
// (home = its endpoint cell with the highest global endpoint frequency)
const tzHour = new Intl.DateTimeFormat("en-US", { timeZone: tzName, hour: "numeric", hour12: false });
const tzWeekday = new Intl.DateTimeFormat("en-US", { timeZone: tzName, weekday: "short" });
for (const r of flights) {
  let home = null, homeFreq = -1;
  for (const [lat, lon] of r.endpoints) {
    const f = epc.get(`${Math.round(lat / CELL)},${Math.round(lon / CELL)}`) ?? 0;
    if (f > homeFreq) { home = [lat, lon]; homeFreq = f; }
  }
  let best = null, bestN = 0;
  for (const [ci, cj, n] of r.cells) {
    const lat = ci * CELL, lon = cj * CELL;
    if (home && kmDist(lat, lon, home[0], home[1]) <= DOCK_EXCL_KM) continue;
    if (n > bestN) { best = [lat, lon]; bestN = n; }
  }
  r._dest = best;
  r._home = home;
  r._distKm = best && home ? kmDist(best[0], best[1], home[0], home[1]) : null;
  const d = new Date(r.takeoff);
  r._hour = Number(tzHour.format(d));
  r._weekday = tzWeekday.format(d);
  r._durMin = (r.landing - r.takeoff) / 60000;
}

// ── citations: CAD-like tokens only (declared: >= 6 digits) ─────────────────
// Identity is EXACT STRING after trim/split. Two spellings of one case number
// ("24-123456" vs "2024-123456") therefore read as two citations and SPLIT a
// matter that is really one. That error runs in the conservative direction —
// it never merges two real matters into one — and normalizing spellings would
// be deriving who-denotes-what from surface shape, which is the giver test's
// (II.2) refusal. Disclosed, not silently normalized.
const citationsOf = (r) => {
  const raw = (r.external_id ?? "").trim();
  if (!raw) return [];
  return raw.split(/[,/;]/).map((s) => s.trim())
    .filter((s) => (s.match(/[0-9]/g) ?? []).length >= 6);
};

// ═══ A. FLIGHT-KIND INDUCTION — holonic, the fold used correctly ═══════════
// Induction cost is quadratic in a level's population, so the fold goes
// SIDEWAYS first: partition into the program's own natural sub-wholes —
// calendar weeks, the granularity the schedule analysis shows programs
// actually operate at — induce within each week (small, cheap, parallelable),
// reify each week's certified kinds into holon records, then fold the union
// UPWARD with foldHolons. Full populations run whole; no subsample needed.
const kindFlights = flights;
// NO identity-grained fields in the kind vocabulary. A 150 m dest cell is an
// IDENTITY (nearly one value per record), not a TYPE: it can never clear
// minPrevalence, but the engine still pays to measure and refuse hundreds of
// junk parameters against 200 permutations each — a first draft fed dest_cell
// in and turned a 1-minute induction into an unbounded one. Place recurrence
// is the arrival-stream arm's question (below), never the kind vocabulary's.
const records = kindFlights.map((r) => Object.freeze({
  id: r.flight_id,
  attributes: Object.freeze([
    Object.freeze({ field_id: "purpose", value_type: "categorical", value: (r.flight_purpose ?? "unlogged").trim().toLowerCase(), count: 1 }),
    Object.freeze({ field_id: "weekday", value_type: "categorical", value: r._weekday, count: 1 }),
    Object.freeze({ field_id: "cited", value_type: "categorical", value: citationsOf(r).length ? "cad" : ((r.external_id ?? "").trim() ? "non-cad" : "none"), count: 1 }),
    Object.freeze({ field_id: "hour", value_type: "numeric", value: r._hour, count: 1 }),
    Object.freeze({ field_id: "duration_min", value_type: "numeric", value: +r._durMin.toFixed(1), count: 1 }),
    ...(r._distKm != null ? [Object.freeze({ field_id: "dist_km", value_type: "numeric", value: +r._distKm.toFixed(2), count: 1 })] : []),
  ]),
}));
// sideways: one induction per local calendar week
const weekOf = (r) => {
  const d = new Date(r.takeoff);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tzName, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const dt = new Date(day + "T00:00:00Z");
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
};
const byWeek = new Map();
kindFlights.forEach((r, i) => {
  const w = weekOf(r);
  if (!byWeek.has(w)) byWeek.set(w, []);
  byWeek.get(w).push(records[i]);
});
console.log(`[${label}] folding: ${records.length} records across ${byWeek.size} week(s)…`);
const t0 = Date.now();
const weekLadder = [];
let unfolded = 0;
const reifiedUnion = [];
for (const [wk, recs] of [...byWeek.entries()].sort()) {
  if (recs.length < OPTS.minKindSize) { unfolded += recs.length; continue; }
  const wkKinds = induceKinds(recs, { population: `${label}-wk-${wk}`, ...OPTS });
  weekLadder.push({ week: wk, n: recs.length, kinds: wkKinds });
  reifiedUnion.push(...reify(wkKinds, recs));
}
console.log(`[${label}] week level: ${weekLadder.reduce((s, w) => s + w.kinds.length, 0)} kind(s) across ${weekLadder.length} week(s), ${unfolded} record(s) in weeks below minKindSize (reported, not dropped) — ${((Date.now() - t0) / 60000).toFixed(1)} min`);

// upward: the ladder over the reified week-kinds
const fold = reifiedUnion.length >= OPTS.minKindSize
  ? foldHolons(reifiedUnion, { population: `${label}-dfr-weekkinds`, levels: 2, ...OPTS })
  : { ladder: [], halted: { at: 0, reason: `only ${reifiedUnion.length} reified week-kind(s) — below minKindSize` } };
const kinds = fold.ladder.length ? fold.ladder[0].kinds : [];
console.log(`[${label}] fold up: ${fold.ladder.map((l) => `L${l.level + 1}:${l.kinds.length} kinds/${l.records.length} recs`).join("  ")}${fold.halted ? `  (halted: ${fold.halted.reason})` : ""} — total ${((Date.now() - t0) / 60000).toFixed(1)} min`);

// ═══ B. MATTERS — E1 shared CAD citation; E2 displacementNull co-arrival ════
// Positions are the program's own flight order (the reading's reach units).
const byCitation = new Map();
flights.forEach((r, pos) => {
  for (const c of citationsOf(r)) {
    if (!byCitation.has(c)) byCitation.set(c, []);
    byCitation.get(c).push(pos);
  }
});

// E2 window: p95 of same-citation (relaunch) position gaps — measured from
// the feed's own ground-truth-positive class.
const e1Gaps = [];
for (const posns of byCitation.values())
  for (let i = 1; i < posns.length; i++) e1Gaps.push(posns[i] - posns[i - 1]);
e1Gaps.sort((a, b) => a - b);
const WINDOW = e1Gaps.length >= 20 ? Math.max(1, e1Gaps[Math.floor(e1Gaps.length * 0.95)]) : null;
console.log(`[${label}] E1 relaunch pairs: ${e1Gaps.length}; E2 window (p95 of E1 gaps): ${WINDOW ?? "REFUSED — too few relaunches to measure a window"}`);

// Unrestricted-pool cross-check (the paper's corrected pool): identical to
// displacementNull except B may land on A's occupied positions, as the real
// data can.
//
// The shared seed is DELIBERATE and is the II.10 discipline, not a defect: the
// two runs are a matched counterfactual differing in exactly one axis (the
// pool restriction), so they must share draws, window, and arrival streams.
// Do not "fix" this by re-seeding — that would add a second axis and the
// comparison would stop measuring the pool. It is also why the pair is a
// BIAS CHECK and not independent corroboration (Pearl's distinction): both
// read the same two arrival streams and share every cause but the one.
const displacementNullUnrestricted = (aArr, bArr, { window, draws, seed }) => {
  const countOverlap = (xs, ys, w) => {
    let c = 0, j = 0;
    for (const x of xs) {
      while (j < ys.length && ys[j] < x - w) j++;
      for (let k = j; k < ys.length && ys[k] <= x + w; k++) c++;
    }
    return c;
  };
  const observed = countOverlap(aArr, bArr, window);
  const all = [...new Set([...aArr, ...bArr])].sort((a, b) => a - b);
  const lo = all[0], hi = all[all.length - 1];
  const pool = [];
  for (let p = lo; p <= hi; p++) pool.push(p);
  let state = seed | 0;
  const rnd = () => { state = (state * 1664525 + 1013904223) | 0; return (state >>> 0) / 4294967296; };
  let atOrAbove = 0;
  for (let d = 0; d < draws; d++) {
    const s = pool.slice();
    shuffle(s, rnd);
    const placed = s.slice(0, bArr.length).sort((a, b) => a - b);
    if (countOverlap(aArr, placed, window) >= observed) atOrAbove++;
  }
  return { observed, pValue: atOrAbove / draws };
};

let matters = null;
if (WINDOW != null) {
  // Candidate pairs: distinct citations with flights co-arriving within the
  // window AND destinations in the same/adjacent 150 m cell (declared gate).
  const cellOf = (r) => r._dest ? [Math.round(r._dest[0] / LOC), Math.round(r._dest[1] / LOC)] : null;
  const near = (a, b) => a && b && Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
  const cits = [...byCitation.entries()];
  const candidates = [];
  for (let i = 0; i < cits.length; i++) {
    for (let j = i + 1; j < cits.length; j++) {
      const [ca, pa] = cits[i], [cb, pb] = cits[j];
      let coArrive = false;
      for (const x of pa) { if (pb.some((y) => Math.abs(x - y) <= WINDOW)) { coArrive = true; break; } }
      if (!coArrive) continue;
      let spatial = false;
      for (const x of pa) {
        for (const y of pb) {
          if (Math.abs(x - y) <= WINDOW && near(cellOf(flights[x]), cellOf(flights[y]))) { spatial = true; break; }
        }
        if (spatial) break;
      }
      if (spatial) candidates.push([ca, cb, pa, pb]);
    }
  }
  console.log(`[${label}] E2 candidate citation pairs (co-arriving + co-located): ${candidates.length}`);

  const results = [];
  for (const [ca, cb, pa, pb] of candidates) {
    const shipped = displacementNull(pa, pb, { window: WINDOW, draws: DRAWS, seed: SEED });
    const corrected = displacementNullUnrestricted(pa, pb, { window: WINDOW, draws: DRAWS, seed: SEED });
    const expected = shipped.pValue * candidates.length;
    results.push({
      citations: [ca, cb],
      flights: [pa.length, pb.length],
      shipped_p: shipped.pValue, corrected_p: corrected.pValue,
      expected_null_count: +expected.toFixed(4),
      verdict: expected < ALPHA && corrected.pValue <= shipped.pValue * 3 && corrected.pValue * candidates.length < ALPHA
        ? "matter_established"
        : expected < 1 ? "matter_ambiguous" : "independent",
    });
  }
  results.sort((a, b) => a.expected_null_count - b.expected_null_count);

  // Union-find: E1 always; E2 established only.
  const parent = new Map(flights.map((r) => [r.flight_id, r.flight_id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const posns of byCitation.values())
    for (let i = 1; i < posns.length; i++) union(flights[posns[0]].flight_id, flights[posns[i]].flight_id);
  for (const r of results.filter((x) => x.verdict === "matter_established")) {
    const [ca, cb] = r.citations;
    union(flights[byCitation.get(ca)[0]].flight_id, flights[byCitation.get(cb)[0]].flight_id);
  }
  const roots = new Map();
  for (const r of flights) { const k = find(r.flight_id); roots.set(k, (roots.get(k) ?? 0) + 1); }
  const sizeDist = {};
  for (const n of roots.values()) sizeDist[n] = (sizeDist[n] ?? 0) + 1;
  matters = {
    window: WINDOW, draws: DRAWS,
    n_candidate_pairs: candidates.length,
    established: results.filter((x) => x.verdict === "matter_established"),
    ambiguous: results.filter((x) => x.verdict === "matter_ambiguous").length,
    n_flights: flights.length, n_matters: roots.size,
    matter_size_distribution: sizeDist,
  };
  console.log(`[${label}] matters: ${flights.length} flights -> ${roots.size} | established cross-citation: ${matters.established.length} | ambiguous: ${matters.ambiguous}`);
} else {
  matters = { refused: "too few same-citation relaunch pairs to measure an E2 window from the data" };
}

// ═══ output ═════════════════════════════════════════════════════════════════
const out = {
  label, tz: tzName, n_flights: flights.length,
  launch_sites: launchSites,
  declared: { ...OPTS, draws: DRAWS, alpha: ALPHA, loc_cell_deg: LOC, dock_excl_km: DOCK_EXCL_KM,
              sideways_fold: "per-local-calendar-week" },
  // II.21: every altitude keeps the way back down to the material it folded.
  // Week-kind members ARE flight_ids; upper-level members are week-kind ids,
  // which resolve against week_level below — so an L1 kind drills to its
  // week-kinds and thence to flights. Dropping `members` here (an earlier
  // draft did) would leave a figure with no ground: a fold that cannot be
  // drilled back down has not folded.
  fold: {
    week_level: weekLadder.map((w) => ({
      week: w.week, n_records: w.n,
      kinds: w.kinds.map((k) => ({
        id: k.id, label: k.label ?? null,
        size: k.members?.length ?? null,
        members: k.members ?? [],
      })),
    })),
    records_in_unfoldable_weeks: unfolded,
    halted: fold.halted,
    upper_ladder: fold.ladder.map((l) => ({
      level: l.level + 1, population: l.population, n_records: l.records.length,
      kinds: l.kinds.map((k) => ({
        id: k.id, label: k.label ?? null,
        size: k.members?.length ?? null,
        members: k.members ?? [],
        core: k.core ?? null,
      })),
    })),
  },
  matters,
};
writeFileSync(`${outdir}/eoread-${label}.json`, JSON.stringify(out, null, 1));
// Full level-0 kind objects, separately — schema varies by engine version.
writeFileSync(`${outdir}/eoread-${label}-kinds-full.json`, JSON.stringify(kinds, null, 1));
console.log(`[${label}] wrote ${outdir}/eoread-${label}.json`);
