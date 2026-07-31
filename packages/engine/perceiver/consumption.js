// eoreader6 · perceiver/consumption — HOW THIS MATERIAL IS MEANT TO BE TAKEN IN.
//
// Every perceiver in this directory already answers "what numbers does this
// become." None of them answers the prior question: how is this thing
// CONSUMED? And that question decides almost everything above it.
//
// A novel is meant to be taken in one stretch at a time, forwards, and reading
// ahead is not an optimisation but a different act — you cannot be surprised by
// what you have already seen. A piece of music is the same and stricter: it
// arrives at a rate you do not control. A painting is the opposite; the whole
// field is present at once and there is no "ahead" to read, so a left-to-right
// reader of a painting is not being rigorous, it is being wrong. A table has an
// order in the file and that order usually means nothing at all.
//
// The engine has been ignoring this. `window` — SEED.md's third declared
// number, "the reach of the present: how much of the material is contemporary
// with itself" — was being passed in as a bare 12 by every caller, identically,
// to prose chunks and raw bytes and audio frames. That is the same error the
// cube taught this lineage once already: one number wearing a universal coat
// while quietly meaning something different in each place it lands.
//
// The reach of the present is not the caller's to guess. It is a fact about how
// the content is consumed, so the perceiver declares it, in ITS OWN UNITS, with
// the basis written down.
//
// DERIVED FROM FORM, NEVER FROM LENGTH. SEED.md #5 refuses a window that
// follows the material's extent, because a statistic whose window grows with n
// means a different thing before and after material arrives. That is not what
// happens here. A paragraph is a claim the WRITER made about what is
// contemporary with itself, and it does not get longer because the book is
// long. `stableAcross` in conformance holds this to account: the declared
// present must not drift as more material arrives, or it is the forbidden kind
// after all.

export const ORDERS = Object.freeze({
  // Arrives in sequence, and the sequence is the meaning. Reading ahead is a
  // violation, not a shortcut. Prose, speech, music, video, a conversation.
  sequential: "sequential",
  // The whole field is present at once. There is no earlier and no later, so
  // there is nothing for a causal reader to be causal ABOUT. A still image.
  simultaneous: "simultaneous",
  // Elements have an order in the file and it carries no meaning. Rows of a
  // table, a set of measurements. Shuffling it changes nothing that matters,
  // which is exactly why a shuffle cannot be its null either.
  unordered: "unordered",
});

/**
 * A consumption contract.
 *
 *   order   — one of ORDERS
 *   unit    — what ONE element of the reduced series is, in plain words. Not
 *             decorative: it is the only thing that makes `present` mean
 *             anything, and its absence is how "12" got applied to bytes and
 *             paragraphs alike.
 *   present — the reach of the present, IN THOSE UNITS. SEED.md's `window`.
 *   basis   — why that number and not another. Prose in a comment; the point is
 *             that a contract with no stated basis is a guess with a type.
 *   rate    — for sequential material that arrives at a fixed rate (audio,
 *             video), units per second. null where the consumer sets the pace.
 */
export const contract = ({ order, unit, present, basis, rate = null }) => {
  if (!ORDERS[order]) throw new TypeError(`consumption: no such order "${order}"`);
  if (!unit || typeof unit !== "string") throw new TypeError("consumption: `unit` must say what one element is");
  if (!Number.isInteger(present) || present < 2)
    throw new TypeError("consumption: `present` is the reach of the present in units, and must be at least 2");
  if (!basis || typeof basis !== "string") throw new TypeError("consumption: `basis` must say why this present and not another");
  return Object.freeze({ order, unit, present, basis, rate });
};

/**
 * Whether this material can be READ — taken in progressively, where what comes
 * later was genuinely not available earlier.
 *
 * Refusing here is not fastidiousness. Running a causal reader over
 * simultaneous material manufactures a sequence the content does not have, and
 * every boundary it then finds is an artefact of the scan order — of how the
 * pixels happened to be serialised, which is a fact about the file format and
 * not about the picture.
 */
export const isReadable = (c) => c?.order === ORDERS.sequential;

/**
 * The refusal, as data rather than an exception, so a caller can report it.
 * Type error before null (SEED.md #7): this is caught by the algebra and never
 * costs a measurement.
 */
export const refusalFor = (c) => {
  if (!c) return { gap: "undeclared", what: "consumption", why: "a perceiver that does not say how its material is consumed cannot be read" };
  if (c.order === ORDERS.simultaneous)
    return {
      gap: "unknown_spec",
      why: "this material is present all at once; a left-to-right reading of it would be reading the scan order, not the content",
      order: c.order,
      unit: c.unit,
    };
  if (c.order === ORDERS.unordered)
    return {
      gap: "unknown_spec",
      why: "these elements have a file order that carries no meaning; reading it forwards asserts a sequence the content does not have",
      order: c.order,
      unit: c.unit,
    };
  return null;
};
