// eoreader6 · loops/reader — READING, as opposed to processing an array that
// happens to be traversed in order.
//
// `runTurn` was causal in its arithmetic: every figure at position i was built
// from material before i, and nothing looked forward. That is necessary and it
// is not sufficient. It was still handed the whole document up front, still
// established its FIELD over the total extent before interpreting anything,
// and still gave you nothing at all until it reached the end. A reader who
// must be given the whole book before saying a word, and who partitions it end
// to end before reading page one, is not reading it.
//
// So this is the same nine operators, driven by ADMISSION instead of by a
// loop. Material arrives; whatever has become readable is read; the reading is
// available at every point and can be stopped anywhere. `runTurn` is now a thin
// wrapper — open, admit everything, close — so there is one implementation
// rather than two that drift, which is this repo's most reliable failure mode.
//
// WHAT MAKES IT READABLE AT ALL IS THE CONTRACT, NOT THE SHAPE OF THE DATA.
//
// Every perceiver now declares how its material is meant to be consumed
// (perceiver/consumption.js), and this refuses anything that is not sequential.
// A still image reduces to a perfectly good numeric series — scanline
// luminance, top to bottom — and running this over it would produce regions
// and boundaries and an ananda trace and all of it would be an artefact of
// raster order. Nobody looks at a painting from the top down. Refusing is not
// conservatism; it is the difference between reading the content and reading
// the file format.
//
// The contract also supplies `window`, which was the last hand-set number in
// the perception path that nobody could justify — a bare 12 handed identically
// to prose chunks, 512-byte blocks, and 50ms audio frames. It is the reach of
// the present, it is a property of how the thing is consumed, and the
// perceiver is the only one that knows it.
//
// The invariant conformance holds this to: ADMISSION-ORDER INVARIANCE. Feeding
// the material one element at a time, in ragged batches, or all at once must
// produce identical events, regions and gaps. If the batching can be seen in
// the output, the reader is reading its input schedule.

import { ground, difference, pattern, isGap, gap } from "../../../nul/index.js";
import { isReadable, refusalFor } from "../perceiver/consumption.js";
import { clearVoid, tendVoid, cultivateVoid, clearField, tendField, cultivateField } from "./operators.js";

/**
 * Open a reading. Nothing has been read yet, and that state is a real one —
 * a reader before the first page is not an error condition.
 *
 * `consumption` is the perceiver's contract and supplies `window`. It is not
 * optional and there is no way to pass a window directly: that door is how the
 * unjustified 12 got in everywhere, and closing it is most of the point.
 */
export const openReading = ({ consumption, draws, reseeds, tolerance, hop = 1, seed = 0, clearOn = ["surfeit", "moved"] }) => {
  const refusal = refusalFor(consumption);
  if (refusal) return gap(refusal.gap, refusal);
  if (!isReadable(consumption)) return gap("unknown_spec", { why: "not sequential", order: consumption.order });

  const window = consumption.present;
  if (!Number.isInteger(tolerance) || tolerance < 1)
    return gap("undeclared", { what: "tolerance", why: "the resolution of refusal is never a default" });
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });
  const wantsMoved = clearOn.includes("moved");
  if (wantsMoved && (!Number.isInteger(reseeds) || reseeds < 2))
    return gap("undeclared", { what: "reseeds", why: "the resolution of pattern is never a default" });
  for (const mode of clearOn)
    if (mode !== "surfeit" && mode !== "moved") return gap("unknown_spec", { reason: `no such failure mode: ${mode}` });
  if (clearOn.length === 0) return gap("undeclared", { what: "clearOn", why: "a ground that cannot fail is not a ground" });

  return {
    consumption,
    spec: { window, draws, reseeds, tolerance, hop, seed, clearOn, wantsMoved },
    // What has been read. A reader retains what they have read — that is not
    // the same as having been handed what they have not.
    material: [],
    nextUnit: 0, // the start index of the next reach-unit to be cut
    units: [],
    regions: [],
    events: [],
    driftGaps: new Map(),
    regionStart: 0,
    g: null,
    gEnd: null,
    clearings: 0,
    tended: 0,
    anandaAtOpen: null,
    closed: false,
  };
};

const buildAt = (r, start, end) => {
  const { window, draws, seed } = r.spec;
  if (end - start < window + 2) return null;
  // ① NUL · Void · Clearing, over material that has actually arrived
  const built = clearVoid({ material: cultivateVoid(r.material, end).slice(start), draws, window, seed: seed + start });
  if (isGap(built)) return null;
  // ② SIG · Void · Tending
  return tendVoid(built).viable ? built : null;
};

/**
 * ⑦⑧⑨ over one reach-unit. Extracted verbatim from what runTurn's loop body
 * was, so the streaming and one-shot paths cannot say different things.
 */
const interpret = (r, i) => {
  const { window, tolerance, seed, clearOn, wantsMoved, reseeds } = r.spec;
  if (i < window) return;

  if (!r.g) {
    r.g = buildAt(r, r.regionStart, i);
    if (!r.g) return;
    r.gEnd = i;
    r.anandaAtOpen = tendVoid(r.g).ananda;
  }

  let sum = 0;
  for (let j = i; j < i + window; j++) sum += r.material[j];
  const observed = sum / window;

  const d = difference(observed, r.g);
  let failure = null;
  if (clearOn.includes("surfeit") && isGap(d) && d.gap === "exceeds_witness" && d.direction === "above")
    failure = { mode: "surfeit", observed, support: d.support };

  const maintained = buildAt(r, r.regionStart, i);
  if (wantsMoved && maintained && r.gEnd != null && r.gEnd < i) {
    const drift = pattern({ before: r.g, after: maintained, material: r.material.slice(r.regionStart, r.gEnd), reseeds });
    if (isGap(drift)) r.driftGaps.set(drift.gap, (r.driftGaps.get(drift.gap) || 0) + 1);
    else if (drift.moved && !failure)
      failure = { mode: "moved", displacement: drift.displacement, reseedNull: drift.reseedNull, opened: drift.opened };
  }

  if (failure) {
    r.clearings++;
    r.events.push({ at: i, op: "DEF", terrain: "Atmosphere", stance: "Clearing", ...failure });
    if (r.clearings >= tolerance) {
      const closing = tendVoid(r.g);
      r.regions.push({
        start: r.regionStart, end: i, tended: r.tended,
        anandaOpen: r.anandaAtOpen, anandaClose: closing.ananda,
        opened: closing.ananda > r.anandaAtOpen,
        clearedBy: failure.mode,
      });
      r.events.push({ at: i, op: "REC", terrain: "Atmosphere", stance: "Cultivating", clearedBy: failure.mode });
      r.regionStart = i;
      r.g = null;
      r.gEnd = null;
      r.clearings = 0;
      r.tended = 0;
    }
  } else {
    r.clearings = 0;
    r.tended++;
    r.events.push({ at: i, op: "EVA", terrain: "Atmosphere", stance: "Tending" });
    if (maintained) {
      r.g = maintained;
      r.gEnd = i;
    }
  }
};

/**
 * admit(reading, arriving) — more of the real thing has come in.
 *
 * A reach-unit becomes readable only when the whole of its present has
 * arrived: the unit at i observes [i, i+window), so it cannot be read until
 * i+window elements exist. That is the field being CUT AS IT ARRIVES rather
 * than partitioned up front, and it is what makes the batching invisible —
 * whether those elements came in one call or fifty makes no difference to when
 * the unit becomes readable, only to when the caller finds out.
 *
 * Returns the events emitted by this admission, so a caller can consume the
 * reading as it happens instead of waiting for the end.
 */
export const admit = (r, arriving) => {
  if (isGap(r)) return r;
  if (r.closed) return gap("kept_ground", { reason: "this reading was closed; a closed reading cannot take more material" });
  const before = r.events.length;
  for (const v of arriving) r.material.push(v);

  const { window, hop } = r.spec;
  while (r.nextUnit + window <= r.material.length) {
    const i = r.nextUnit;
    r.units.push({ start: i, end: i + window });
    interpret(r, i);
    r.nextUnit += hop;
  }
  return r.events.slice(before);
};

/**
 * What the reading says AT THIS MOMENT, without ending it. The open region is
 * reported as open — its end is where reading has got to, not a boundary, and
 * calling it one would be the reader asserting a structure the material has
 * not yet supplied.
 */
export const soFar = (r) => {
  if (isGap(r)) return r;
  const lastAnanda = r.g ? tendVoid(r.g).ananda : null;
  return {
    read: r.material.length,
    regions: [...r.regions],
    open: {
      start: r.regionStart,
      readTo: r.material.length,
      tended: r.tended,
      anandaOpen: r.anandaAtOpen,
      anandaNow: lastAnanda,
      opened: lastAnanda != null && r.anandaAtOpen != null ? lastAnanda > r.anandaAtOpen : null,
    },
    events: [...r.events],
    clearings: r.events.filter((e) => e.op === "DEF").length,
  };
};

/** The material has run out. Only now does the last region get an end. */
export const close = (r) => {
  if (isGap(r)) return r;
  if (r.closed) return r.result;

  const last = r.g ?? buildAt(r, r.regionStart, r.material.length);
  const lastAnanda = last ? tendVoid(last).ananda : null;
  const regions = [
    ...r.regions,
    {
      start: r.regionStart, end: r.material.length, tended: r.tended,
      anandaOpen: r.anandaAtOpen, anandaClose: lastAnanda,
      opened: lastAnanda != null && r.anandaAtOpen != null ? lastAnanda > r.anandaAtOpen : null,
      clearedBy: null, // ended by the material running out, not by a failure
    },
  ];

  const adjacency = tendField(r.units);
  const defs = r.events.filter((e) => e.op === "DEF");
  r.closed = true;
  r.result = {
    grain: "Ground",
    consumption: r.consumption,
    window: r.spec.window,
    clearOn: r.spec.clearOn,
    field: { units: r.units.length, coverage: cultivateField(r.units, r.material.length), adjacencyOf: (i) => adjacency.get(i) ?? [] },
    regions,
    events: r.events,
    clearings: defs.length,
    clearingsBy: {
      surfeit: defs.filter((e) => e.mode === "surfeit").length,
      moved: defs.filter((e) => e.mode === "moved").length,
    },
    driftGaps: Object.fromEntries(r.driftGaps),
    rezeros: r.events.filter((e) => e.op === "REC").length,
    tendings: r.events.filter((e) => e.op === "EVA").length,
  };
  return r.result;
};

/** The whole thing at once, for a caller who has the whole thing at once. */
export const read = (material, opts) => {
  const r = openReading(opts);
  if (isGap(r)) return r;
  const a = admit(r, material);
  if (isGap(a)) return a;
  return close(r);
};

// Re-exported so the field operators have one home and callers do not reach
// past this module into turn.js for them.
export { clearField, tendField, cultivateField, clearVoid, tendVoid, cultivateVoid } from "./operators.js";
