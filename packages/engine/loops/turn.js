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

import { gap } from "../../../nul/index.js";
import { read } from "./reader.js";

// ①-⑥ live in loops/operators.js and are re-exported here so that "the nine
// operators" remains one importable place, which is what this file is for.
export { clearVoid, tendVoid, cultivateVoid, clearField, tendField, cultivateField } from "./operators.js";

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
export const runTurn = ({ material, grain = "Ground", window, draws, reseeds, tolerance, hop = 1, seed = 0, clearOn = ["surfeit", "moved"] }) => {
  if (grain !== "Ground")
    return gap("unknown_spec", { reason: `grain "${grain}" is not yet earned — only Ground is built`, grain });
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });

  // DELEGATES. loops/reader.js is the implementation; this is the one-shot
  // door into it, kept because a caller who genuinely has the whole thing at
  // once should not have to stage an arrival. Two implementations that agree
  // today is how this repo has lost time before, so there is only one.
  //
  // A caller arriving here has a bare `window` and no consumption contract,
  // which is the state everything was in before perceiver/consumption.js. It
  // is wrapped in the most honest contract available: sequential, because
  // reading it at all assumes that, and a basis that says plainly that nobody
  // declared one.
  return read(material, {
    consumption: {
      order: "sequential",
      unit: "unnamed element",
      present: window,
      basis: "no perceiver declared how this material is consumed; the caller supplied a bare reach and reading it assumes sequence",
      rate: null,
    },
    draws, reseeds, tolerance, hop, seed, clearOn,
  });
};
