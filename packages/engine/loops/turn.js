// eoreader6 · loops/turn — ONE COMPLETE TURN: all nine operators at one
// grain, fired in order. Domain is the dependency (Existence enables
// Structure enables Interpretation); mode is the sequence within it
// (Differentiate, Relate, Generate). Stance is entailed by (mode, grain) and
// never chosen — at Ground grain every Differentiate op is Clearing, every
// Relate op is Tending, every Generate op is Cultivating.
//
//   ① NUL · Void · Clearing          construct the nothing
//   ② SIG · Void · Tending           relate presence to it; keep it viable
//   ③ INS · Void · Cultivating       material comes into being
//   ④ SEG · Field · Clearing         partition the arena into reach-units
//   ⑤ CON · Field · Tending          which units are contemporary
//   ⑥ SYN · Field · Cultivating      the arena as one extent; coverage
//   ⑦ DEF · Atmosphere · Clearing    where the ground fails (surfeit only)
//   ⑧ EVA · Atmosphere · Tending     where it holds; maintain it
//   ⑨ REC · Atmosphere · Cultivating re-zero; a new ambient ground begins
//
// ⑦⑧⑨'s settled output is what turn 2 RECEIVES as its existence tier. Only
// Ground grain is implemented; the other grains are honestly refused rather
// than faked.

import { ground, difference, admissible, volume, isGap, gap } from "../../../nul/index.js";

// ── EXISTENCE · Void ─────────────────────────────────────────────────────────

/** ① NUL · Void · Clearing — a nothing built by perturbing what is present. */
export const clearVoid = ({ material, draws, window, seed }) => ground({ material, draws, window, seed });

/**
 * ② SIG · Void · Tending — keep the nothing fit to perceive through, and
 * report how much room is left to be surprised in. A ground that has gone
 * degenerate or been kept for testimony is no longer a void you can see
 * against; ananda (interquartile volume) is the sign of health, never a gate.
 */
export const tendVoid = (g) => {
  const bad = admissible(g);
  if (bad) return { viable: false, reason: bad };
  if (g.kept) return { viable: false, reason: gap("kept_ground", { reason: "held for testimony" }) };
  const room = volume(g);
  return { viable: room > 0, ananda: room };
};

/**
 * ③ INS · Void · Cultivating — what has come into being so far. Causal by
 * construction: a turn may only ever see material already arrived, never the
 * whole extent. This is the operator that makes the read a READING rather
 * than an analysis of a finished object.
 */
export const cultivateVoid = (material, upTo) => material.slice(0, Math.max(0, Math.min(upTo, material.length)));

// ── STRUCTURE · Field ────────────────────────────────────────────────────────

/**
 * ④ SEG · Field · Clearing — partition the arena into reach-units. `window`
 * is the reach of the present (SEED.md's third declared number): how much
 * material is contemporary with itself. Declared, never derived from length.
 */
export const clearField = (extent, { window, hop }) => {
  const units = [];
  for (let i = 0; i + window <= extent; i += hop) units.push({ start: i, end: i + window });
  return units;
};

/** ⑤ CON · Field · Tending — two units are contemporary when they overlap. */
export const tendField = (units) => {
  const adjacency = new Map();
  for (let i = 0; i < units.length; i++) {
    const touching = [];
    for (let j = 0; j < units.length; j++) {
      if (i === j) continue;
      if (units[j].start < units[i].end && units[i].start < units[j].end) touching.push(j);
    }
    adjacency.set(i, touching);
  }
  return adjacency;
};

/**
 * ⑥ SYN · Field · Cultivating — the arena as one extent. Reports coverage:
 * material no reach-unit touches is outside the field and cannot bear a
 * relation, which is a gap in the arena, not a silent omission.
 */
export const cultivateField = (units, extent) => {
  if (units.length === 0) return { covered: 0, extent, uncovered: extent, complete: false };
  const covered = new Set();
  for (const u of units) for (let i = u.start; i < u.end; i++) covered.add(i);
  return { covered: covered.size, extent, uncovered: extent - covered.size, complete: covered.size === extent };
};

// ── INTERPRETATION · Atmosphere ──────────────────────────────────────────────

/**
 * ⑦⑧⑨ DEF/EVA/REC · Atmosphere · Clearing/Tending/Cultivating.
 *
 * An atmosphere boundary is where the accumulated ground stops working and
 * must be rebuilt — not a topic label, not a punctuation rule. Only SURFEIT
 * clears: burstiness is a max-over-windows statistic, so an ordinary real
 * window sits BELOW its support almost always, and SEED.md warns in as many
 * words that censored-below is regularity and must not be mistaken for it.
 *
 * `tolerance` is declared, never defaulted: it is the resolution of refusal.
 */
export const runTurn = ({ material, grain = "Ground", window, draws, tolerance, hop = 1, seed = 0 }) => {
  if (grain !== "Ground")
    return gap("unknown_spec", { reason: `grain "${grain}" is not yet earned — only Ground is built`, grain });
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(tolerance) || tolerance < 1)
    return gap("undeclared", { what: "tolerance", why: "the resolution of refusal is never a default" });
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });

  // ④⑤⑥ FIELD — the arena, established before anything is interpreted in it
  const units = clearField(material.length, { window, hop });
  const adjacency = tendField(units);
  const coverage = cultivateField(units, material.length);

  const regions = [];
  const events = [];
  let regionStart = 0;
  let g = null;
  let clearings = 0;
  let tended = 0;
  let anandaAtOpen = null;

  const buildAt = (start, end, s) => {
    if (end - start < window + 2) return null;
    // ① NUL · Void · Clearing
    const built = clearVoid({ material: cultivateVoid(material, end).slice(start), draws, window, seed: s + start });
    if (isGap(built)) return null;
    // ② SIG · Void · Tending
    return tendVoid(built).viable ? built : null;
  };

  for (const unit of units) {
    const i = unit.start;
    if (i < window) continue;

    if (!g) {
      g = buildAt(regionStart, i, seed);
      if (!g) continue;
      anandaAtOpen = tendVoid(g).ananda;
    }

    let sum = 0;
    for (let j = i; j < i + window; j++) sum += material[j];
    const observed = sum / window;

    const d = difference(observed, g);

    if (isGap(d) && d.gap === "exceeds_witness" && d.direction === "above") {
      clearings++;
      events.push({ at: i, op: "DEF", terrain: "Atmosphere", stance: "Clearing" });

      if (clearings >= tolerance) {
        const closing = tendVoid(g);
        regions.push({
          start: regionStart, end: i, tended,
          anandaOpen: anandaAtOpen, anandaClose: closing.ananda,
          opened: closing.ananda > anandaAtOpen, // widened = encounter; narrowed = extraction
        });
        events.push({ at: i, op: "REC", terrain: "Atmosphere", stance: "Cultivating" });
        regionStart = i;
        g = null;
        clearings = 0;
        tended = 0;
      }
    } else {
      clearings = 0;
      tended++;
      events.push({ at: i, op: "EVA", terrain: "Atmosphere", stance: "Tending" });
      const maintained = buildAt(regionStart, i, seed);
      if (maintained) g = maintained;
    }
  }

  const last = g ?? buildAt(regionStart, material.length, seed);
  const lastAnanda = last ? tendVoid(last).ananda : null;
  regions.push({
    start: regionStart, end: material.length, tended,
    anandaOpen: anandaAtOpen, anandaClose: lastAnanda,
    opened: lastAnanda != null && anandaAtOpen != null ? lastAnanda > anandaAtOpen : null,
  });

  return {
    grain,
    field: { units: units.length, coverage, adjacencyOf: (i) => adjacency.get(i) ?? [] },
    regions,
    events,
    clearings: events.filter((e) => e.op === "DEF").length,
    rezeros: events.filter((e) => e.op === "REC").length,
    tendings: events.filter((e) => e.op === "EVA").length,
  };
};
