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
      events.push({ at: i, op: "DEF", stance: "Clearing", direction: d.direction });

      if (clearings >= tolerance) {
        // REC · Cultivating — concede the ground and grow a new one here
        regions.push({ start: regionStart, end: i, ananda: volume(g), tended });
        events.push({ at: i, op: "REC", stance: "Cultivating", reason: "ground conceded after repeated clearing" });
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
