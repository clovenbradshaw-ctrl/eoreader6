// eoreader6 · tolerance-is-it-a-resolution — the one candidate the census found,
// put to spec 13's own test.
//
// WHERE THIS CANDIDATE CAME FROM. Not from reading. `scripts/resolution-census.mjs`
// walks 107 engine-tier source files, extracts every number the code itself
// declares never-defaulted (122 guard sites, 53 distinct numbers), and splits
// them on the code's own words — is the gloss a *resolution* or a threshold.
// Exactly one number is glossed as a resolution, is not one of SEED.md's three,
// and is a word SEED.md has never once contained:
//
//   tolerance   "the resolution of refusal is never a default"
//               packages/engine/loops/atmosphere.js · packages/engine/loops/turn.js
//
// `SEED.md` states "**No fourth declared number.** Three declared numbers
// still." twice, in two separate amendments. `runTurn` — the organ that fires
// all nine operators — requires a fourth, and its own TypeError calls it a
// resolution.
//
// THE QUESTION. Is `tolerance` a fourth resolution, or a policy threshold
// wearing the word? Spec 13 §1 says a resolution sets the finest distinction
// expressible; the three each report a censoring bound (`1/draws`, `1/reseeds`,
// and `window`'s own reach). A policy threshold sets where a line is drawn.
// The two are told apart by what escalating them does, and the difference is
// not subtle:
//
//   A RESOLUTION CONVERGES. Buying more of it makes the answer more nearly the
//   material's own — false verdicts fall while true ones survive, because you
//   are seeing more finely, not deciding more strictly.
//
//   A THRESHOLD TRADES. Buying more of it moves along a curve — false verdicts
//   and true ones fall together, because nothing about the seeing changed.
//
// So: plant a real regime change in one material and none in another, sweep
// each number, and read false-alarm rate against detection rate. This is an
// ROC separation and it is the standard device for exactly this distinction.
//
// PRE-REGISTERED, WRITTEN AND COMMITTED BEFORE THE SCRIPT WAS RUN:
//
//   T1  `tolerance` TRADES: as it rises, the false-alarm rate and the detection
//       rate fall together. Operationally, detection falls by at least half the
//       proportion the false-alarm rate does.
//   T2  `draws` — the Figure-grain resolution, on the same tracker, over the
//       same two materials — does NOT trade in that sense: its detection rate
//       holds up proportionally better than `tolerance`'s across a comparable
//       fall in false alarms.
//   T3  (the decision) If T1 and T2 both hold, `tolerance` is a threshold
//       wearing "resolution", `SEED.md`'s invariant survives, and the wrong
//       thing is `atmosphere.js`/`turn.js`'s own error message. If T1 fails —
//       if tolerance's detection holds up while its false alarms fall — it is a
//       fourth resolution and SEED.md's twice-stated invariant is false.
//
// Both outcomes are findings and neither is preferred here. What is NOT
// available is the third possibility this script exists to prevent: leaving a
// number glossed as a resolution, required by the engine's central loop, never
// tested against the invariant that says it cannot exist.
//
// WHAT IS DECLARED AND WHY (nothing here is chosen by what it does to a score):
// - The base spec is `two-clearings.mjs`'s, already this repo's declared
//   operating point for the regime tracker and reused verbatim by
//   `scripts/terrain-census.mjs`. Not picked here.
// - Detection = a re-zero within `2 * window` pushes after the planted
//   boundary. Declared, and stated in advance; a re-zero anywhere else on the
//   planted series is counted as a false alarm exactly as on the null series.
// - Extent and realisation count are set by what runs in about a minute. That
//   is a runtime choice, not a score choice, and it costs power (stated with
//   the result), not validity.

// ── THE FIRST MATERIAL COULD NOT ASK THE QUESTION ──────────────────────────
// First run, recorded rather than repaired: IID uniform noise produced ZERO
// re-zeros at every setting of every knob, and a +0.6 planted shift was
// detected 100% of the time at every setting. Both axes were pinned, so every
// verdict came back unanswerable — correctly, as a gap rather than a zero.
//
// The reason is in the organ's own header: against `burstiness` only surfeit
// clears, because the observation is one window's mean and the samples are a
// max over many, so an ordinary window sits BELOW the ground (measured there
// at 79-87% of steps). Uniform IID noise essentially never exceeds its own
// ground from above, so the false-alarm axis is dead by construction.
//
// Fixed in the MATERIAL, not in the predictions. Two changes, both properties
// of what is read rather than of how it is read:
//
//   - a second null law with a heavy tail (exponential), still IID and so
//     still regime-free — every re-zero on it is still false — but able to
//     produce the surfeit that uniform noise cannot.
//   - the planted shift is SWEPT rather than picked. A single shift size
//     chosen after seeing detection rates would be calibrating the material
//     against the answer; the whole curve is reported instead.
import { createRegimeTracker, PLACEMENT } from "../packages/engine/loops/atmosphere.js";

// ── declared, never defaulted — two-clearings.mjs's SPEC ───────────────────
const BASE = { window: 12, draws: 200, tolerance: 3, reseeds: 5, seed: 17, statistic: "burstiness", findOn: [] };
const EXTENT = 320;
const REALISATIONS = 8;
const SHIFT_AT = 0.5; // the planted boundary, mid-series
const SHIFTS = [0.1, 0.2, 0.4, 0.8]; // swept, never picked
const LAWS = ["uniform", "exponential"]; // both IID, so both regime-free
const DETECT_WITHIN = (window) => 2 * window;

const SWEEPS = {
  tolerance: [1, 2, 3, 5, 8],
  draws: [50, 100, 200, 400, 800],
  window: [6, 12, 24],
};

const rngLocal = (seed) => {
  let a = (seed | 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Both laws are IID: no regime exists in either, so every re-zero on a null
// series is false regardless of law. Exponential is the heavy tail that can
// produce the surfeit uniform cannot.
const draw = (r, law) => (law === "exponential" ? -Math.log(Math.max(1e-12, r())) : r());

const nullSeries = (seed, law) => {
  const r = rngLocal(seed);
  return Array.from({ length: EXTENT }, () => draw(r, law));
};

const plantedSeries = (seed, law, shift) => {
  const r = rngLocal(seed);
  const at = Math.floor(EXTENT * SHIFT_AT);
  return Array.from({ length: EXTENT }, (_, i) => draw(r, law) + (i >= at ? shift : 0));
};

/** Every index at which this tracker conceded its ground. */
const rezeroIndices = (series, spec) => {
  const tracker = createRegimeTracker(spec);
  const out = [];
  series.forEach((x, i) => {
    if (tracker.push(x).rezeroed) out.push(i);
  });
  return out;
};

// ── THE TYPE TEST, which is the one that should have been asked first ──────
// SEED.md #7: "refusal has two tiers: type error before null. Never spend a
// measurement on what the algebra catches." The ROC sweep above spends a
// measurement. This does not, and it is decisive where the ROC sweep is only
// underpowered.
//
// A resolution bounds what can be SEEN. Each of the three enters the
// computation of a difference: `window` sizes the sample the statistic is
// taken over, `draws` sizes the ground and therefore the rank and the
// censoring bound, `reseeds` sizes the null a pattern is placed against.
// Change any of them and `difference()` returns something else.
//
// `tolerance` enters no difference anywhere. In `createRegimeTracker` it
// appears in exactly two places — `clearings >= tolerance` and `run >=
// tolerance` — both of them comparisons against a COUNT of differences
// already computed. In `readAtmosphere` and `runTurn` it appears in the same
// one shape. It cannot change what is perceived; it can only change how much
// accumulated perception is required before the ground is conceded.
//
// So the criterion, stated generally enough to point at the other 52 numbers
// the census found:
//
//   A number is a RESOLUTION iff it enters the computation of a difference.
//   A number that only gates an action on differences already computed is a
//   POLICY, whatever its gloss says.
//
// That is a dataflow question, decidable by reading, and it is what the stance
// face promises: an address refused by type before a measurement is spent.
//
// Measured here anyway — not to decide it, but because a claim about dataflow
// that is never checked against running behaviour is how this repo's own
// docstrings acquired the numbers spec 13 had to go and replicate. STRAINED is
// the placement that IS a clearing, and it is orders of magnitude denser than
// a re-zero, so this is well-powered where the ROC sweep above is not.
const strainRate = (series, spec) => {
  const tracker = createRegimeTracker(spec);
  let strained = 0;
  let placed = 0;
  for (const x of series) {
    const r = tracker.push(x);
    if (r.placement === PLACEMENT.STRAINED) strained++;
    if (r.placement === PLACEMENT.STRAINED || r.placement === PLACEMENT.PLACED || r.placement === PLACEMENT.OTHER) placed++;
  }
  return { strained, placed };
};

const runSetting = (spec, law, shift) => {
  const at = Math.floor(EXTENT * SHIFT_AT);
  const within = DETECT_WITHIN(spec.window);
  let falseAlarms = 0;
  let pushes = 0;
  let detected = 0;
  for (let i = 0; i < REALISATIONS; i++) {
    falseAlarms += rezeroIndices(nullSeries(20260815 + i * 7919, law), spec).length;
    pushes += EXTENT;
    const hits = rezeroIndices(plantedSeries(20260815 + i * 7919, law, shift), spec);
    if (hits.some((h) => h >= at && h <= at + within)) detected++;
  }
  return { falsePer1000: (falseAlarms / pushes) * 1000, detection: detected / REALISATIONS };
};

console.log("── tolerance-is-it-a-resolution ────────────────────────────────────");
console.log(`base spec (two-clearings.mjs): ${JSON.stringify(BASE)}`);
console.log(`extent ${EXTENT} · ${REALISATIONS} realisations per cell · laws ${LAWS.join("/")} · shifts ${SHIFTS.join("/")} at ${SHIFT_AT * EXTENT}`);
console.log("PRE-REGISTERED: T1 tolerance TRADES (detection falls with false alarms)");
console.log("                T2 draws does not trade in that sense");
console.log("                T3 T1 & T2 → tolerance is a threshold, SEED's invariant survives");
console.log("First material could not ask the question (0 false alarms, 100% detection everywhere);");
console.log("fixed in the material — a heavy-tailed IID law added, planted shift swept not picked.\n");

// False alarms depend only on (law, spec): a null series carries no shift.
const fpCache = new Map();
const falseAlarmsFor = (law, spec, key) => {
  const k = `${law}|${key}`;
  if (!fpCache.has(k)) {
    let n = 0;
    for (let i = 0; i < REALISATIONS; i++) n += rezeroIndices(nullSeries(20260815 + i * 7919, law), spec).length;
    fpCache.set(k, (n / (REALISATIONS * EXTENT)) * 1000);
  }
  return fpCache.get(k);
};

const detectionFor = (law, shift, spec) => {
  const at = Math.floor(EXTENT * SHIFT_AT);
  const within = DETECT_WITHIN(spec.window);
  let detected = 0;
  for (let i = 0; i < REALISATIONS; i++) {
    const hits = rezeroIndices(plantedSeries(20260815 + i * 7919, law, shift), spec);
    if (hits.some((h) => h >= at && h <= at + within)) detected++;
  }
  return detected / REALISATIONS;
};

// "Trades" = across the swept range, detection falls by at least half the
// proportion the false-alarm rate falls by. A resolution buys the fall in
// false alarms without paying for it in detection. Unanswerable when either
// axis is pinned — a gap, never a zero, and never a REFUSED.
const tradeRatio = (row) => {
  const first = row[0];
  const last = row[row.length - 1];
  if (!(first.fp > 0)) return { why: "no false alarms at the low end" };
  if (!(first.detection > 0)) return { why: "nothing detected at the low end" };
  const faDrop = (first.fp - last.fp) / first.fp;
  if (!(faDrop > 0)) return { why: "false alarms did not fall across the sweep" };
  const detDrop = (first.detection - last.detection) / first.detection;
  return { faDrop, detDrop, ratio: detDrop / faDrop };
};

const answerable = [];
for (const law of LAWS) {
  for (const shift of SHIFTS) {
    console.log(`══ law=${law}  planted shift=+${shift} ══`);
    const perKnob = {};
    for (const [knob, values] of Object.entries(SWEEPS)) {
      const row = values.map((v) => {
        const spec = { ...BASE, [knob]: v };
        return { v, fp: falseAlarmsFor(law, spec, `${knob}=${v}`), detection: detectionFor(law, shift, spec) };
      });
      perKnob[knob] = row;
      const cells = row
        .map((c) => `${knob}=${c.v}: fp ${c.fp.toFixed(2)} det ${(c.detection * 100).toFixed(0)}%`)
        .join("  |  ");
      const t = tradeRatio(row);
      const verdict = t.why ? `unanswerable (${t.why})` : `paid/bought ${t.ratio.toFixed(2)} → ${t.ratio >= 0.5 ? "TRADES" : "does not trade"}`;
      console.log(`  ${knob.padEnd(10)} ${cells}`);
      console.log(`  ${" ".repeat(10)} ${verdict}`);
      if (!t.why) answerable.push({ law, shift, knob, ...t });
    }
    console.log();
  }
}

// ── the pre-registered readings ────────────────────────────────────────────
console.log("── verdicts ────────────────────────────────────────────────────────");
if (answerable.length === 0) {
  console.log("Every cell unanswerable: this material still cannot ask the question. A gap, not a zero.");
} else {
  for (const knob of Object.keys(SWEEPS)) {
    const rows = answerable.filter((a) => a.knob === knob);
    if (rows.length === 0) {
      console.log(`${knob.padEnd(10)} no answerable cell`);
      continue;
    }
    const mean = rows.reduce((s, r) => s + r.ratio, 0) / rows.length;
    console.log(
      `${knob.padEnd(10)} answerable in ${rows.length} cell(s) · mean paid/bought ${mean.toFixed(2)} · ` +
        `${rows.filter((r) => r.ratio >= 0.5).length}/${rows.length} TRADE`,
    );
  }
  const tolRows = answerable.filter((a) => a.knob === "tolerance");
  const drawRows = answerable.filter((a) => a.knob === "draws");
  const meanOf = (rs) => (rs.length ? rs.reduce((s, r) => s + r.ratio, 0) / rs.length : null);
  const tol = meanOf(tolRows);
  const dr = meanOf(drawRows);
  console.log(`\nT1 tolerance TRADES: ${tol === null ? "unanswerable" : tol >= 0.5 ? "HELD" : "REFUSED"}`);
  console.log(
    `T2 draws does not trade as tolerance does: ${tol === null || dr === null ? "unanswerable" : dr < tol ? "HELD" : "REFUSED"}`,
  );
  console.log(
    `T3 tolerance is a threshold wearing "resolution", SEED's invariant survives: ${
      tol !== null && dr !== null && tol >= 0.5 && dr < tol ? "HELD" : "NOT ESTABLISHED — read the cells above"
    }`,
  );
}

// ── the type test, measured ────────────────────────────────────────────────
console.log("\n── the type test: does the knob change what is SEEN, or only what is DONE? ──");
console.log("STRAINED is the placement that IS a clearing — the evidence tolerance counts.");
console.log("PRE-REGISTERED: V1 draws and window move the strain rate (they enter the difference).");
console.log("                V2 tolerance does not move it AT ALL (it enters no difference).\n");

const strainFor = (spec, law) => {
  let strained = 0;
  let placed = 0;
  for (let i = 0; i < REALISATIONS; i++) {
    const r = strainRate(nullSeries(20260815 + i * 7919, law), spec);
    strained += r.strained;
    placed += r.placed;
  }
  return placed ? strained / placed : null;
};

const strainTable = {};
for (const law of LAWS) {
  console.log(`  law=${law}`);
  strainTable[law] = {};
  for (const [knob, values] of Object.entries(SWEEPS)) {
    const rates = values.map((v) => ({ v, rate: strainFor({ ...BASE, [knob]: v }, law) }));
    strainTable[law][knob] = rates;
    const spread = Math.max(...rates.map((r) => r.rate)) - Math.min(...rates.map((r) => r.rate));
    console.log(
      `    ${knob.padEnd(10)} ${rates.map((r) => `${r.v}: ${(r.rate * 100).toFixed(2)}%`).join("  ")}   spread ${(spread * 100).toFixed(3)}pp`,
    );
  }
}

console.log("\n── verdicts · the type test ──");
for (const law of LAWS) {
  for (const knob of Object.keys(SWEEPS)) {
    const rates = strainTable[law][knob].map((r) => r.rate);
    const spread = Math.max(...rates) - Math.min(...rates);
    const moves = spread > 0;
    const expected = knob === "tolerance" ? false : true;
    console.log(
      `  ${law.padEnd(12)} ${knob.padEnd(10)} strain-rate spread ${(spread * 100).toFixed(4)}pp → ${moves ? "MOVES the seeing" : "does not touch the seeing"}` +
        `  ${moves === expected ? "(as predicted)" : "(AGAINST prediction)"}`,
    );
  }
}
