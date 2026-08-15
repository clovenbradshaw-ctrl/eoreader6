// eoreader6 · resolution-knob-cross — does the grain of a question decide
// which declared number governs its answer?
//
// THE CLAIM UNDER TEST (spec 13, "The stance face is the resolution face").
// SEED.md's three declared numbers are one per grain, not three knobs on one
// dial:
//
//   Ground   `window`    the reach of the present
//   Figure   `draws`     the resolution of testimony — difference() reports
//                        censoredAt = 1/draws
//   Pattern  `reseeds`   the resolution of pattern — pattern() reports
//                        censoredAt = 1/reseeds
//
// If that assignment is real and not a naming coincidence, it makes a
// directional prediction that can be wrong: turning the knob of the grain a
// question is ASKED AT should improve the answer, and turning the knob of any
// other grain should not — no matter how far it is turned.
//
// THE QUESTION USED. `level()` asks a Pattern-grain question (is one ground
// above, below, or peer to another — the growth rule's own admission test).
// Its threshold has two possible sources, one per grain:
//
//   floor      = 2/draws     the FIGURE knob — the finest rank difference two
//                            grounds can express at all
//   reseedNull = max |rank displacement| over `reseeds` reseeds of own's
//                            ground — the PATTERN knob
//
// `level()` uses max(floor, reseedNull), and when no reseeding null is
// supplied the floor stands alone. Its own docstring already records what
// that costs on material with no scale structure — false laddering RISING
// with draws, 3.08→4.42 of 5 across draws 60→600 — and names it: "THE
// THRESHOLD IS A RESOLUTION FLOOR, NOT A NULL, AND FOR A LONG TIME IT WAS
// ASKED TO BE BOTH." That measurement is recorded as prose in the docstring;
// the script that produced it is not in this repository, and no run in this
// repo sweeps BOTH knobs against each other. That cross is the only thing
// new here — no new statistic, no new perturbation, no new mechanism.
//
// PRE-REGISTERED, WRITTEN AND COMMITTED BEFORE THE NUMBERS WERE READ
// (13-the-resolution-face.md §5, and scripts/RESULTS.md):
//
//   P1  floor only: the false-ladder rate does not FALL as draws rises.
//       (Replication of the docstring's own recorded direction.)
//   P2  with the reseeding null supplied: at fixed draws, the false-ladder
//       rate falls as reseeds rises.
//   P3  THE DISCRIMINATING ONE: with the reseeding null supplied, the false-
//       ladder rate is approximately FLAT in draws — operationally, its
//       spread across the four draws settings is smaller at every reseeds > 0
//       than it is at reseeds = none. The Figure knob stops governing a
//       Pattern verdict once the Pattern knob is doing the work.
//
// P3 is the one that can refuse the claim. If `draws` still governs strongly
// when the reseeding null is supplied, then `draws` is not specifically the
// Figure-grain resolution and spec 13's assignment is wrong.
//
// WHAT THIS IS NOT. No parameter here is chosen by what it does to a score.
// The draws settings are level()'s own docstring's (60/120/300/600), taken
// because that is the row the replication is against; the reseeds settings
// span the range pattern()'s own false-positive table already measured
// (2→96); the response surface IS the finding, not an argument for an
// operating point. Nothing in this script proposes a value for anything.
//
// MATERIAL. White noise coarsened by successive block-averaging — level()'s
// own control, which its docstring describes as "white noise coarsened to six
// scales ... material with no scale structure whatsoever, where every
// relation should be `peer`." That premise is checked here rather than
// trusted: the direction balance (above vs below) is reported in every cell,
// and a systematic direction would mean coarsening induces a real level and
// would refuse this design.
//
// Deterministic, local RNG — not nul's, so a bug in the control's own
// generator cannot masquerade as agreement with the engine's. Same reason
// scripts/turbulence-candidate-license.mjs keeps its own.

import { ground, level, isGap, STATISTICS } from "../nul/index.js";

// ── declared, never defaulted ──────────────────────────────────────────────
const SPEC = {
  statistic: "burstiness",
  perturbation: "shuffle", // LICENSED: burstiness/shuffle
  window: 5, // the same sub-Taylor window scripts/turbulence-*.mjs declare
  base: 256, // finest scale's length
  scales: 4, // 256, 128, 64, 32 → 3 adjacent pairs
  realisations: 16,
  seed0: 20260815,
};
const DRAWS_STEPS = [60, 120, 300, 600]; // level()'s own docstring table
const RESEEDS_STEPS = [null, 6, 12, 24, 48]; // null = floor only

const rngLocal = (seed) => {
  let a = (seed | 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const noise = (n, seed) => {
  const r = rngLocal(seed);
  return Array.from({ length: n }, () => r());
};

/** One scale coarser: block-average by two. Not a perturbation — material. */
const coarsen = (xs) => {
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push((xs[i] + xs[i + 1]) / 2);
  return out;
};

/** The scale ladder for one realisation: finest first. */
const ladder = (seed) => {
  const out = [noise(SPEC.base, seed)];
  for (let s = 1; s < SPEC.scales; s++) out.push(coarsen(out[out.length - 1]));
  return out;
};

const ladders = Array.from({ length: SPEC.realisations }, (_, i) => ladder(SPEC.seed0 + i * 7919));

// Every adjacent pair, own = the finer scale, target = the next coarser one.
const pairs = [];
for (const scales of ladders)
  for (let s = 0; s + 1 < scales.length; s++) pairs.push({ own: scales[s], target: scales[s + 1] });

const stat = STATISTICS[SPEC.statistic];

const runCell = (draws, reseeds) => {
  const counts = { peer: 0, above: 0, below: 0, gap: 0 };
  const gaps = {};
  for (const { own: ownMaterial, target: targetMaterial } of pairs) {
    const observed = stat(ownMaterial, { window: SPEC.window });
    if (!Number.isFinite(observed)) {
      counts.gap++;
      gaps.unmeasurable = (gaps.unmeasurable ?? 0) + 1;
      continue;
    }
    const common = { draws, window: SPEC.window, statistic: SPEC.statistic, perturbation: SPEC.perturbation, seed: 0 };
    const own = ground({ material: ownMaterial, ...common });
    const target = ground({ material: targetMaterial, ...common });
    if (isGap(own) || isGap(target)) {
      counts.gap++;
      const g = isGap(own) ? own.gap : target.gap;
      gaps[g] = (gaps[g] ?? 0) + 1;
      continue;
    }
    const lv =
      reseeds === null
        ? level(observed, own, target)
        : level(observed, own, target, { material: ownMaterial, reseeds });
    if (isGap(lv)) {
      counts.gap++;
      gaps[lv.gap] = (gaps[lv.gap] ?? 0) + 1;
      continue;
    }
    counts[lv.relationship]++;
  }
  const placed = counts.peer + counts.above + counts.below;
  const laddered = counts.above + counts.below;
  return { ...counts, placed, laddered, rate: placed ? laddered / placed : null, gaps };
};

console.log("── resolution-knob-cross ───────────────────────────────────────────");
console.log(`spec: ${JSON.stringify(SPEC)}`);
console.log(`${pairs.length} adjacent-scale pairs (${SPEC.realisations} realisations x ${SPEC.scales - 1} pairs)`);
console.log("ground truth: white noise has no scale structure — every relation should be `peer`.");
console.log("PRE-REGISTERED: P1 floor-only rate does not fall with draws · P2 rate falls with reseeds");
console.log("                P3 with a reseeding null, rate is flat in draws (spread < floor-only spread)\n");

const table = new Map();
for (const reseeds of RESEEDS_STEPS) {
  const label = reseeds === null ? "floor only" : `reseeds=${reseeds}`;
  const row = [];
  for (const draws of DRAWS_STEPS) {
    const cell = runCell(draws, reseeds);
    row.push(cell);
    const dir = `${cell.above}a/${cell.below}b`;
    const gapNote = cell.gap ? `  gaps ${cell.gap} ${JSON.stringify(cell.gaps)}` : "";
    console.log(
      `${label.padEnd(12)} draws=${String(draws).padEnd(4)} laddered ${String(cell.laddered).padStart(3)}/${String(cell.placed).padEnd(3)} ` +
        `= ${cell.rate === null ? "  n/a" : (cell.rate * 100).toFixed(1).padStart(5)}%   [${dir}]   floor=${(2 / draws).toFixed(4)}${gapNote}`,
    );
  }
  table.set(label, row);
  console.log();
}

// ── the three pre-registered readings, stated as verdicts ──────────────────
const rates = (label) => table.get(label).map((c) => c.rate);
const spread = (rs) => {
  const ok = rs.filter((r) => r !== null);
  return ok.length ? Math.max(...ok) - Math.min(...ok) : null;
};
const monotoneDown = (rs) => rs.every((r, i) => i === 0 || r === null || rs[i - 1] === null || r <= rs[i - 1] + 1e-12);

const floorRates = rates("floor only");
const floorSpread = spread(floorRates);

console.log("── verdicts ────────────────────────────────────────────────────────");
console.log(
  `P1 floor-only rate does not FALL with draws: ${
    floorRates[floorRates.length - 1] >= floorRates[0] ? "HELD" : "REFUSED"
  }  (${floorRates.map((r) => (r === null ? "n/a" : (r * 100).toFixed(1))).join(" → ")})`,
);

for (const draws of DRAWS_STEPS) {
  const i = DRAWS_STEPS.indexOf(draws);
  const col = RESEEDS_STEPS.filter((r) => r !== null).map((r) => table.get(`reseeds=${r}`)[i].rate);
  console.log(
    `P2 draws=${String(draws).padEnd(4)} rate falls as reseeds rises: ${monotoneDown(col) ? "HELD" : "REFUSED"}  (${col
      .map((r) => (r === null ? "n/a" : (r * 100).toFixed(1)))
      .join(" → ")})`,
  );
}

for (const r of RESEEDS_STEPS.filter((x) => x !== null)) {
  const s = spread(rates(`reseeds=${r}`));
  console.log(
    `P3 reseeds=${String(r).padEnd(3)} spread across draws ${((s ?? 0) * 100).toFixed(1)}pp vs floor-only ${((floorSpread ?? 0) * 100).toFixed(1)}pp: ${
      s !== null && floorSpread !== null && s < floorSpread ? "HELD" : "REFUSED"
    }`,
  );
}

// The design's own refusal condition: coarsening must not induce a real level.
const allAbove = [...table.values()].flat().reduce((s, c) => s + c.above, 0);
const allBelow = [...table.values()].flat().reduce((s, c) => s + c.below, 0);
console.log(
  `\ndesign check — direction balance across every cell: ${allAbove} above / ${allBelow} below. ` +
    `A systematic direction would mean coarsening induces a real level and would refuse this control.`,
);
