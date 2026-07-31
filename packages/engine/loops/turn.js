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
//   ⑦ DEF · Atmosphere · Clearing    where the ground fails (BOTH ways)
//   ⑧ EVA · Atmosphere · Tending     where it holds; maintain it
//   ⑨ REC · Atmosphere · Cultivating re-zero; a new ambient ground begins
//
// ⑦⑧⑨'s settled output is what turn 2 RECEIVES as its existence tier. Only
// Ground grain is implemented; the other grains are honestly refused rather
// than faked.

import { ground, difference, pattern, admissible, volume, isGap, gap } from "../../../nul/index.js";
import { cellOf } from "../operators.js";

// The cells this organ occupies on the operator grid (engine/operators.js):
// one complete turn fires all nine at Ground grain. Declared, checked by
// conformance.
export const CELLS = Object.freeze(
  ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"].map((op) =>
    Object.freeze({ op, grain: "Ground" }),
  ),
);

// The interpretation tier's cells, derived from the algebra (operators.js) —
// terrain and stance are entailed by (mode, grain), never hand-listed. The
// comments record what the derivation yields, so a drift in the algebra shows
// as a test failure, not a silent relabel.
const DEF_GROUND = cellOf("DEF", "Ground"); // Atmosphere · Clearing
const EVA_GROUND = cellOf("EVA", "Ground"); // Atmosphere · Tending
const REC_GROUND = cellOf("REC", "Ground"); // Atmosphere · Cultivating

// ── EXISTENCE · Void ─────────────────────────────────────────────────────────

/** ① NUL · Void · Clearing — a nothing built by perturbing what is present. */
export const clearVoid = ({ material, draws, window, seed, perturbation = "shuffle" }) => ground({ material, draws, window, seed, perturbation });

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
 * must be rebuilt — not a topic label, not a punctuation rule.
 *
 * A GROUND CAN FAIL TWO WAYS, and both are DEF · Atmosphere · Clearing:
 *
 *   surfeit — the new material EXCEEDS the ground's support. What arrived is
 *     outside what the nothing can place. Detectable from the figure alone:
 *     difference() returns exceeds_witness above. (Censored BELOW is not a
 *     failure — burstiness is a max-over-windows statistic, so an ordinary
 *     real window sits under its support almost always, and SEED.md warns in
 *     as many words that censored-below is regularity and must not be
 *     mistaken for it. Counting it re-zeroed on essentially every step.)
 *
 *   moved — the GROUND ITSELF has shifted under maintenance: rebuilt over the
 *     region as it now stands, it sits further from where it was than merely
 *     reseeding it would put it. That is pattern() — Bateson's difference
 *     that makes a difference, applied to the ambient ground rather than to
 *     a figure.
 *
 * Why the second one had to exist: burstiness is a max over windows, so
 * surfeit responds to whatever lifts the max. That makes it good at LEVEL
 * shifts and unreliable on SPREAD shifts — not blind to them, which was the
 * first draft of this paragraph and was wrong. A big enough variance increase
 * does lift a max. What it misses is a spread change against a ground already
 * wide enough to absorb it, which is the ordinary case once a reader has
 * accumulated anything. Measured on a planted calm → elevated → turbulent
 * series over three seeds: the moved clearing found the spread transition 3/3,
 * surfeit 1/3, and ananda tracked it every time (0.5 → 1.2 → 2.5) while
 * clearing did not. pattern() compares the whole quantile shape of the two
 * grounds, so a spread change displaces it. The two modes read different
 * failures of the same ground.
 *
 * Crucially this invents no new threshold. pattern() carries its own null and
 * `moved` is a comparison against it, not against a number chosen here.
 * `tolerance` stays the one hand-set knob, and both modes count into it,
 * because "the ground failed again" is the same fact either way.
 *
 * What it cost to get right: wired against pattern()'s ORIGINAL null — held
 * at before's extent while `after` grew — this fired on homogeneous noise at
 * near-even spacing and recovered 23/24 Frankenstein chapter boundaries while
 * recovering 21–23/24 from the same series SHUFFLED. See nul/index.js::pattern
 * for the correction and scripts/RESULTS.md for the numbers on both sides
 * of it.
 *
 * Declared, never defaulted: `tolerance` (the resolution of refusal),
 * `window`, `draws`, and now `reseeds` (the resolution of pattern).
 *
 * `clearOn` selects which failure modes count. It is an ABLATION HANDLE, for
 * measuring one mode against the other, not a tuning knob — the shipped
 * reading admits both, because a reader whose ground has moved out from
 * under them has lost it just as surely as one swamped by surfeit.
 */
export const runTurn = ({ material, grain = "Ground", window, draws, reseeds, tolerance, hop = 1, seed = 0, clearOn = ["surfeit", "moved"], perturbation = "shuffle" }) => {
  if (grain !== "Ground")
    return gap("unknown_spec", { reason: `grain "${grain}" is not yet earned — only Ground is built`, grain });
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(tolerance) || tolerance < 1)
    return gap("undeclared", { what: "tolerance", why: "the resolution of refusal is never a default" });
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });
  const wantsMoved = clearOn.includes("moved");
  if (wantsMoved && (!Number.isInteger(reseeds) || reseeds < 2))
    return gap("undeclared", { what: "reseeds", why: "the resolution of pattern is never a default" });
  for (const mode of clearOn)
    if (mode !== "surfeit" && mode !== "moved") return gap("unknown_spec", { reason: `no such failure mode: ${mode}` });
  if (clearOn.length === 0) return gap("undeclared", { what: "clearOn", why: "a ground that cannot fail is not a ground" });

  // ④⑤⑥ FIELD — the arena, established before anything is interpreted in it
  const units = clearField(material.length, { window, hop });
  const adjacency = tendField(units);
  const coverage = cultivateField(units, material.length);

  const regions = [];
  const events = [];
  const driftGaps = new Map(); // a gap is a result: pattern refusing to rule is recorded, not swallowed
  let regionStart = 0;
  let g = null;
  let gEnd = null; // how much material the standing ground was built over — pattern's null needs it
  let clearings = 0;
  let tended = 0;
  let anandaAtOpen = null;

  const buildAt = (start, end, s) => {
    if (end - start < window + 2) return null;
    // ① NUL · Void · Clearing
    const built = clearVoid({ material: cultivateVoid(material, end).slice(start), draws, window, seed: s + start, perturbation });
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
      gEnd = i;
      anandaAtOpen = tendVoid(g).ananda;
    }

    let sum = 0;
    for (let j = i; j < i + window; j++) sum += material[j];
    const observed = sum / window;

    // ⑦ DEF · Clearing, first failure: the figure exceeds what the ground can place.
    const d = difference(observed, g);
    let failure = null;
    if (clearOn.includes("surfeit") && isGap(d) && d.gap === "exceeds_witness" && d.direction === "above")
      failure = { mode: "surfeit", observed, support: d.support };

    // ⑧ EVA · Tending is also the only place the SECOND failure becomes
    // visible: you have to actually rebuild the ground over the region as it
    // now stands before you can ask whether it moved. So the maintenance act
    // happens here unconditionally, and what it returns is read twice —
    // once as the maintained ground, once as evidence about the old one.
    const maintained = buildAt(regionStart, i, seed);
    let drift = null;
    if (wantsMoved && maintained && gEnd != null && gEnd < i) {
      // The null is BEFORE's own reseeding variation over BEFORE's own
      // material — never the grown material, which would make `after` a
      // member of its own null and force moved=false structurally.
      drift = pattern({ before: g, after: maintained, material: material.slice(regionStart, gEnd), reseeds });
      if (isGap(drift)) driftGaps.set(drift.gap, (driftGaps.get(drift.gap) || 0) + 1);
      else if (drift.moved && !failure)
        failure = { mode: "moved", displacement: drift.displacement, reseedNull: drift.reseedNull, opened: drift.opened };
    }

    if (failure) {
      clearings++;
      events.push({ at: i, op: "DEF", terrain: DEF_GROUND.terrain, stance: DEF_GROUND.stance, ...failure });

      // A failing ground is not maintained. The standing ground is held
      // fixed while consecutive failures accumulate, for both modes alike —
      // otherwise `tolerance` would be counting against a moving target.
      if (clearings >= tolerance) {
        const closing = tendVoid(g);
        regions.push({
          start: regionStart, end: i, tended,
          anandaOpen: anandaAtOpen, anandaClose: closing.ananda,
          opened: closing.ananda > anandaAtOpen, // widened = encounter; narrowed = extraction
          clearedBy: failure.mode,
        });
        events.push({ at: i, op: "REC", terrain: REC_GROUND.terrain, stance: REC_GROUND.stance, clearedBy: failure.mode });
        regionStart = i;
        g = null;
        gEnd = null;
        clearings = 0;
        tended = 0;
      }
    } else {
      clearings = 0;
      tended++;
      events.push({ at: i, op: "EVA", terrain: EVA_GROUND.terrain, stance: EVA_GROUND.stance });
      if (maintained) {
        g = maintained;
        gEnd = i;
      }
    }
  }

  const last = g ?? buildAt(regionStart, material.length, seed);
  const lastAnanda = last ? tendVoid(last).ananda : null;
  regions.push({
    start: regionStart, end: material.length, tended,
    anandaOpen: anandaAtOpen, anandaClose: lastAnanda,
    opened: lastAnanda != null && anandaAtOpen != null ? lastAnanda > anandaAtOpen : null,
    clearedBy: null, // the last region is ended by the material running out, not by a failure
  });

  const defs = events.filter((e) => e.op === "DEF");
  return {
    grain,
    clearOn,
    field: { units: units.length, coverage, adjacencyOf: (i) => adjacency.get(i) ?? [] },
    regions,
    events,
    clearings: defs.length,
    clearingsBy: {
      surfeit: defs.filter((e) => e.mode === "surfeit").length,
      moved: defs.filter((e) => e.mode === "moved").length,
    },
    driftGaps: Object.fromEntries(driftGaps),
    rezeros: events.filter((e) => e.op === "REC").length,
    tendings: events.filter((e) => e.op === "EVA").length,
  };
};
