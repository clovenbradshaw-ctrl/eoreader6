// eoreader6 · loops/operators — ①-⑥, the Existence and Structure tiers.
//
// Separated from turn.js so that both the streaming reader (loops/reader.js)
// and the one-shot turn can use them without importing each other. They were
// in turn.js, which meant reader.js had to import turn.js while turn.js
// delegated to reader.js — a cycle that works in ESM right up until someone
// touches it at module-init time.
//
//   ① NUL · Void · Clearing          construct the nothing
//   ② SIG · Void · Tending           relate presence to it; keep it viable
//   ③ INS · Void · Cultivating       material comes into being
//   ④ SEG · Field · Clearing         partition the arena into reach-units
//   ⑤ CON · Field · Tending          which units are contemporary
//   ⑥ SYN · Field · Cultivating      the arena as one extent; coverage
//
// Stance is entailed by (mode, grain) and never chosen: at Ground grain every
// Differentiate op is Clearing, every Relate op is Tending, every Generate op
// is Cultivating.

import { ground, admissible, volume, isGap, gap } from "../../../nul/index.js";
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

