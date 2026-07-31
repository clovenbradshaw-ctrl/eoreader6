// eoreader6 · loops/atmosphere — TURN 1's interpretation cell:
// Interpretation × Ground = ATMOSPHERE. The first place all three tiers can
// actually run, because its existence tier (nul's VOID) is the only one
// already solid.
//
// THE NINE FIRE IN MODE ORDER, and stance is entailed by (mode, grain) —
// never chosen. At Ground grain every Differentiate op is Clearing, every
// Relate op is Tending, every Generate op is Cultivating. So this cell's
// three operators are fully determined:
//
//   DEF · Atmosphere · Clearing     where does the accumulated ground FAIL?
//                                   -> difference() returning exceeds_witness
//   EVA · Atmosphere · Tending      does the stretch still cohere? the ground
//                                   is MAINTAINED as new material arrives
//   REC · Atmosphere · Cultivating  re-zero: a new ambient ground begins here
//                                   -> reZero(). CUBE.md's Ramakrishna cell.
//
// An atmosphere boundary is therefore not a topic label or a punctuation
// rule — it is the position at which a reader's accumulated ground stops
// working and must be rebuilt. Causal (only material already read),
// reader-relative, and medium-agnostic: this would segment a symphony into
// movements by the same operation it uses to segment prose into scenes.
//
// `tolerance` is declared, never defaulted, for the same reason draws and
// window are: it is the resolution of REFUSAL — how many consecutive
// clearings before the ground is conceded to be the wrong one. A tolerance
// of 1 re-zeros on every outlier and finds boundaries everywhere; a
// tolerance the length of the material finds none.

import { ground, difference, isGap, gap, volume } from "../../../nul/index.js";
import { cellOf } from "../operators.js";

// The cells this organ occupies on the operator grid (engine/operators.js):
// DEF · Atmosphere · Clearing, EVA · Atmosphere · Tending, REC · Atmosphere ·
// Cultivating — the three refuse/witness/concede acts of the one regime.
// Declared, checked by conformance. The event cells below are derived from
// the algebra, never hand-listed.
export const CELLS = Object.freeze([
  Object.freeze({ op: "DEF", grain: "Ground" }),
  Object.freeze({ op: "EVA", grain: "Ground" }),
  Object.freeze({ op: "REC", grain: "Ground" }),
]);

const DEF_GROUND = cellOf("DEF", "Ground"); // Atmosphere · Clearing
const REC_GROUND = cellOf("REC", "Ground"); // Atmosphere · Cultivating

export const readAtmosphere = ({ material, window, draws, tolerance, hop = 1, seed = 0 }) => {
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(tolerance) || tolerance < 1)
    return gap("undeclared", { what: "tolerance", why: "the resolution of refusal is never a default" });
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });

  const regions = [];
  const events = [];
  let regionStart = 0;
  let g = null;
  let clearings = 0;
  let tended = 0;

  const groundFrom = (start, end) => {
    if (end - start < window + 2) return null;
    const built = ground({ material: material.slice(start, end), draws, window, seed: seed + start });
    return isGap(built) ? null : built;
  };

  for (let i = window; i + window <= material.length; i += hop) {
    if (!g) {
      g = groundFrom(regionStart, i);
      if (!g) continue;
    }

    // The observation must be commensurate with the ground's own statistic:
    // burstiness is a MAX-over-windows, so a real windowed mean is the
    // comparable quantity — a raw single value is not. (Learned the hard way
    // several times over; see span-golden-run.mjs and chapter-scene-level.mjs.)
    let sum = 0;
    for (let j = i; j < i + window; j++) sum += material[j];
    const observed = sum / window;

    const d = difference(observed, g);

    // Only SURFEIT clears. Burstiness is a max-over-windows statistic, so an
    // ordinary real window sits BELOW the ground's support almost always —
    // that is regularity, and SEED.md warns in as many words that it must not
    // be mistaken for surfeit. Counting "below" as a clearing re-zeroed on
    // essentially every step (measured: 28 regions over 3 planted regimes).
    if (isGap(d) && d.gap === "exceeds_witness" && d.direction === "above") {
      // DEF · Clearing — this material does not belong to the ground so far
      clearings++;
      events.push({ at: i, op: "DEF", terrain: DEF_GROUND.terrain, stance: DEF_GROUND.stance, direction: d.direction });

      if (clearings >= tolerance) {
        // REC · Cultivating — concede the ground and grow a new one here
        regions.push({ start: regionStart, end: i, ananda: volume(g), tended });
        events.push({ at: i, op: "REC", terrain: REC_GROUND.terrain, stance: REC_GROUND.stance, reason: "ground conceded after repeated clearing" });
        regionStart = i;
        g = null;
        clearings = 0;
        tended = 0;
      }
    } else {
      // EVA · Tending — the ground holds; maintain it against the new material
      clearings = 0;
      tended++;
      const maintained = groundFrom(regionStart, i);
      if (maintained) g = maintained;
    }
  }

  const last = g ?? groundFrom(regionStart, material.length);
  regions.push({ start: regionStart, end: material.length, ananda: last ? volume(last) : null, tended });

  return { regions, events, clearingCount: events.filter((e) => e.op === "DEF").length, rezeroCount: events.filter((e) => e.op === "REC").length };
};

/**
 * The same three operators, driven one arrival at a time.
 *
 * `readAtmosphere` above segments material that has already fully arrived: at
 * position i it compares a ground built on [regionStart, i) against a window
 * [i, i+window) that lies AHEAD of the ground. That is fine for segmentation
 * and fatal for prediction — a predictor that peeks at [i, i+window) to decide
 * where its regime starts has already seen the value it is about to be scored
 * on. So this is not a wrapper around the function above and must not become
 * one: the ground precedes the observation in both, but here BOTH lie strictly
 * in the past, ground on [regionStart, t−window) and observation on
 * [t−window, t). The decision rule is identical; only the horizon moves.
 *
 * Feed it revealed values with `push`, in order. `regimeStart` is then the
 * index at which the current ground was last conceded — the only thing a
 * caller needs to know to answer "how much of my history is contemporary with
 * itself right now."
 *
 * `tolerance` is declared for the same reason it is declared above: it is the
 * resolution of refusal, and a default would decide in advance how eager this
 * is to concede.
 *
 * `push` also returns `cleared`: the raw exceeds-witness-above test for THIS
 * step alone, undelayed by `tolerance` — `rezeroed` only fires once enough
 * clearings have accumulated to concede the ground, so it is silent about
 * every clearing that did not (yet) cross that bar. A caller that wants to
 * know "was this specific arrival still inside what the ground expected" —
 * self, in the efference sense — needs the undelayed signal, not the
 * boundary decision built on top of it.
 */
export const createRegimeTracker = ({ window, draws, tolerance, seed = 0 }) => {
  if (!Number.isInteger(tolerance) || tolerance < 1)
    throw new TypeError("atmosphere: tolerance is the resolution of refusal and is never a default");
  if (!Number.isInteger(window) || window < 2)
    throw new TypeError("atmosphere: window is the reach of the present and is never derived from material length");
  if (!Number.isInteger(draws) || draws < 2)
    throw new TypeError("atmosphere: draws is the resolution of testimony and is never a default");

  const seen = [];
  let regimeStart = 0;
  let g = null;
  let clearings = 0;
  let rezeroCount = 0;

  const groundFrom = (start, end) => {
    if (end - start < window + 2) return null;
    const built = ground({ material: seen.slice(start, end), draws, window, seed: seed + start });
    return isGap(built) ? null : built;
  };

  const push = (x) => {
    if (typeof x !== "number" || !Number.isFinite(x))
      throw new TypeError("atmosphere: a regime tracker consumes finite numbers only");
    seen.push(x);
    const t = seen.length;
    // Both the ground and the observed window must end at or before t.
    if (t < window) return { regimeStart, rezeroed: false, cleared: false, ananda: g ? volume(g) : null };

    const built = groundFrom(regimeStart, t - window);
    if (built) g = built;
    if (!g) return { regimeStart, rezeroed: false, cleared: false, ananda: null };

    // Commensurate with the ground's own statistic: burstiness is a
    // max-over-windows, so only a real windowed mean is comparable to it.
    let sum = 0;
    for (let j = t - window; j < t; j++) sum += seen[j];
    const d = difference(sum / window, g);

    const cleared = isGap(d) && d.gap === "exceeds_witness" && d.direction === "above";
    let rezeroed = false;
    if (cleared) {
      // DEF · Clearing. Only surfeit clears — censored BELOW is regularity,
      // and counting it here re-zeros on nearly every step (SEED.md #8).
      clearings++;
      if (clearings >= tolerance) {
        // REC · Cultivating — concede the ground, grow the next one here.
        regimeStart = t - window;
        g = null;
        clearings = 0;
        rezeroCount++;
        rezeroed = true;
      }
    } else {
      clearings = 0; // EVA · Tending
    }
    return { regimeStart, rezeroed, cleared, ananda: g ? volume(g) : null };
  };

  return {
    push,
    get regimeStart() {
      return regimeStart;
    },
    get rezeroCount() {
      return rezeroCount;
    },
    get ananda() {
      return g ? volume(g) : null;
    },
  };
};
