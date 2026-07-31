// eoreader6 · emergence/fold — a fold PROJECTS THE UNIVERSE FROM A GIVEN HERE.
//
// Not a summary, not a selection, not a reading of a reading. A here, and the
// whole seen from it. Every position in the material gets placed in the ground
// that this here has grown, and what comes back is a complete universe that is
// nonetheless only ever a view: monadic, perspectival, and total.
//
//   "this strange power it has of anticipating itself and of throwing itself
//    forward, of finding itself at home everywhere."
//
// Finding itself at home EVERYWHERE is the operative clause. From here, the
// far end of the material is not unavailable — it is placed, or it is censored,
// and both are results. There is no position the fold declines to project to
// and no position it pretends to reach.
//
// THE ASYMMETRY IS THE POINT. The ground is grown CAUSALLY, from here's own
// past only, because that is all a here is made of. The projection is TOTAL —
// every position, behind and ahead. So the past is placed in a ground it
// helped build, and the horizon is placed in a ground that never saw it. That
// is not a leak; it is exactly Merleau-Ponty's "other thoughts that I vaguely
// sense in advance, thoughts that I could have but that I have never
// developed," and the two are labelled `past` and `horizon` on every row so
// they can never be silently pooled.
//
// WHAT A CENSORED PROJECTION MEANS, and it is the most useful thing here:
//   beyond   — censored above. This here cannot reach that position. Surfeit,
//              and SEED.md's named trigger to re-zero.
//   beneath  — censored below. More regular than this here can place.
//              Regularity, NOT surfeit, and the two must never be pooled.
//   placed   — a rank. The universe as this here ranks it.
//
// IDENTITY BY CONSEQUENCE, finally spendable. SEED.md: "two figures are the
// same iff they make the same difference to the ground. Never by appearance,
// not even in principle." Two heres are the same here iff they project the
// same universe — which is a comparison of two projections, and `agree()`
// below is it. It reports; it does not rule.
//
// ON THE NAME — `foldSpans` in packages/host/corpus.js is a different act
// (select units under a token budget) and keeps its own name. The stub that
// stood in this file was a placeholder for that act, unwired, and SEED.md's
// growth rule is explicit that unwired is not early, it is refuted. eoreader5
// carried a third fold again (`entity-fold.js`, collapsing surfaces into
// referents), already re-earned here as perceiver/text/surfaces.js. Three
// different acts have worn this word in this lineage. This file is only ever
// the projection.
//
// CELL — `SYN · Network · Composing` (Generate · Structure · Pattern). A whole
// composed from parts that already exist: every position is already there and
// already differs; the fold generates the architecture of how they stand from
// one place. Not the desert cell — SYN at Ground is the empty one, and this is
// SYN at Pattern, which is populated in every language tested.
//
// Pure: no clock, no randomness, no I/O. Read SEED.md first.

import { ground, difference, volume, isGap, gap } from "../../../nul/index.js";

// The cell this organ occupies on the operator grid (engine/operators.js):
// SYN · Network · Composing — a whole composed from parts that already exist
// (header CELL note above). Declared, checked by conformance.
export const CELL = Object.freeze({ op: "SYN", grain: "Pattern" });

/**
 * Where a position stands to a standpoint — and every one of these is DECIDED,
 * not read off the indices.
 *
 *   "'Decided' conditions are never such as to banish freedom. They only
 *    qualify it. There is always a contingency left open for immediate
 *    decision... Some actual entities may be EITHER in the settled past, OR in
 *    the contemporary nexus, OR even left to the undecided future, according
 *    to immediate decision... These alternatives are represented by the
 *    indecision as to the particular quantum of extension to be chosen for the
 *    basis of the novel concrescence."          — Process and Reality IV §I
 *
 * The quantum of extension is exactly what `loops/surf`'s `divide` chooses, and
 * a different mode of division puts the same position in a different relation.
 * So `relation` is reported with the standpoint that decided it, and
 * `alternatives()` below makes the indecision itself countable rather than
 * leaving it as a remark. `contemporary` is not a leftover bucket: it is the
 * undecided nexus, the positions a different quantum would have settled the
 * other way.
 */
export const RELATIONS = Object.freeze(["past", "contemporary", "horizon"]);
export const PLACEMENTS = Object.freeze(["placed", "beyond", "beneath"]);

/**
 * A standpoint is an EXTENSIVE REGION, not a point.
 *
 *   "The quantum is that standpoint in the extensive continuum which is
 *    consonant with the subjective aim... Thus the quantum is an extensive
 *    region. This region is the determinate basis which the concrescence
 *    presupposes."                                — Process and Reality IV §I
 *
 * A wave from `loops/surf`'s `divide` is accepted directly, and that is
 * mereology rather than convenience:
 *
 *   "Each such coordinate division corresponds to a definite sub-region of the
 *    basic region... In so far as the objectification of the actual world from
 *    this restricted standpoint is concerned, there is nothing to distinguish
 *    this coordinate division from an actual entity."      — ibid. §II
 *
 * A part, projected from its own standpoint, is a whole. That is the holon,
 * and it is why a wave needs no conversion to be foldable.
 *
 * A bare index is widened to unit extent — a position is a region of extent
 * one, and refusing it would be pedantry rather than discipline. Anything else
 * is a type error before a measurement is spent (SEED.md #7).
 */
const asRegion = (here) => {
  if (Number.isInteger(here)) return { start: here, end: here + 1 };
  if (here && Number.isInteger(here.start) && Number.isInteger(here.end) && here.end > here.start)
    return { start: here.start, end: here.end };
  // a wave: a coordinate division, indistinguishable from an actual entity
  if (here && Number.isInteger(here.from) && Number.isInteger(here.to) && here.to >= here.from)
    return { start: here.from, end: here.to + 1 };
  return null;
};

/**
 * Project the universe from `here`.
 *
 * `here` is a standpoint in `material`: an index, or a region {start, end}.
 * Its ground is grown over `material[0..here.start]` — its actual world,
 * everything that has settled behind it, which is all a standpoint is made of.
 *
 * Returns { here, ground, projection, reach, ananda } or a gap. `projection`
 * has one row per window-position in the WHOLE material, each labelled `past`,
 * `within` or `horizon`, and placed or censored. Nothing is dropped: a
 * censored row still reports its magnitude, and only its place is missing.
 */
export const fold = ({ material, here, window, draws, seed = 0, perturbation = "shuffle" }) => {
  if (!Array.isArray(material) || material.length === 0) return gap("empty_material", {});
  if (!Number.isInteger(window) || window < 2)
    return gap("undeclared", { what: "window", why: "the reach of the present is never derived from material length" });
  if (!Number.isInteger(draws) || draws < 2)
    return gap("undeclared", { what: "draws", why: "the resolution of testimony is 1/draws and is never a default" });

  const region = asRegion(here);
  if (!region || region.start < 0 || region.start >= material.length)
    return gap("undeclared", { what: "here", why: "a fold is taken from a standpoint and the standpoint is not inferred" });

  // A standpoint with nothing behind it has no ground it could have grown, and
  // the seed is explicit about the honest move: the first ground is RECEIVED,
  // never derived (SEED.md #1 — three independent mechanisms tried to derive an
  // origin and every one collapsed toward the material's own vocabulary at
  // r ≈ 0.974). So this refuses rather than bootstrapping, and names what it
  // would take.
  if (region.start < window + 2)
    return gap("no_ground", {
      reason: "a standpoint with nothing settled behind it cannot grow a ground; the first one must be received, not derived",
      here: region,
      need: window + 2,
    });

  const g = ground({ material: material.slice(0, region.start), draws, window, seed, perturbation });
  if (isGap(g)) return g;

  const projection = [];
  let placed = 0, beyond = 0, beneath = 0;

  for (let at = 0; at + window <= material.length; at++) {
    // Commensurate with the ground's own statistic — a real windowed mean,
    // never a raw single value, for the same reason as everywhere else here.
    let sum = 0;
    for (let j = at; j < at + window; j++) sum += material[j];
    const observed = sum / window;

    const d = difference(observed, g);
    // The actual world of the standpoint, the standpoint's own extent, and
    // what lies ahead of it. Labelled on every row so the causal ground and
    // the non-causal projection can never be silently pooled.
    const relation = at + window <= region.start ? "past" : at >= region.end ? "horizon" : "contemporary";

    if (!isGap(d)) {
      placed++;
      projection.push(Object.freeze({ at, relation, placement: "placed", observed, rank: d.rank }));
    } else if (d.gap === "exceeds_witness") {
      const placement = d.direction === "above" ? "beyond" : "beneath";
      if (placement === "beyond") beyond++; else beneath++;
      projection.push(Object.freeze({ at, relation, placement, observed, censoredAt: d.censoredAt }));
    } else {
      projection.push(Object.freeze({ at, relation, placement: "gap", observed, result: d }));
    }
  }

  return Object.freeze({
    here: Object.freeze(region),
    ground: g,
    projection: Object.freeze(projection),
    /**
     * `beyond` is what this here cannot reach — surfeit, and the seed's named
     * trigger to re-zero. `beneath` is regularity and is counted apart from it
     * on purpose: pooling them is the one confusion this codebase has paid for
     * more than once.
     */
    reach: Object.freeze({ placed, beyond, beneath, total: projection.length }),
    /**
     * The contemporary nexus: positions this quantum of extension left
     * undecided. A different quantum settles them into past or horizon, which
     * is the freedom decided conditions qualify without banishing. Counted, so
     * the indeterminacy is a number rather than a remark.
     */
    undecided: projection.filter((p) => p.relation === "contemporary").length,
    ananda: volume(g),
    spec: Object.freeze({ window, draws, seed, perturbation, of: `n${material.length}` }),
    provenance: Object.freeze({ giver: "emergence/fold", here: Object.freeze(region) }),
  });
};

/**
 * The alternatives left over for immediate decision.
 *
 * Given several folds of the same material — standpoints from different chosen
 * quanta of extension — report, per position, every relation it received. A
 * position that got only one relation across all of them was settled by the
 * material. A position that got more than one is genuinely free: "either in
 * the settled past, or in the contemporary nexus, or even left to the undecided
 * future, according to immediate decision."
 *
 * This is defeasibility made countable. CUBE.md already argues defeasibility is
 * a theorem (Pattern's coordinate is transcendental by Gelfond-Schneider, so no
 * finite sequence of operations reaches it exactly and every claim stays
 * revisable). This is the same fact from the other end: not "the claim could be
 * revised" as a disclaimer, but the specific positions on which the alternatives
 * are still open, enumerated.
 *
 * Refuses folds not built to one spec over one material — SEED.md #5, and the
 * mental pole being incurably one (see `divide`).
 */
export const alternatives = (folds) => {
  if (!Array.isArray(folds) || folds.length < 2)
    return gap("no_ground", { reason: "one standpoint has no alternatives to be free between" });
  for (const f of folds) if (isGap(f)) return f;
  const [first] = folds;
  for (const f of folds) {
    if (f.spec.window !== first.spec.window || f.spec.draws !== first.spec.draws || f.spec.perturbation !== first.spec.perturbation || f.spec.of !== first.spec.of)
      return gap("unknown_spec", { reason: "alternatives across different specs were never alternatives" });
  }

  const byPosition = [];
  let decided = 0;
  let undecided = 0;
  for (let i = 0; i < first.projection.length; i++) {
    const relations = new Set(folds.map((f) => f.projection[i].relation));
    const free = relations.size > 1;
    if (free) undecided++; else decided++;
    byPosition.push(Object.freeze({ at: first.projection[i].at, relations: Object.freeze([...relations]), free }));
  }

  return Object.freeze({
    quanta: Object.freeze(folds.map((f) => f.here)),
    n: byPosition.length,
    decided,
    undecided,
    byPosition: Object.freeze(byPosition),
  });
};

/**
 * What no standpoint in this material can reach.
 *
 * `beyond` from ONE here is that here's own surfeit — an encounter, and the
 * seed's named trigger to re-zero. `beyond` from EVERY here is a different
 * claim entirely: there is no place to stand in this material from which the
 * position is reachable at all. It is not of this world.
 *
 * THE LADDER IS THE SAME ONE `generation/belief.js` ALREADY CLIMBS, one grain
 * over. There, a form attested by one giver is that giver's own and a form
 * attested by all of them is furniture of the shared world. Here, a position
 * beyond from one standpoint is that standpoint's encounter and a position
 * beyond from all of them is not this material's at all. Same act, positions
 * instead of forms, and it was not invented twice — it is #6 spent, plural
 * grounds and their disagreement as the only self-check.
 *
 * WHY UNANIMITY AND NOT A THRESHOLD. A conjunction gets STRICTER as standpoints
 * are added, so adding evidence can only ever remove a verdict, never
 * manufacture one. That is the opposite of the best-of-n hazard `extremeGround`
 * exists for, and it is why no extreme-value correction is owed here and no
 * constant appears below. "More than half the standpoints" would have needed
 * both.
 *
 * MEASURED, 2026-07-31, Heidi (Project Gutenberg 20781), 1376 chunks of 40
 * words, window=8 draws=200, seven standpoints spread over the material:
 *
 *   foreign (beyond from all 7)   13 positions — chunks 0-4 and 1360-1367
 *   edge    (beyond from some)    49 positions — 5-8, 18-31, 1325-1359
 *   reachable                     everything else, including all of 32-1324
 *
 * Chunks 0-4 are "the project gutenberg ebook of heidi ... title heidi author
 * johanna spyri illustrator maria louise kirk translator elisabeth"; 1360-1367
 * are the licence and donation notice. **No marker string was consulted.**
 *
 * The ragged `edge` is a result, not noise. Title page, translator credit and
 * table of contents are genuinely undecidable — different givers cut there
 * differently — and unanimity leaves them undecided rather than guessing.
 *
 * THIS IS NOT A CONTAINER DETECTOR, and the same run says so. Heidi's wrapper
 * is roughly 101 positions (front matter below 32, back matter from 1300);
 * `foreign` + `edge` together reach 62 of them, and the other 39 come back
 * `reachable`. Worse, they come back reachable AT THE TOP OF THE RANKING — of
 * the 60 placed-and-not-foreign positions from a standpoint at chunk 547, 38
 * (63%) are wrapper and only 22 are Heidi.
 *
 * The reason is a real distinction and not a tuning failure: `beyond` exceeds a
 * max-over-windows support, which is a SPIKE test, and a distributor's wrapper
 * is a PLATEAU — sustained mild elevation that places comfortably inside the
 * support and ranks high there. Reach and regime are different questions. This
 * organ answers reach. The wrapper is a regime, and finding it wants `level`,
 * `pattern`, or a changepoint, none of which this is.
 *
 * `perceiver/text/spans.js` still matches the whole wrapper with two regexes
 * that name a publisher and work in one language. That trade is unresolved and
 * is not resolved by fiat here.
 *
 * WHAT THIS DOES NOT ESTABLISH, and the line matters. That a position is
 * foreign is a claim about REACH. That it is a container, a distributor's
 * boilerplate, an epigraph in another language, or a corrupted block is a claim
 * about WHAT IT IS, and Amendment V puts that beyond derivation: function is
 * measurable, denotation is received and must name its giver. This organ says
 * "no here reaches it." It never says whose it is.
 *
 * Refuses folds not built to one spec over one material — #5, same as
 * `alternatives`.
 */
export const foreign = (folds) => {
  if (!Array.isArray(folds) || folds.length < 2)
    return gap("no_ground", { reason: "one standpoint cannot establish that a position is beyond every standpoint" });
  for (const f of folds) if (isGap(f)) return f;
  const [first] = folds;
  for (const f of folds) {
    if (f.spec.window !== first.spec.window || f.spec.draws !== first.spec.draws || f.spec.perturbation !== first.spec.perturbation || f.spec.of !== first.spec.of)
      return gap("unknown_spec", { reason: "reach across different specs was never comparable" });
  }

  const byPosition = [];
  let foreignCount = 0, edge = 0, reachable = 0;
  for (let i = 0; i < first.projection.length; i++) {
    let beyondFrom = 0;
    for (const f of folds) if (f.projection[i].placement === "beyond") beyondFrom++;
    // Three verdicts, one ladder, no constant: none of them, some of them, all
    // of them. `edge` is not a weak `foreign` — it is the undecided nexus for
    // reach, and it is counted apart for the same reason `contemporary` is.
    const verdict = beyondFrom === 0 ? "reachable" : beyondFrom === folds.length ? "foreign" : "edge";
    if (verdict === "foreign") foreignCount++;
    else if (verdict === "edge") edge++;
    else reachable++;
    byPosition.push(Object.freeze({ at: first.projection[i].at, beyondFrom, of: folds.length, verdict }));
  }

  return Object.freeze({
    quanta: Object.freeze(folds.map((f) => f.here)),
    standpoints: folds.length,
    n: byPosition.length,
    foreign: foreignCount,
    edge,
    reachable,
    byPosition: Object.freeze(byPosition),
  });
};

/**
 * How two standpoints stand to each other. Whitehead's trichotomy, and it is
 * exhaustive by construction:
 *
 *   "either A is in the actual world of B, or B is in the actual world of A"
 *   — and if neither, they are CONTEMPORARIES, mutually independent.
 *
 * `loops/turn`'s ⑤ CON · Field · Tending already computes contemporaneity by
 * overlap for reach-units. This is the same relation between standpoints, and
 * it is deliberately the same test rather than a second one.
 */
export const standing = (a, b) => {
  if (a.end <= b.start) return "a-in-actual-world-of-b";
  if (b.end <= a.start) return "b-in-actual-world-of-a";
  return "contemporaries";
};

/**
 * Do two heres project the same universe?
 *
 * SEED.md: "identity by consequence: two figures are the same iff they make
 * the same difference to the ground. Never by appearance, not even in
 * principle." This is that clause, spent. Two folds are compared position by
 * position on how they PLACED the universe — never on where they sit, never on
 * what they look like.
 *
 * Refuses folds that were not built to one spec over one material, because
 * SEED.md #5 says two grounds are comparable only if built to the same spec
 * and a comparison across specs is an artefact of construction dressed as a
 * finding. The seed is unchecked deliberately: two heres reaching the same
 * projection through different samplers is the strongest form of the claim,
 * not a violation of it.
 *
 * Reports. Does not rule — no threshold here decides that two heres ARE one.
 */
export const agree = (a, b) => {
  if (isGap(a) || isGap(b)) return isGap(a) ? a : b;
  if (!a?.projection || !b?.projection) return gap("no_ground", { reason: "agreement needs two projections" });
  if (a.spec.window !== b.spec.window || a.spec.draws !== b.spec.draws || a.spec.perturbation !== b.spec.perturbation || a.spec.of !== b.spec.of)
    return gap("unknown_spec", { reason: "two projections built to different specs were never comparable", a: a.spec, b: b.spec });
  if (a.here.start === b.here.start && a.here.end === b.here.end)
    return gap("no_ground", { reason: "one standpoint cannot differ from itself" });

  let same = 0;
  let split = 0; // one placed it, the other could not — the most informative disagreement available
  for (let i = 0; i < a.projection.length; i++) {
    const [x, y] = [a.projection[i], b.projection[i]];
    if (x.placement === y.placement) same++;
    else if (x.placement === "placed" || y.placement === "placed") split++;
  }

  return Object.freeze({
    heres: Object.freeze([a.here, b.here]),
    /** Whitehead's trichotomy. See `standing`. */
    standing: standing(a.here, b.here),
    n: a.projection.length,
    same,
    /**
     * Censored differences are kept, not dropped (SEED.md #6). One here
     * placing a position while the other calls it surfeit is the most
     * informative signal this system can produce, and it used to be discarded.
     */
    split,
    concord: a.projection.length ? same / a.projection.length : 0,
  });
};
