// eoreader6 · generation/belief — a LAYERED belief, and every layer names its
// giver.
//
// This is the organ `emergence/surprise.js` has been half of since it was
// written. `priorContinuationNull` already samples continuations out of the
// reader's own belief — it builds the distribution, draws from it, and then
// throws the draw away and keeps the KL. Everything needed to *finish a
// sentence* was already there and was being discarded one line before it
// became an answer. This file keeps the draw.
//
// No model is trained here and none is downloaded. A belief is counts over
// forms the reader has actually met, decayed by how long ago it met them,
// interpolated across context lengths. That is all "guessing what comes next"
// has to be, and it is the same act `nul` performs everywhere else: carry
// forward a nothing that already says what would NOT surprise you, and read
// the next arrival against it. `loops/surf` states the anticipation clause in
// as many words; this is the first module that spends it forward instead of
// only checking it backward.
//
// ── THE PART THAT IS NOT ABOUT PREDICTION ──────────────────────────────────
//
// A belief may be fed by more than one text. Priors from other material make
// a reader better at continuing THIS one — that is the whole reason a person
// who has read widely finishes a sentence more often. But SEED.md #1 is not
// negotiable about what that costs:
//
//   "The first ground is received, never derived. A prior is a gift and must
//    name its giver."
//
// So a layer is `read` or `received`, a `received` layer cannot be constructed
// without a giver, and no distribution leaves this module without saying how
// much of its mass came from where. Content drawn from a foreign prior is
// legitimate fuel for a guess and is NEVER admissible as evidence about the
// material being read. Confabulation — SEED.md's first death — is precisely
// what it would be to let Dracula's word frequencies testify about
// Frankenstein because they were fluent enough to pass.
//
// THE GIFT FILLS THE SILENCE, IT NEVER OVERWRITES THE GROUND. Received layers
// enter only as backoff, weighted by how little evidence the read layer has
// for this context:
//
//   p(f | ctx) = λ · p_read(f | ctx) + (1 − λ) · p_received(f | ctx)
//   λ = c_read(ctx) / (c_read(ctx) + alpha)                    (Witten-Bell)
//
// λ is derived from the read material's own evidence, never chosen. Where the
// reader has met this context often, the gift is inaudible; where it has met
// it never, the gift is all there is. And because λ rises as the read material
// accumulates, a large foreign corpus cannot drown a small local one by being
// large — which is the failure mode a mixture weighted by corpus size would
// have had, and the reason it is not weighted that way.
//
// ── RELEVANCE IS MEASURED, NOT ASSIGNED ────────────────────────────────────
//
// That leaves the question of how the gifts divide the share they collectively
// earn. The first cut of this file split it by each gift's own evidence for
// the context, which is wrong in a way worth naming: it makes a book audible
// for KNOWING THIS CONTEXT rather than for BEING RELEVANT TO THIS TEXT. Moby
// Dick knows "of the" extremely well. That is not a qualification.
//
// So each received layer carries an earned weight, updated causally against
// the only evidence that bears on the question — how well it has been placing
// mass on what actually came next IN THIS MATERIAL:
//
//   log w_l  ←  rho · log w_l  +  log p_l(observed | context)
//   share_l  =  softmax(log w_l)
//
// This is a discounted Bayesian mixture-of-experts update, so nothing is
// chosen: a gift that keeps anticipating this text correctly compounds, and
// one that does not decays exponentially without anyone deciding it should.
// `rho` is the forgetting rate — declared, never defaulted, for the same
// reason gamma is: a prior that was relevant for one chapter and not the next
// must be able to lose the standing it earned, or relevance becomes a verdict
// passed once at the start of the book.
//
// AND RELEVANCE NEEDS A NOISE FLOOR, or "this gift earned 0.31 of the share"
// is a number with nothing underneath it. SEED.md #4: a statistic must be
// sensitive to what its perturbation destroys. A gift's relevance is only a
// finding if it beats a gift whose ORDER has been destroyed and whose
// vocabulary has not — see `shuffledGift` in ./candidates.js, and
// `relevanceReport` below, which puts the real gifts and the noise floor in
// one table so the comparison cannot be skipped.
//
// GROUNDEDNESS IS BINARY AND CARRIES NO CONSTANT. A form is grounded in this
// material iff the read layer had any evidence for it in this context at any
// order. Not "mostly read" — there is no threshold here to pick, because a
// threshold is exactly the hand-set constant `baselines.js` and `nul` both
// refuse. Attribution mass is reported alongside as a continuous quantity, for
// reading, never as a gate.
//
// Pure: no clock, no randomness, no I/O, no ambient state.

import { gap, isGap } from "../../../nul/index.js";

/** A form the belief has never met, reserved so smoothing mass has somewhere to go. */
export const UNSEEN = "\u0000UNSEEN";

export const TIERS = Object.freeze(["read", "received"]);

/**
 * The separator inside a context key.
 *
 * Named and escaped rather than written inline, because it began life as an
 * invisible literal control character and the second place that built a key
 * spelled it as the empty string instead. The two agreed for single-form
 * contexts and disagreed for every longer one, so order-2-and-deeper lookups
 * missed silently and fell back to a shorter context — which is
 * indistinguishable, from the outside, from a belief that is merely weak.
 * Caught by the fast-path identity test in conformance, not by reading.
 *
 * It must be a character no tokenizer emits, or `the cat` and `thecat` would
 * be the same context.
 */
const CTX_SEP = "\u0001";

const ctxKey = (tokens, from, order) => (order === 0 ? "" : tokens.slice(from - order, from).join(CTX_SEP));

/**
 * One layer of belief: counts over forms at every context order 0..order,
 * decayed by recency.
 *
 * Decay is applied LAZILY — each cell records the observation index at which
 * it was last touched and is discounted by gamma^(now − then) on read. The
 * alternative, multiplying every count on every observation, is O(vocabulary)
 * per token and makes a book-length read quadratic. The arithmetic is
 * identical; only the schedule differs.
 *
 * `gamma` is the reader's fading, and it is declared for the same reason
 * `draws`, `reseeds` and `window` are declared in SEED.md: it sets the
 * resolution of something (here, of memory), and a resolution that arrives as
 * a default makes two runs incomparable while looking like it made them
 * comparable. gamma = 1 is a corpus statistic; gamma < 1 is a reader.
 */
export const createLayer = ({ id, tier, giver = null, order, gamma, alpha }) => {
  if (typeof id !== "string" || !id) throw new TypeError("belief: a layer must have an id");
  if (!TIERS.includes(tier)) throw new TypeError(`belief: unknown tier ${tier}`);
  if (tier === "received" && (typeof giver !== "string" || !giver))
    throw new TypeError("belief: a received layer must name its giver — a prior is a gift (SEED.md #1)");
  if (!Number.isInteger(order) || order < 0)
    throw new TypeError("belief: order is the reach of the context and is declared, never defaulted");
  if (!Number.isFinite(gamma) || gamma <= 0 || gamma > 1)
    throw new TypeError("belief: gamma is the reader's fading, declared in (0,1], never defaulted");
  if (!Number.isFinite(alpha) || alpha <= 0)
    throw new TypeError("belief: alpha is the smoothing reserve, declared and positive, never defaulted");

  // tables[j] : contextKey -> { succ: Map<form, cell>, total: cell }
  const tables = Array.from({ length: order + 1 }, () => new Map());
  const vocabulary = new Set();
  let t = 0;

  const cellValue = (cell) => (cell ? cell.v * Math.pow(gamma, t - cell.t) : 0);

  const bump = (cell) => {
    if (!cell) return { v: 1, t };
    cell.v = cell.v * Math.pow(gamma, t - cell.t) + 1;
    cell.t = t;
    return cell;
  };

  const observeAt = (tokens, i) => {
    const form = tokens[i];
    vocabulary.add(form);
    for (let j = 0; j <= order; j++) {
      if (i - j < 0) break;
      const key = ctxKey(tokens, i, j);
      let entry = tables[j].get(key);
      if (!entry) {
        entry = { succ: new Map(), total: null };
        tables[j].set(key, entry);
      }
      entry.succ.set(form, bump(entry.succ.get(form)));
      entry.total = bump(entry.total);
    }
    t++;
  };

  /**
   * Successor distribution at the deepest context this layer has evidence for,
   * interpolated down through shorter contexts. Returns a Map form -> mass
   * summing to at most 1; the residue is this layer's unseen reserve, returned
   * separately so a caller can place it rather than discover it missing.
   */
  const successors = (context) => {
    const out = new Map();
    let remaining = 1;
    for (let j = Math.min(order, context.length); j >= 0; j--) {
      const key = j === 0 ? "" : context.slice(context.length - j).join(CTX_SEP);
      const entry = tables[j].get(key);
      if (!entry) continue;
      const total = cellValue(entry.total);
      if (!(total > 0)) continue;
      // Witten-Bell: how much of this order's mass it has earned the right to
      // keep, derived from its own evidence rather than assigned.
      const lambda = total / (total + alpha);
      const share = remaining * lambda;
      for (const [form, cell] of entry.succ) {
        const p = cellValue(cell) / total;
        if (p > 0) out.set(form, (out.get(form) ?? 0) + share * p);
      }
      remaining -= share;
      if (remaining <= 0) break;
    }
    return { successors: out, reserve: Math.max(0, remaining) };
  };

  return {
    id,
    tier,
    giver,
    order,
    gamma,
    alpha,
    /** Feed the layer a whole token array. Contexts never straddle the call boundary. */
    train(tokens) {
      for (let i = 0; i < tokens.length; i++) observeAt(tokens, i);
      return this;
    },
    /** Feed one more token, with the context it arrived in. */
    observe(tokens, i) {
      observeAt(tokens, i);
      return this;
    },
    /** Forget everything. A new ambient ground begins here — REC · Cultivating. */
    reset() {
      for (const table of tables) table.clear();
      vocabulary.clear();
      t = 0;
      return this;
    },
    successors,
    /**
     * The mass this layer puts on ONE form, without materialising the whole
     * distribution.
     *
     * Algebraically identical to reading `successors(context).get(form)` — the
     * same interpolation, the same Witten-Bell shares — but O(order) lookups
     * instead of O(vocabulary) iterations. That difference is not a
     * micro-optimisation: `candidates.js` needs a causal surprisal for EVERY
     * token it consumes in order to feed atmosphere, and doing that through
     * the full distribution made a book-length read quadratic in vocabulary
     * (measured: ~1.3e9 map iterations on Frankenstein, before this existed).
     */
    massOf(context, form) {
      let mass = 0;
      let remaining = 1;
      for (let j = Math.min(order, context.length); j >= 0; j--) {
        const key = j === 0 ? "" : context.slice(context.length - j).join(CTX_SEP);
        const entry = tables[j].get(key);
        if (!entry) continue;
        const total = cellValue(entry.total);
        if (!(total > 0)) continue;
        const lambda = total / (total + alpha);
        const share = remaining * lambda;
        const cell = entry.succ.get(form);
        if (cell) mass += (share * cellValue(cell)) / total;
        remaining -= share;
        if (remaining <= 0) break;
      }
      // The leftover is this layer's unseen reserve, returned alongside so a
      // caller scoring a form the layer never met can price it the same way
      // `distribution` would, instead of taking the zero-probability floor.
      return { mass, reserve: Math.max(0, remaining) };
    },
    /** Evidence this layer holds for `context` at its deepest matching order. */
    evidence(context) {
      for (let j = Math.min(order, context.length); j >= 0; j--) {
        const key = j === 0 ? "" : context.slice(context.length - j).join(CTX_SEP);
        const entry = tables[j].get(key);
        if (entry) {
          const total = cellValue(entry.total);
          if (total > 0) return total;
        }
      }
      return 0;
    },
    get vocabularySize() {
      return vocabulary.size;
    },
    get observations() {
      return t;
    },
  };
};

/**
 * A belief over one read layer and any number of received ones.
 *
 * Exactly one `read` layer is required. Not zero — a belief with no read layer
 * is a belief about nothing in particular, and everything it emitted would be
 * ungrounded by construction, which is a system that can only confabulate. Not
 * two — "the material being read" is one thing, and two of them would make
 * groundedness ambiguous at precisely the moment it is load-bearing.
 */
export const createBelief = ({ layers, rho }) => {
  if (!Array.isArray(layers) || layers.length === 0) throw new TypeError("belief: at least one layer is required");
  const read = layers.filter((l) => l.tier === "read");
  if (read.length !== 1)
    throw new TypeError(`belief: exactly one read layer is required, got ${read.length}`);
  const received = layers.filter((l) => l.tier === "received");
  const readLayer = read[0];

  // The forgetting rate of relevance. Required exactly when there is more than
  // one gift to choose between — with none, or one, there is no share to
  // divide and demanding the number would be ceremony.
  if (received.length > 1 && (!Number.isFinite(rho) || rho <= 0 || rho > 1))
    throw new TypeError(
      "belief: rho is the forgetting rate of relevance, declared in (0,1], never defaulted — without it a prior's standing is a verdict passed once at the start of the book",
    );

  // log w_l, one per received layer, all equal at the start: before this
  // reader has met any of this material, no gift has earned anything and
  // pretending otherwise would be a prior on the priors that nobody declared.
  const logW = new Map(received.map((l) => [l.id, 0]));
  const relevanceObservations = { n: 0 };

  /** softmax over the earned log-weights, in the order of `received`. */
  const shares = () => {
    if (received.length === 0) return [];
    if (received.length === 1) return [1];
    let max = -Infinity;
    for (const l of received) max = Math.max(max, logW.get(l.id));
    const raw = received.map((l) => Math.exp(logW.get(l.id) - max));
    const total = raw.reduce((a, b) => a + b, 0);
    return total > 0 ? raw.map((r) => r / total) : received.map(() => 1 / received.length);
  };

  /**
   * Update every gift's standing against a form that has actually arrived.
   *
   * Causal by construction: the caller passes the context the form arrived in
   * and the form itself, and it is only ever called for material already read.
   * A gift that placed no mass at all is priced at its own unseen reserve
   * rather than at zero, so "I did not know" costs less than "I was confident
   * and wrong" — which is the ordering a proper score gives and the one that
   * stops a narrow gift from being annihilated for being narrow.
   */
  const witnessForm = (context, form) => {
    if (received.length === 0) return;
    const ctx = Array.isArray(context) ? context : [];
    for (const layer of received) {
      const { mass, reserve } = layer.massOf(ctx, form);
      const p = mass > 0 ? mass : reserve;
      const ll = p > 0 ? Math.log(p) : Math.log(Number.MIN_VALUE);
      logW.set(layer.id, (received.length > 1 ? rho : 1) * logW.get(layer.id) + ll);
    }
    relevanceObservations.n++;
  };

  /**
   * The conditional distribution over what comes next.
   *
   * Returns a frozen categorical plus the two things nothing downstream is
   * allowed to have to guess at: `attribution` (how much mass came from each
   * layer) and `grounded` (the set of forms the read layer itself supplied).
   */
  const distribution = (context) => {
    const ctx = Array.isArray(context) ? context : [];
    const readOut = readLayer.successors(ctx);
    const readEvidence = readLayer.evidence(ctx);

    // λ: the read material's earned share. Derived from its own evidence, on
    // the same Witten-Bell footing used inside a layer, so the gift's audibility
    // falls as the reader accumulates its own encounters with this context.
    const lambda = readEvidence / (readEvidence + readLayer.alpha);

    const probs = Object.create(null);
    const attribution = Object.create(null);
    const grounded = new Set();

    let readMass = 0;
    for (const [form, p] of readOut.successors) {
      const m = lambda * p;
      if (m <= 0) continue;
      probs[form] = (probs[form] ?? 0) + m;
      grounded.add(form);
      readMass += m;
    }
    attribution[readLayer.id] = readMass;

    // Received layers split what the read layer did not earn, in proportion to
    // their own evidence for this context. Peers among themselves; strictly
    // subordinate to the read layer.
    const giftShare = 1 - lambda;
    if (giftShare > 0 && received.length > 0) {
      // Earned relevance, not context evidence. See the header: splitting by
      // evidence made a gift audible for knowing the context rather than for
      // being relevant to this text.
      const earned = shares();
      received.forEach((layer, k) => {
        const share = giftShare * earned[k];
        const out = layer.successors(ctx);
        let mass = 0;
        for (const [form, p] of out.successors) {
          const m = share * p;
          if (m <= 0) continue;
          probs[form] = (probs[form] ?? 0) + m;
          mass += m;
        }
        attribution[layer.id] = (attribution[layer.id] ?? 0) + mass;
      });
    }

    // Whatever no layer placed is the reserve: the mass of "a form I have never
    // met." It is named rather than normalised away, because a distribution
    // that silently renormalises has claimed it can place anything, which is a
    // zero-width null in probabilistic clothing (SEED.md #3).
    let placed = 0;
    for (const key in probs) placed += probs[key];
    const reserve = Math.max(0, 1 - placed);
    if (reserve > 0) probs[UNSEEN] = reserve;

    if (!(placed > 0) && !(reserve > 0))
      return gap("degenerate_ground", { reason: "belief placed no mass anywhere", context: ctx.length });

    return Object.freeze({
      kind: "categorical",
      probs: Object.freeze(probs),
      // True by construction, and pinned by conformance rather than trusted:
      // every layer's backoff runs down to order 0, whose context is the empty
      // string and whose successor table therefore holds every form that layer
      // has ever met. Witten-Bell's lambda is strictly below 1 at every order
      // because alpha is strictly positive, so `remaining` never reaches zero
      // early and order 0 is always reached. Hence: met implies placed.
      covers_vocabulary: true,
      attribution: Object.freeze(attribution),
      grounded: Object.freeze([...grounded]),
      read_mass: readMass,
      received_mass: Math.max(0, placed - readMass),
      unseen_mass: reserve,
      lambda_read: lambda,
    });
  };

  /**
   * Draw the form at cumulative position `u` ∈ [0,1) of the distribution.
   *
   * The caller supplies the uniform rather than a seed, so this module stays
   * free of randomness and the PRNG lives at exactly one place upstream
   * (./emit.js), declared. The UNSEEN reserve is excluded from the draw and
   * its mass redistributed proportionally — the reserve is a statement that
   * some form was never met, and there is no such word to say.
   */
  const draw = (context, u) => {
    const d = distribution(context);
    if (isGap(d)) return d;
    let total = 0;
    for (const form in d.probs) if (form !== UNSEEN) total += d.probs[form];
    if (!(total > 0)) return gap("no_ground", { reason: "every form this belief could place was the unseen reserve" });
    let acc = 0;
    const threshold = u * total;
    let chosen = null;
    for (const form in d.probs) {
      if (form === UNSEEN) continue;
      acc += d.probs[form];
      if (acc >= threshold) {
        chosen = form;
        break;
      }
    }
    if (chosen === null) return gap("no_ground", { reason: "the draw fell off the end of the distribution" });
    return Object.freeze({
      form: chosen,
      p: d.probs[chosen] / total,
      grounded: d.grounded.includes(chosen),
      attribution: d.attribution,
      lambda_read: d.lambda_read,
    });
  };

  /**
   * The least-surprising continuation: the mode of the distribution.
   *
   * Deterministic. Right for a testimony and for a competency comparison, and
   * WRONG for a demonstration of what a reader expects — greedy argmax on a
   * backoff belief falls into cycles within a few forms, because the most
   * likely successor of the most likely successor is very often the word you
   * just left. That is a real property of the mode and not a defect to tune
   * away; it is why `draw` exists beside it and why the choice between them is
   * declared per emission rather than settled here. Ties break toward the form
   * the READ layer supplied, then lexicographically, so a run is a run.
   */
  const mode = (context) => {
    const d = distribution(context);
    if (isGap(d)) return d;
    let best = null;
    let bestP = -1;
    for (const form in d.probs) {
      if (form === UNSEEN) continue; // never emit the reserve as a word
      const p = d.probs[form];
      const isGrounded = d.grounded.includes(form);
      if (
        p > bestP ||
        (p === bestP &&
          best !== null &&
          (isGrounded !== d.grounded.includes(best) ? isGrounded : form < best))
      ) {
        best = form;
        bestP = p;
      }
    }
    if (best === null)
      return gap("no_ground", { reason: "every form this belief could place was the unseen reserve" });
    return Object.freeze({
      form: best,
      p: bestP,
      grounded: d.grounded.includes(best),
      attribution: d.attribution,
      lambda_read: d.lambda_read,
    });
  };

  /**
   * p(form | context) across the layered belief, without building the
   * distribution. Same mixture as `distribution`, same lambda, same peer
   * weighting among gifts — see `createLayer.massOf` for why this exists.
   * Returns { p, reserve }. `p` is 0 for a form no layer has met, and
   * `reserve` is the mass this belief holds for "a form I have not met" — the
   * same quantity `distribution` parks under UNSEEN, so a caller can price an
   * unmet form exactly as the full distribution would.
   */
  const probabilityOf = (context, form) => {
    const ctx = Array.isArray(context) ? context : [];
    const readEvidence = readLayer.evidence(ctx);
    const lambda = readEvidence / (readEvidence + readLayer.alpha);
    const own = readLayer.massOf(ctx, form);
    let p = lambda * own.mass;
    let reserve = lambda * own.reserve;
    const giftShare = 1 - lambda;
    if (giftShare > 0 && received.length > 0) {
      // Earned relevance, not context evidence. See the header: splitting by
      // evidence made a gift audible for knowing the context rather than for
      // being relevant to this text.
      const earned = shares();
      received.forEach((layer, k) => {
        const share = giftShare * earned[k];
        const out = layer.massOf(ctx, form);
        p += share * out.mass;
        reserve += share * out.reserve;
      });
    } else if (giftShare > 0) {
      reserve += giftShare;
    }
    return { p, reserve };
  };

  /**
   * What each gift has earned, and what a gift would earn by accident.
   *
   * Returned as a table rather than a verdict. A share is only a finding if it
   * beats the noise floor a `shuffled:` control sets, and this puts both in
   * one place so the comparison cannot be skipped by reading only the number
   * you hoped for.
   */
  const relevanceReport = () => {
    const earned = shares();
    const floor = received
      .map((l, k) => ({ l, k }))
      .filter(({ l }) => l.id.startsWith("shuffled:"))
      .reduce((m, { k }) => Math.max(m, earned[k]), 0);
    return Object.freeze({
      observations: relevanceObservations.n,
      rho: received.length > 1 ? rho : null,
      noise_floor: floor > 0 ? floor : null,
      layers: Object.freeze(
        received.map((l, k) =>
          Object.freeze({
            id: l.id,
            giver: l.giver,
            share: earned[k],
            log_weight: logW.get(l.id),
            is_noise_control: l.id.startsWith("shuffled:"),
            // null when no control was supplied — an absent floor is stated,
            // never silently read as "cleared".
            above_noise: floor > 0 ? earned[k] > floor : null,
          }),
        ),
      ),
    });
  };

  return Object.freeze({
    distribution,
    probabilityOf,
    witnessForm,
    relevanceReport,
    mode,
    draw,
    // The longest context any layer can use. Callers pass histories that are
    // book-length; without this they would copy the whole history once per
    // emitted form, which turns a linear read into a quadratic one.
    maxOrder: layers.reduce((m, l) => Math.max(m, l.order), 0),
    readLayer,
    receivedLayers: Object.freeze([...received]),
    layerIds: Object.freeze(layers.map((l) => l.id)),
    /** The givers of every received layer, for the record. SEED.md #1. */
    givers: Object.freeze(received.map((l) => ({ id: l.id, giver: l.giver }))),
  });
};
