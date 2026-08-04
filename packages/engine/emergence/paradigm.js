// eoreader6 · emergence/paradigm — the frame held, and the frame conceded.
//
// Two cells share this file, the Interpretation domain's Pattern grain — the
// grain where a WHOLE frame is refused or replaced, never one claim:
//
//   DEF · Pattern   Paradigm · Unraveling   refuse what the paradigm cannot hold
//   REC · Pattern   Paradigm · Composing    a new paradigm begins when the old unravels
//
// DEF·FIGURE refuses a claim against a lens — "this is not this kind's member."
// DEF·PATTERN is a different act, and CUBE.md's exemplars separate them: the
// Figure-grain refusal rejects one specific claim ("no conclusion could be
// drawn"); the Pattern-grain refusal dismantles a whole frame ("reality is
// often different, however"). The paradigm is the set of induced kinds; its
// cores are the fields those kinds cohere on. A coherent body of material that
// the paradigm's cores cannot hold at all is not a misfit member — it is a
// different frame, and the paradigm's claim to organise the material unravels.
// The refusal is a typed gap that names the paradigm and the received
// coherence that refuted it.
//
// REC·PATTERN is the reset at the same grain: "a new ambient ground begins."
// REC·Ground concedes the ground and grows the next one; REC·Pattern concedes
// the paradigm and composes the next one — over the accumulated material,
// old and received, re-induced. The trigger is the DEF·Pattern unravel itself,
// the way censored-above is the trigger to re-zero at the Ground grain. A
// re-zero that recomposes the same cores is not a new ambient ground, and one
// that still cannot hold the material the old paradigm could not hold is
// refused as not yet earned, never silently claimed.
//
// DECLARED NUMBERS. The induction numbers (population, minPrevalence,
// minKindSize, permutations, quantile, seed, reseeds) are required — none is
// defaulted. No fourth declared number: the unravel is measured by the
// paradigm's own cores against the material's own induction, never by a rate
// threshold.

import { gap, isGap } from "../../../nul/index.js";
import { induceKinds } from "./kinds.js";

// The cells this organ occupies — declared, checked by conformance.
export const DEF_PATTERN_CELL = Object.freeze({ op: "DEF", grain: "Pattern" });
export const REC_PATTERN_CELL = Object.freeze({ op: "REC", grain: "Pattern" });

export const CELLS = Object.freeze([DEF_PATTERN_CELL, REC_PATTERN_CELL]);

/** The cores the paradigm coheres on — the fields its kinds hold their members
 *  by. A kind with no core holds nothing, so a paradigm with no cores is
 *  empty. */
export const paradigmCores = (kinds) => {
  const cores = new Set();
  for (const k of kinds) {
    if (k?.core?.field_id) cores.add(k.core.field_id);
    else if (Array.isArray(k?.cores)) for (const c of k.cores) if (c?.field_id) cores.add(c.field_id);
  }
  return cores;
};

/** A record is held by the paradigm iff it carries one of the paradigm's core
 *  fields. Binary and structural — a record carries a field or it does not. */
export const placeable = (record, cores) =>
  (record?.attributes ?? []).some((a) => cores.has(a.field_id));

/** The material's own coherence, measured by its own induction: does it form
 *  kinds that pass both Born gates (height "above")? Never assumed — induced
 *  here, with the same declared numbers the paradigm itself used. */
export const coherenceOf = (records, opts) => {
  const induced = induceKinds(records, opts);
  const above = induced.filter((k) => k.height === "above" && k.heightGate?.existence?.passed);
  return { coherent: above.length > 0, induced, above };
};

// ── DEF · Pattern — the paradigm unravels ───────────────────────────────────

/**
 * Refuse, at the Pattern grain, material the paradigm cannot hold.
 *
 * Given the induced kinds (the paradigm) and a received body of records, ask
 * whether the paradigm organises it. Two measured facts decide:
 *
 *   hold      — do the paradigm's cores place ANY of the received records?
 *   coherence — is the received material organised on its own (its own
 *               induction passes both Born gates)?
 *
 * The unravel is their conjunction, and it is exact, not a threshold: coherent
 * material NOT ONE of whose records carries a paradigm core is a different
 * frame, and the paradigm has nothing to say about it. Noise with no placement
 * is not an unravel — incoherent material is not a frame. The refusal is the
 * typed gap `paradigm_unraveled`, naming the paradigm and the received
 * coherence that refuted it.
 */
export const refuseParadigm = (kinds, records, opts = {}) => {
  if (!Array.isArray(kinds)) throw new TypeError("refuseParadigm: kinds is declared, never defaulted");
  const { population, minPrevalence, minKindSize, permutations, quantile, seed } = opts;
  for (const [name, v] of [["population", population], ["minPrevalence", minPrevalence], ["minKindSize", minKindSize], ["permutations", permutations], ["quantile", quantile], ["seed", seed]]) {
    if (v === undefined) throw new TypeError(`refuseParadigm: ${name} is declared, never defaulted`);
    if ((name === "population" && typeof v !== "string") || (name !== "population" && (typeof v !== "number" || !Number.isFinite(v))))
      throw new TypeError(`refuseParadigm: ${name} must be a ${name === "population" ? "string" : "number"} (got ${v})`);
  }

  if (!Array.isArray(records) || records.length === 0)
    return gap("empty_material", { reason: "no received material to refuse" });

  const cores = paradigmCores(kinds);
  if (cores.size === 0)
    return gap("empty_paradigm", { reason: "a paradigm with no cores holds nothing and can unravel nothing" });

  const held = records.filter((r) => placeable(r, cores)).length;
  const placement = held / records.length;

  // The received material's own coherence — its own induction, same numbers.
  const { coherent, induced, above } = coherenceOf(records, opts);

  if (placement === 0 && coherent) {
    return gap("paradigm_unraveled", {
      placement,
      coherent,
      paradigm: kinds.map((k) => k.label),
      cores: [...cores],
      received_coherence: above.map((k) => k.label),
      reason: "coherent material not one of whose records carries a paradigm core — a different frame, and the paradigm has nothing to say about it",
    });
  }

  return Object.freeze({
    refused: false,
    placement,
    coherent,
    paradigm: kinds.map((k) => k.label),
    ...(above.length ? { received_kinds: above.map((k) => k.label) } : {}),
  });
};

// ── REC · Pattern — a new paradigm begins ───────────────────────────────────

/**
 * Compose the next paradigm over the accumulated material — the reset at the
 * Pattern grain.
 *
 * The trigger is the DEF·Pattern unravel: `prior` is the `paradigm_unraveled`
 * gap (or an object carrying the unraveled paradigm's labels). REC is never a
 * default — without a measured unravel there is nothing to concede and no new
 * ambient ground begins.
 *
 * The new paradigm is measured twice, never assumed:
 *
 *   holds itself   — at least one re-induced kind passes both Born gates.
 *   holds the loss — the material the old paradigm could not place is placed
 *                    by the new one. A re-zero that leaves the same material
 *                    unheld has conceded nothing.
 *
 * Both failures are typed gaps, never a silently recomposed frame.
 */
export const rezeroParadigm = (records, opts = {}, { prior } = {}) => {
  if (prior === undefined || prior === null)
    return gap("no_rezero_trigger", { reason: "REC is never a default — the DEF·Pattern unravel must be measured first" });
  const unraveled = isGap(prior) ? prior : prior.unraveled ?? null;
  const priorLabels = Array.isArray(prior?.paradigm) ? prior.paradigm : Array.isArray(unraveled?.paradigm) ? unraveled.paradigm : null;
  const oldCores = new Set(Array.isArray(unraveled?.cores) ? unraveled.cores : []);
  if (unraveled?.gap !== "paradigm_unraveled" && !priorLabels)
    return gap("no_rezero_trigger", { reason: "a re-zero needs a measured unravel, not a guess (got a prior that did not unravel)" });

  const { population, minPrevalence, minKindSize, permutations, quantile, seed } = opts;
  for (const [name, v] of [["population", population], ["minPrevalence", minPrevalence], ["minKindSize", minKindSize], ["permutations", permutations], ["quantile", quantile], ["seed", seed]]) {
    if (v === undefined) throw new TypeError(`rezeroParadigm: ${name} is declared, never defaulted`);
    if ((name === "population" && typeof v !== "string") || (name !== "population" && (typeof v !== "number" || !Number.isFinite(v))))
      throw new TypeError(`rezeroParadigm: ${name} must be a ${name === "population" ? "string" : "number"} (got ${v})`);
  }

  if (!Array.isArray(records) || records.length === 0)
    return gap("empty_material", { reason: "nothing accumulated to re-induce over" });

  const induced = induceKinds(records, opts);
  const above = induced.filter((k) => k.height === "above" && k.heightGate?.existence?.passed);
  if (above.length === 0)
    return gap("degenerate_ground", { reason: "the accumulated material cannot support a new paradigm — no kind clears both Born gates", induced: induced.map((k) => k.label) });

  // Hold the loss: the material the old paradigm could not place must be held
  // by the new one. The loss is measured, not remembered — the old cores come
  // from the unravel gap itself.
  const newCores = paradigmCores(above);
  const stillUnheld = records.filter((r) => {
    if (placeable(r, newCores)) return false;
    return !placeable(r, oldCores);
  });
  if (stillUnheld.length > 0)
    return gap("not_earned", { reason: `${stillUnheld.length} record(s) the old paradigm could not hold remain unheld by the new — the re-zero concedes nothing`, still_unheld: stillUnheld.length });

  return Object.freeze({
    rezeroed: true,
    paradigm: above.map((k) => k.label),
    cores: [...newCores],
    held_records: records.length - stillUnheld.length,
    trigger: isGap(prior) ? prior.gap : "paradigm_unraveled",
    reason: "a new ambient ground begins",
  });
};
